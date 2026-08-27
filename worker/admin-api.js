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

     POST /vacation { payload: { coach, start, end } }
       -> { ok: true, queued: true }
       NO CODE. The one open route — see the block comment beside
       VACATION_LIMIT below.

   The page calls /whoami at sign-in so it knows which leagues to
   offer. /submit re-checks everything /whoami checked — the reply
   from the first call is not a credential and is never trusted.

   IT IS ALSO THE MORNING CLOCK
   Nothing to do with the admin page: a cron trigger on this Worker
   fires the daily nudge and the advance-day heads-up. GitHub's own
   cron is best-effort and drains under load — 10:00 AM meant
   anywhere from 10:05 to past noon — so the schedule moved here,
   where it fires within a minute, and GitHub only listens. See the
   scheduled() handler at the bottom.
   ============================================================ */

const DISPATCH_EVENT = "league-update";

/* The morning posts workflow listens for this. Separate event type
   from the admin one so the two can never be confused: this one
   carries no payload and needs no authorisation, because it asks for
   nothing that isn't already public — "run the read-only job you run
   every morning". */
const MORNING_EVENT = "morning-posts";

/* When the morning posts should go out, in the league's own timezone.
   Cron triggers are UTC-only, so two of them are configured (14:00
   and 15:00 UTC) and this is what decides which one is real: exactly
   one of them is 10 AM in New York on any given day, and which one
   changes twice a year on its own. That's the entire reason this
   check exists — the old GitHub cron had a comment telling you to
   edit the hour by hand every November, which is a thing nobody
   remembers to do. */
const POST_HOUR_ET = 10;
const POST_ZONE = "America/New_York";

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

/* ------------------------------------------------------------
   THE ONE OPEN DOOR
   ------------------------------------------------------------
   /vacation takes a submission with NO access code. Everything
   else on this Worker requires one, so this is worth being
   explicit about.

   The vacation page replaces a Google Form that anyone with the
   link could fill in, and the point of moving it here was to make
   the answers readable by the site and the daily nudge — not to
   make 32 people find a code before they can say they're away for
   the weekend. A tracker people can't be bothered to update is
   worse than no tracker.

   What keeps that safe is what the endpoint can and can't do.
   It can only ADD, and only for a name that already appears on one
   of the three rosters — tools/apply.js checks the submitted name
   against the union of every league's COACHES array and rejects
   anything else, so this cannot be used to write arbitrary text
   into a file the site loads. Deleting requires a code and goes
   through /submit like every other admin action.

   The worst outcome is therefore someone claiming a real coach is
   on holiday. That shows on the site within a minute, in the next
   morning's nudge, and any commissioner can undo it. If it ever
   does become a nuisance, the fix is to move the route behind a
   shared league password rather than to give everyone a code.
   ------------------------------------------------------------ */
const VACATION_LIMIT = 4;
const VACATION_WINDOW_MS = 10 * 60_000;

/* A vacation is at most 45 days — matches MAX_DAYS in
   /vacation-core.js, which is the authoritative copy and re-checks
   this on the runner. Duplicated here only to reject an obviously
   silly range without spending an Actions run on it. */
const VACATION_MAX_DAYS = 45;

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

/* The open route gets its own, much tighter budget. The main
   limiter above exists to slow down code guessing; this one exists
   because every accepted submission spends a GitHub Actions run,
   and four holidays in ten minutes is already generous. Same
   per-isolate caveat applies — see the note above. */
const vacationAttempts = new Map();

