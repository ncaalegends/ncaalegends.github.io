/* ============================================================
   ADMIN API — Cloudflare Worker
   ------------------------------------------------------------
   Why this exists: the admin page is served by GitHub Pages,
   which is static. Committing to the repo needs a token, and a
   token in front-end JavaScript is a token you've published. This
   Worker is the only place the token exists. The page asks it to
   do things; it checks who's asking and passes the request on.

   Deploy instructions live in ADMIN-SETUP.md next to this file.

   WHAT IT DOES NOT DO
   It never edits a data file. It fires a repository_dispatch at
   the "League update" workflow, which runs the real tools on a
   real Node runtime. Keeping the file-editing logic in one place
   is the whole design — see the header of /week-core.js.

   CONTRACT
   --------
     POST /whoami   { code }
       -> { name: "Dave", leagues: ["1star"] }

     POST /submit   { code, payload: { action, league, week, ... } }
       -> { ok: true, queued: true }

   The page calls /whoami at sign-in so it knows which leagues to
   offer. /submit re-checks everything /whoami checked — the reply
   from the first call is not a credential and is never trusted.
   ============================================================ */

const DISPATCH_EVENT = "league-update";

/* Mirrors tools/apply.js, which is the authoritative copy. All three
   leagues can now be both scored and advanced from the web — the web
   advance posts the Discord announcement itself (webhooks reach the
   runner via the DISCORD_CONFIG repo secret), so main no longer has to
   stay local. Two lists are kept so a league can be made scores-only
   again by dropping it from ADVANCE_LEAGUES alone. The union is what a
   code may be granted; the per-action list is what a submission is
   checked against. */
const SCORE_LEAGUES = ["1star", "3star", "main"];
const ADVANCE_LEAGUES = ["1star", "3star", "main"];
const ALLOWED_LEAGUES = [...new Set([...SCORE_LEAGUES, ...ADVANCE_LEAGUES])];

const MIN_CODE_LENGTH = 16;

/* Belt and braces with tools/apply.js, which enforces the same
   ceilings server-side. These are here so an oversized payload is
   rejected at the edge instead of burning an Actions run. */
const MAX_BODY_BYTES = 16_000;
const MAX_ENTRIES = 40;

/* ------------------------------------------------------------
   TIMING-SAFE COMPARISON
   ------------------------------------------------------------
   Looking a code up as an object key returns as soon as the hash
   misses, and the time that takes varies with the input. That's a
   thin leak, but the fix is cheap: hash both sides and compare the
   digests byte by byte without an early exit, so every wrong code
   costs the same as every other wrong code.
   ------------------------------------------------------------ */
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return new Uint8Array(buf);
}

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* ------------------------------------------------------------
   RATE LIMITING — best effort, deliberately
   ------------------------------------------------------------
   Held in module scope, which means it is per-isolate: Cloudflare
   may run several isolates at once and may recycle them at any
   time, so a determined attacker gets more than LIMIT attempts.

   It is not the real defence and isn't pretending to be. The real
   defence is that access codes are 20+ random characters, which
   is far too much entropy to guess at any rate this would allow.
   What this does buy is protection against a script hammering the
   endpoint, and it costs nothing. If you ever want a hard limit,
   bind a KV namespace and swap the Map for it.
   ------------------------------------------------------------ */
const LIMIT = 12;
const WINDOW_MS = 60_000;
const attempts = new Map(); // ip -> { count, resetAt }

function rateLimited(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);

  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    /* Bound the map so a flood of distinct IPs can't grow it
       without limit inside a long-lived isolate. */
    if (attempts.size > 5000) attempts.clear();
    return false;
  }

  rec.count++;
  return rec.count > LIMIT;
}

