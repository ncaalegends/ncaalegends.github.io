/* ============================================================
   TWITCH LIVE STATUS — Cloudflare Worker
   ------------------------------------------------------------
   Why this exists: Twitch's Helix API needs a client secret, and
   the site is static GitHub Pages, so there is nowhere on the
   front end to keep one. This Worker is the only thing that ever
   sees the secret. The site calls it and gets back a plain list
   of which channels are live.

   Deploy instructions live in README.md next to this file.

   CONTRACT
   --------
     GET /?logins=alexgators1,kyrvach,blubusbandit
     ->  { "live": ["kyrvach"], "checked": 3, "ts": 1753142400 }

   The site sends the logins it cares about rather than the Worker
   holding a hardcoded roster. That means adding a coach to
   league-data.js is the *only* step — no redeploy here.
   ============================================================ */

const HELIX = "https://api.twitch.tv/helix/streams";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";

/* Twitch logins are 4-25 chars of [a-z0-9_]. We accept from 3 to be
   forgiving of legacy names. Anything else is dropped rather than
   forwarded — this is the boundary where untrusted query input
   stops. */
const LOGIN_RE = /^[a-z0-9_]{3,25}$/;

const MAX_LOGINS = 100;   // Helix's own per-request ceiling
const CACHE_SECONDS = 60; // how stale a "LIVE" badge may be

/* App access token, cached in module scope. Cloudflare may recycle
   the isolate at any time, which just means we mint a new token —
   harmless. Tokens last ~60 days; we refresh at 5 min remaining
   and also recover from a 401 below. */
let tokenCache = { value: "", expiresAt: 0 };

async function getToken(env, { force = false } = {}) {
  const now = Date.now();
  if (!force && tokenCache.value && now < tokenCache.expiresAt - 300_000) {
    return tokenCache.value;
  }

  const body = new URLSearchParams({
    client_id: env.TWITCH_CLIENT_ID,
    client_secret: env.TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const res = await fetch(TOKEN_URL, { method: "POST", body });
  if (!res.ok) throw new Error(`token ${res.status}`);

  const json = await res.json();
  tokenCache = {
    value: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  };
  return tokenCache.value;
}

async function queryHelix(logins, env, token) {
  const qs = logins.map((l) => `user_login=${encodeURIComponent(l)}`).join("&");
  return fetch(`${HELIX}?${qs}`, {
    headers: {
      "Client-ID": env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    },
  });
}

/* Which of the requested logins are live right now. Helix only
   returns channels that ARE live, so absence from the response is
   the offline signal — there is no "offline" record to read. */
async function fetchLive(logins, env) {
  let token = await getToken(env);
  let res = await queryHelix(logins, env, token);

  // Token revoked or expired early — mint a fresh one, try once more.
  if (res.status === 401) {
    token = await getToken(env, { force: true });
    res = await queryHelix(logins, env, token);
  }

  if (!res.ok) throw new Error(`helix ${res.status}`);

  const json = await res.json();
  return (json.data ?? [])
    .filter((s) => s.type === "live")
    .map((s) => String(s.user_login).toLowerCase());
}

function corsHeaders(request, env) {
  /* ALLOWED_ORIGINS is a comma-separated list. Unset means allow
     any origin, which is fine for data this public but worth
     setting anyway so the Worker isn't free API quota for others. */
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const origin = request.headers.get("Origin") ?? "";
  const ok = allowed.length === 0 || allowed.includes(origin);

  return {
    "Access-Control-Allow-Origin": ok ? (origin || "*") : "null",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    Vary: "Origin",
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
      ...headers,
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "GET") {
      return json({ error: "method not allowed" }, 405, cors);
    }

    const url = new URL(request.url);

    /* Sorted + deduped so that the same set of coaches produces the
       same cache key regardless of what order the roster happened
       to be in. Without the sort, every league page would miss the
       cache and burn a Helix call. */
    const logins = [
      ...new Set(
        (url.searchParams.get("logins") ?? "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter((s) => LOGIN_RE.test(s))
      ),
    ]
      .sort()
      .slice(0, MAX_LOGINS);

    if (logins.length === 0) {
      return json({ live: [], checked: 0, ts: Date.now() / 1000 | 0 }, 200, cors);
    }

    // Edge cache, keyed on the normalised login set.
    const cacheKey = new Request(
      `${url.origin}/__live?logins=${logins.join(",")}`,
      { method: "GET" }
    );
    const cache = caches.default;

    const hit = await cache.match(cacheKey);
    if (hit) {
      const body = await hit.json();
      return json(body, 200, { ...cors, "X-Cache": "HIT" });
    }

    try {
      const live = await fetchLive(logins, env);
      const body = { live, checked: logins.length, ts: Date.now() / 1000 | 0 };

      // Store without CORS headers — those are per-origin and must
      // not be baked into a shared cache entry.
      ctx.waitUntil(
        cache.put(
          cacheKey,
          new Response(JSON.stringify(body), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
            },
          })
        )
      );

      return json(body, 200, { ...cors, "X-Cache": "MISS" });
    } catch (err) {
      /* Twitch being down must never take the roster down with it.
         200 + empty list means "nobody shows as live", and the site
         renders exactly as it did before this feature existed. */
      return json(
        { live: [], checked: logins.length, error: String(err.message ?? err), ts: Date.now() / 1000 | 0 },
        200,
        { ...cors, "Cache-Control": "public, max-age=15" }
      );
    }
  },
};