function vacationRateLimited(ip) {
  const now = Date.now();
  const rec = vacationAttempts.get(ip);

  if (!rec || now > rec.resetAt) {
    vacationAttempts.set(ip, { count: 1, resetAt: now + VACATION_WINDOW_MS });
    if (vacationAttempts.size > 5000) vacationAttempts.clear();
    return false;
  }

  rec.count++;
  return rec.count > VACATION_LIMIT;
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
/* ------------------------------------------------------------
   VACATION SHAPE
   ------------------------------------------------------------
   Format only, as everywhere else here — /vacation-core.js on the
   runner is what actually decides whether a range is acceptable,
   and tools/apply.js is what checks the name against the rosters.
   This exists so a mistyped date doesn't cost an Actions run.

   Dates are plain "YYYY-MM-DD" days and are compared as strings,
   never parsed into a moment in time. See the header of
   /vacation-core.js for why that is the whole timezone story.
   ------------------------------------------------------------ */
function checkVacation(payload) {
  if (!payload || typeof payload !== "object") return "missing payload";

  const op = payload.op === undefined ? "add" : payload.op;
  if (op !== "add" && op !== "remove") return "unknown vacation op";

  const coach = typeof payload.coach === "string" ? payload.coach.trim() : "";
  if (!coach) return "pick your name";
  if (coach.length > 40) return "that name is too long";

  const day = /^\d{4}-\d{2}-\d{2}$/;
  if (!day.test(payload.start || "")) return "start date must be a date";
  if (!day.test(payload.end || "")) return "end date must be a date";
  if (payload.end < payload.start) return "the end date is before the start date";

  const span = Math.round((Date.parse(`${payload.end}T00:00:00Z`) - Date.parse(`${payload.start}T00:00:00Z`)) / 86400000) + 1;
  if (!Number.isFinite(span)) return "those dates don't make sense";
  if (span > VACATION_MAX_DAYS) return `that's ${span} days — talk to a commissioner instead`;

  return null;
}

function checkPayload(payload, who) {
  if (!payload || typeof payload !== "object") return "missing payload";

  const { action, league, week } = payload;

  /* A vacation has no league and no week to check, and a code that
     covers any league may edit it — including removing one, which
     the open route can't do. Answered before the league checks
     below rather than threaded through them. */
  if (action === "vacation") return checkVacation(payload);

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

  /* 0-19: the regular season through the conference championships,
     then Bowl Weeks 1-4.

     Scores are no longer confined to 0-15. A postseason game a coached
     team played lives in that team's schedule rows like any other
     game, so weeks 16-19 have rows to write into; only CPU-vs-CPU
     games stay in postseason-data.js, and no coach submits those. */
  /* "OFFSEASON" is the one non-numeric week, and only an advance may
     carry it: it is the hold after the national championship, so
     there is nothing there to score. Shape only — tools/lib/league.js
     owns the canonical sentinel list and apply.js re-checks against
     it on the runner. */
  const offseason = action === "advance" && week === "OFFSEASON";
  if (!offseason && (!Number.isInteger(week) || week < 0 || week > 19)) {
    return action === "advance" ? "week must be 0-19 or OFFSEASON" : "week must be 0-19";
  }

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

  if (action === "advance") {
    if (payload.confirm !== true) return "advance was not confirmed";

    /* The deadline is a date, not a sentence — the sentence the site
       shows is generated from it downstream. Shape only: this checks
       the two forms the admin page can produce and nothing more,
       because apply.js re-parses it properly with the same code the
       command-line tool uses. Rejecting it here just saves a
       round-trip through Actions for an obviously wrong value.

         2026-08-14T18:00:00-04:00   a day and a time
         2026-08-14                  a day, no time shown */
    if (payload.nextAt !== undefined) {
      if (typeof payload.nextAt !== "string") return "deadline must be a string";
      const at = payload.nextAt.trim();
      const ok =
        at === "" ||
        /^\d{4}-\d{2}-\d{2}$/.test(at) ||
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/.test(at);
      if (!ok) return "deadline isn't a date like 2026-08-14T18:00:00-04:00";
    }
  }

  return null;
}

/* ------------------------------------------------------------
   DISPATCH
   ------------------------------------------------------------ */
async function dispatch(env, payload) {
  return dispatchEvent(env, DISPATCH_EVENT, { payload });
}

/* The one place a repository_dispatch is sent. Both callers — an
   admin submission and the morning cron — go through here so the
   token handling, the User-Agent GitHub insists on, and the "204 or
   it didn't happen" check exist once. */
async function dispatchEvent(env, eventType, clientPayload) {
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
    body: JSON.stringify({ event_type: eventType, client_payload: clientPayload }),
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

    /* THE OPEN ROUTE, handled before identify() is ever called —
       it takes no code, so there is nobody to identify. See the
       block comment beside VACATION_LIMIT for why this one door is
       unlocked and what stops it mattering. */
    if (route === "/vacation") {
      if (vacationRateLimited(ip)) {
        return json({ error: "That's a lot of holidays. Try again in a few minutes." }, 429, cors);
      }

      const problem = checkVacation(body.payload);
      if (problem) return json({ error: problem }, 400, cors);

      /* op is HARDCODED, not taken from the request. An open
         endpoint that could delete would be a different thing
         entirely, and this is the line that makes sure it isn't
         one. `selfService` tells apply.js the same story a second
         time, so the rule survives someone editing this file
         without reading it. */
      const payload = {
        action: "vacation",
        op: "add",
        coach: String(body.payload.coach).trim(),
        start: body.payload.start,
        end: body.payload.end,
        selfService: true,
        actor: `${String(body.payload.coach).trim()} (self-service)`,
      };

      try {
        await dispatch(env, payload);
      } catch (e) {
        console.error("[admin-api] vacation dispatch failed:", e.message);
        return json({ error: "Couldn't reach GitHub. Try again shortly." }, 502, cors);
      }

      return json({ ok: true, queued: true }, 200, cors);
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

  /* ------------------------------------------------------------
     THE MORNING CLOCK
     ------------------------------------------------------------
     Fires the "Morning posts" workflow — the daily nudge and the
     advance-day heads-up — at 10:00 AM Eastern, every day.

     WHY THIS ISN'T GITHUB'S CRON ANY MORE
     Because GitHub's cron is documented as best-effort: the trigger
     goes into a queue that drains under load, and the top of the
     hour is the busiest slot on the whole fleet. In practice the
     10 AM nudge was landing anywhere from 10:05 to after noon, which
     defeats a reminder people are supposed to plan a day around.
     Cloudflare fires this within a minute, so GitHub's only job now
     is to listen for the dispatch and run the tools.

     DAYLIGHT SAVING IS HANDLED HERE, NOT BY A HUMAN
     Cron triggers are UTC-only, so TWO are configured — 14:00 and
     15:00 UTC — and the hour check below discards whichever one
     isn't 10 AM in New York today. In summer that's the 14:00 one,
     in winter the 15:00 one, and the switchover needs nobody to
     remember anything. Configure both in the Cloudflare dashboard:
     Worker → Settings → Triggers → Cron Triggers.

       0 14 * * *
       0 15 * * *

     A FAILURE HERE IS SILENT, so it's worth knowing where to look:
     if the morning posts stop arriving, check the Worker's cron
     triggers and its logs before suspecting the tools. The workflow
     also keeps its manual "Run workflow" button, which is the way to
     post if this ever goes down.

     Nothing is authenticated because nothing is asked for: this
     triggers a read-only job that anyone can already see the output
     of, and it carries no payload to be tampered with.
     ------------------------------------------------------------ */
  async scheduled(event, env, ctx) {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: POST_ZONE,
        hour: "numeric",
        hour12: false,
      }).format(new Date(event.scheduledTime))
    );

    /* The other trigger — the one that's the wrong hour today. It
       exists only so the pair survives the DST changeover, so this
       is the normal path for one of the two every single day, not an
       error worth shouting about. */
    if (hour !== POST_HOUR_ET) {
      console.log(
        `[admin-api] cron "${event.cron}" is ${hour}:00 in ${POST_ZONE}, ` +
          `not ${POST_HOUR_ET}:00 — the other trigger is today's. Nothing dispatched.`
      );
      return;
    }

    /* waitUntil, so the Worker isn't torn down mid-request. Without
       it the fetch can be cancelled before GitHub answers and the
       morning silently produces nothing. */
    ctx.waitUntil(
      dispatchEvent(env, MORNING_EVENT, {})
        .then(() => console.log(`[admin-api] dispatched "${MORNING_EVENT}" for ${POST_HOUR_ET}:00 ET`))
        .catch((e) => console.error("[admin-api] morning dispatch failed:", e.message))
    );
  },
};