/* ------------------------------------------------------------
   CORS
   ------------------------------------------------------------ */
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const ok = allowed.length === 0 || allowed.includes(origin);

  return {
    "Access-Control-Allow-Origin": ok && origin ? origin : allowed[0] || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

/* ------------------------------------------------------------
   ACCESS CODES
   ------------------------------------------------------------
   ACCESS_CODES is a secret holding JSON:

     {
       "long-random-string": { "name": "Dave",  "leagues": ["1star"] },
       "another-long-one":   { "name": "Marcus","leagues": ["3star"] }
     }

   One entry per person, not per league — that's what makes the
   commit history say who did what, and what lets you revoke one
   person without disrupting anyone else.
   ------------------------------------------------------------ */
function loadCodes(env) {
  if (!env.ACCESS_CODES) throw new Error("ACCESS_CODES is not configured");

  let parsed;
  try {
    parsed = JSON.parse(env.ACCESS_CODES);
  } catch (e) {
    throw new Error("ACCESS_CODES is not valid JSON");
  }

  const out = [];
  for (const [code, info] of Object.entries(parsed)) {
    if (code.length < MIN_CODE_LENGTH) {
      /* Refuse to run rather than quietly accepting a guessable
         code. A short code here undermines the only real defence
         the rate limiter is leaning on. */
      throw new Error(
        `an access code is shorter than ${MIN_CODE_LENGTH} characters — generate a longer one`
      );
    }
    const leagues = (info.leagues || []).filter((l) => ALLOWED_LEAGUES.includes(l));
    out.push({ code, name: String(info.name || "unknown"), leagues });
  }
  return out;
}

async function identify(env, submitted) {
  if (typeof submitted !== "string" || !submitted) return null;

  const codes = loadCodes(env);
  const given = await sha256(submitted);

  let match = null;
  for (const entry of codes) {
    const known = await sha256(entry.code);
    /* No break — checking every entry keeps the cost independent
       of which code was given, and of whether one matched at all. */
    if (equalBytes(given, known)) match = entry;
  }
  return match;
}

/* ------------------------------------------------------------
   PAYLOAD CHECKS
   ------------------------------------------------------------
   Shape only. apply.js does the authoritative validation against
   the actual schedule; this is the cheap pass that avoids
   dispatching something obviously wrong.
   ------------------------------------------------------------ */
function checkPayload(payload, who) {
  if (!payload || typeof payload !== "object") return "missing payload";

  const { action, league, week } = payload;

  if (action !== "scores" && action !== "advance") return "unknown action";
  if (!ALLOWED_LEAGUES.includes(league)) return "unknown league";

  /* Which leagues this action may touch — the same split apply.js
     enforces. Today all three appear in both lists; the guard stays
     general so a future scores-only league is still rejected here. */
  const permitted = action === "advance" ? ADVANCE_LEAGUES : SCORE_LEAGUES;
  if (!permitted.includes(league)) {
    return action === "advance"
      ? `${league} can't be advanced from the web`
      : `${league} can't be updated this way`;
  }

  /* The authorisation decision. Everything else here is a format
     check; this is the line that stops a 1-star commissioner
     editing the 3-star dynasty. */
  if (!who.leagues.includes(league)) return `your code doesn't cover ${league}`;

  if (!Number.isInteger(week) || week < 0 || week > 15) return "week must be 0-15";

  if (action === "scores") {
    if (!Array.isArray(payload.entries) || !payload.entries.length) return "no scores submitted";
    if (payload.entries.length > MAX_ENTRIES) return "too many scores in one submission";
    for (const e of payload.entries) {
      if (!e || typeof e.team !== "string" || typeof e.score !== "string") {
        return "a score entry is malformed";
      }
      if (!/^\d{1,3}\s*[-:\s]\s*\d{1,3}$/.test(e.score)) {
        return `"${e.score}" isn't a score like 27-24`;
      }
      /* Optional force-sim / forfeit marker. Shape only — apply.js
         re-validates it against the real schedule. */
      if (e.sim !== undefined && typeof e.sim !== "boolean") {
        return "a score entry's sim flag must be true or false";
      }
    }
  }

  if (action === "advance" && payload.confirm !== true) {
    return "advance was not confirmed";
  }

  return null;
}

/* ------------------------------------------------------------
   DISPATCH
   ------------------------------------------------------------ */
async function dispatch(env, payload) {
  const repo = env.GITHUB_REPO;
  if (!repo) throw new Error("GITHUB_REPO is not configured");
  if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is not configured");

  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      /* GitHub rejects API calls with no User-Agent. */
      "User-Agent": "ncaa-legends-admin",
      "Content-Type": "application/json",
    },
    /* Single top-level property, so the 10-property cap on
       client_payload can never be reached. See the note in
       .github/workflows/league-update.yml. */
    body: JSON.stringify({ event_type: DISPATCH_EVENT, client_payload: { payload } }),
  });

  if (res.status !== 204) {
    const text = await res.text();
    throw new Error(`GitHub dispatch failed: ${res.status} ${text.slice(0, 200)}`);
  }
}

/* ------------------------------------------------------------
   HANDLER
   ------------------------------------------------------------ */
export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);

    const url = new URL(request.url);
    const route = url.pathname.replace(/\/+$/, "") || "/";

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimited(ip)) {
      return json({ error: "Too many attempts. Wait a minute and try again." }, 429, cors);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "Request too large" }, 413, cors);

    let body;
    try {
      body = JSON.parse(raw);
    } catch (e) {
      return json({ error: "Malformed request" }, 400, cors);
    }

    let who;
    try {
      who = await identify(env, body.code);
    } catch (e) {
      /* A configuration problem, not a caller problem. Say so
         plainly in the log; say nothing useful to the caller. */
      console.error("[admin-api] config error:", e.message);
      return json({ error: "Server is misconfigured. Tell RekenCrew." }, 500, cors);
    }

    if (!who) {
      /* Deliberately vague, and deliberately the same response for
         "no such code" and "code with no leagues". */
      return json({ error: "That code wasn't recognised." }, 401, cors);
    }

    if (!who.leagues.length) {
      return json({ error: "That code isn't set up for any league yet." }, 403, cors);
    }

    if (route === "/whoami") {
      return json({ name: who.name, leagues: who.leagues }, 200, cors);
    }

    if (route === "/submit") {
      const problem = checkPayload(body.payload, who);
      if (problem) return json({ error: problem }, 400, cors);

      /* The actor is taken from the code, never from the request
         body. Otherwise the audit trail is just whatever the
         caller felt like typing. */
      const payload = { ...body.payload, actor: who.name };

      try {
        await dispatch(env, payload);
      } catch (e) {
        console.error("[admin-api] dispatch failed:", e.message);
        return json({ error: "Couldn't reach GitHub. Try again shortly." }, 502, cors);
      }

      return json({ ok: true, queued: true, actor: who.name }, 200, cors);
    }

    return json({ error: "Not found" }, 404, cors);
  },
};
