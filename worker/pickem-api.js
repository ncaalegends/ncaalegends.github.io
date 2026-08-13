/* ============================================================
   PICK'EM API — Cloudflare Worker
   ------------------------------------------------------------
   Why this exists: the pick'em is voted on in Discord and read
   on the site. This Worker is the seam. Discord POSTs a button
   click here; the vote is written to D1 in that same request;
   the site reads D1. Nothing polls, nothing syncs, and there is
   no second source of truth.

   Deploy instructions live in PICKEM-SETUP.md next to this file.

   WHY BUTTONS AND NOT DISCORD'S NATIVE POLL
   A native poll keeps its votes inside Discord, so a season-long
   record backing a prize would sit in a message store we don't
   control until a cron fetched it — one deleted message loses a
   week of picks permanently. A button click arrives here with a
   verified user ID attached and is durable the moment it lands.
   It also lets us hide the running split, which stops anyone
   copying the crowd five minutes before the deadline. The full
   reasoning is in docs/SCOPING-voting-polls.md.

   CONTRACT
   --------
     POST /interactions   Discord only. Ed25519-signed.
       type 1 (PING)              -> { type: 1 }
       type 3 (MESSAGE_COMPONENT) -> ephemeral confirmation

     GET  /health         -> { ok: true, ... }   sanity check

     Admin, from /admin/ on the site. Every one takes { code }
     and re-checks it — the reply from /whoami is not a
     credential and is never trusted.

     POST /whoami         { code } -> { name, pickem }
     POST /polls/list     { code } -> { open, awaiting, settled }
     POST /polls/create   { code, kind, a, b, note, closes_at }
     POST /polls/outcome  { code, poll_id, outcome }
     POST /polls/close    { code, poll_id }   close early

     POST /dev/poll       TEMPORARY. Superseded by /polls/create.
                          Delete once the admin page is live.

   TIMES ARE UNIX SECONDS throughout — see pickem-schema.sql.

   WHY ACCESS_CODES LIVES HERE TOO
   The same JSON is already a secret on ncaa-legends-admin. This
   is a genuine duplicate and the one wart in the setup: adding a
   commissioner means pasting the value into two Workers. It buys
   the thing that matters more — ONE code and ONE sign-in for a
   person who both scores a league and runs the pick'em, which is
   what lets pick'em be a tab on the existing admin page instead
   of a second site with a second password. The alternative,
   having this Worker call the admin Worker's /whoami to validate,
   removes the duplication and adds a network hop plus a new
   failure mode; worth revisiting only if the two lists ever
   actually drift.
   ============================================================ */

const DISCORD_API = "https://discord.com/api/v10";

/* Interaction types we care about. Full list in Discord's docs;
   these are the only two this Worker will ever see, because the
   app registers no slash commands. */
const PING = 1;
const MESSAGE_COMPONENT = 3;

/* Interaction response types. */
const PONG = 1;
const CHANNEL_MESSAGE = 4;

/* Ephemeral: visible only to the person who clicked. This is what
   keeps a confirmation from telling the channel how someone
   voted. */
const EPHEMERAL = 64;

/* The 3-star accent, as Discord wants it — a decimal int, not a
   hex string. #4EC3F2. */
const EMBED_COLOR = 0x4ec3f2;

/* custom_id is the only state a button carries back to us, and
   Discord caps it at 100 characters. "vote:1042:a" is nowhere
   near that, but the parser is strict anyway so a malformed or
   hand-crafted id is rejected rather than half-understood. */
const CUSTOM_ID = /^vote:(\d+):(a|b)$/;

/* ------------------------------------------------------------
   ENTRY POINT
   ------------------------------------------------------------ */
/* Admin routes, and the shape of each one's payload beyond the
   code. Kept as a table so adding an endpoint is one line here
   plus one handler, and so the CORS/auth wrapper never has to be
   repeated per route. */
const ADMIN_ROUTES = {
  "/whoami": handleWhoami,
  "/polls/list": handlePollsList,
  "/polls/create": handlePollsCreate,
  "/polls/outcome": handlePollsOutcome,
  "/polls/close": handlePollsClose,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* The admin page is served by GitHub Pages and this Worker
       lives on workers.dev, so every admin call is cross-origin
       and the browser sends a preflight first. Discord's POSTs
       never do — they aren't browsers — which is why only the
       admin routes carry CORS. */
    if (request.method === "OPTIONS") {
      return corsPreflight(request, env);
    }

    if (request.method === "POST" && ADMIN_ROUTES[url.pathname]) {
      return withAdmin(request, env, ADMIN_ROUTES[url.pathname]);
    }

    /* /health does real work rather than just reporting that
       variables are non-empty. It actually imports the public key,
       which is the step that decides whether Discord's endpoint
       validation can possibly succeed — so a green health check
       here means step 6 of PICKEM-SETUP.md will work. */
    if (request.method === "GET" && url.pathname === "/health") {
      const checks = {
        public_key_set: Boolean(env.DISCORD_PUBLIC_KEY),
        bot_token_set: Boolean(env.DISCORD_BOT_TOKEN),
        channel_set: Boolean(env.PICKEM_CHANNEL_ID),
        role_set: Boolean(env.THREE_STAR_ROLE_ID),
        db_bound: Boolean(env.DB),
        key_length_ok: null,
        ed25519: null,
        /* A length, not the value. Enough to tell "I forgot to
           replace the placeholder" from "I mistyped it". */
        dev_secret_length: env.DEV_SECRET ? env.DEV_SECRET.trim().length : 0,
        origins_set: Boolean(env.ALLOWED_ORIGINS),
        access_codes: null,
      };

      /* Reports whether the code list parses and how many entries
         carry pick'em — never a code, never a name. Enough to fix
         a config problem without signing in. */
      {
        const loaded = loadCodes(env);
        checks.access_codes = loaded.error
          ? loaded.error
          : {
              codes: Object.keys(loaded.codes).length,
              with_pickem: Object.values(loaded.codes)
                .filter(e => e && e.pickem === true).length,
            };
      }

      if (env.DISCORD_PUBLIC_KEY) {
        try {
          const bytes = hexToBytes(env.DISCORD_PUBLIC_KEY.trim());
          checks.key_length_ok = bytes.length === 32;
          if (checks.key_length_ok) {
            const imported = await importEd25519(bytes);
            checks.ed25519 = imported ? imported.algorithm.name : "UNSUPPORTED";
          }
        } catch {
          checks.key_length_ok = false;
          checks.ed25519 = "KEY_NOT_HEX";
        }
      }

      if (env.DB) {
        try {
          await env.DB.prepare("SELECT COUNT(*) AS n FROM polls").first();
          checks.schema_applied = true;
        } catch {
          checks.schema_applied = false;
        }
      }

      /* "ready" means specifically: Discord's endpoint validation
         can succeed. That needs a well-formed key the runtime can
         actually import — nothing else on this list blocks it. */
      const ready = Boolean(
        checks.public_key_set &&
        checks.key_length_ok &&
        checks.ed25519 &&
        checks.ed25519 !== "UNSUPPORTED" &&
        checks.ed25519 !== "KEY_NOT_HEX"
      );

      return json({ ok: true, service: "pickem", ready, checks, ts: nowSeconds() });
    }

    if (request.method === "POST" && url.pathname === "/dev/poll") {
      return handleDevPoll(request, env);
    }

    /* ROOT IS TREATED AS THE INTERACTIONS ENDPOINT TOO.

       Discord's Interactions Endpoint URL is typed by hand into a
       web form, and leaving the path off is the single easiest
       mistake to make — the first attempt at this setup did exactly
       that. The failure is maximally unhelpful: Discord reports
       "validation failed", the Worker sees a POST it 404s, and
       nothing in either message mentions a path.

       There is no cost to accepting both. Every signed POST is
       verified identically whichever path it arrives on, and an
       unsigned one is rejected identically too. */
    if (request.method === "POST" &&
        (url.pathname === "/interactions" || url.pathname === "/")) {
      return handleInteraction(request, env);
    }

    return json({ error: "Not found", path: url.pathname }, 404);
  },
};

/* ============================================================
   SIGNATURE VERIFICATION
   ------------------------------------------------------------
   THIS IS THE ONE THING THAT MUST NOT BE GOT WRONG.

   The interactions endpoint is a public URL. Without this check,
   anyone who guesses it can POST arbitrary votes as arbitrary
   users — which, with a prize attached, is the whole contest.

   Discord signs (timestamp + raw body) with Ed25519 and sends
   the signature and timestamp as headers. We verify against the
   app's public key. The body must be read as TEXT and verified
   before it is parsed: re-serialising JSON changes the bytes and
   the signature no longer matches.
   ============================================================ */
async function verify(request, rawBody, publicKeyHex) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  if (!signature || !timestamp) {
    console.error("verify: missing signature headers");
    return false;
  }

  let sigBytes, keyBytes;
  try {
    sigBytes = hexToBytes(signature);
  } catch {
    console.error("verify: signature header is not hex");
    return false;
  }
  try {
    keyBytes = hexToBytes(publicKeyHex.trim());
  } catch {
    console.error("verify: DISCORD_PUBLIC_KEY is not hex — check for spaces or quotes");
    return false;
  }

  if (keyBytes.length !== 32) {
    console.error(`verify: public key is ${keyBytes.length} bytes, expected 32`);
    return false;
  }
  if (sigBytes.length !== 64) {
    console.error(`verify: signature is ${sigBytes.length} bytes, expected 64`);
    return false;
  }

  const imported = await importEd25519(keyBytes);
  if (!imported) {
    console.error("verify: no Ed25519 variant could import the key");
    return false;
  }

  const ok = await crypto.subtle.verify(
    imported.algorithm,
    imported.key,
    sigBytes,
    new TextEncoder().encode(timestamp + rawBody)
  );

  if (!ok) {
    console.error(
      `verify: signature rejected using ${imported.algorithm.name}. ` +
      "The key imported fine, so this is almost always the WRONG key — " +
      "check it matches Public Key on the app's General Information page."
    );
  }
  return ok;
}

/* Workers called this algorithm "NODE-ED25519" before adopting the
   standard "Ed25519", and which one a given deployment accepts
   depends on its compatibility date — recent runtimes have dropped
   the old spelling, older ones never had the new one.

   EACH VARIANT NEEDS ITS OWN PARAMETER SHAPE. The legacy one wants
   a namedCurve; the standard one rejects it. An earlier version of
   this file passed namedCurve to both, so on a modern runtime the
   standard import threw on the unexpected parameter, the legacy
   import threw because the algorithm no longer exists, and every
   signature check quietly returned false. That presents as Discord
   saying "validation failed" with nothing obviously wrong. */
const ED25519_VARIANTS = [
  { name: "Ed25519" },
  { name: "NODE-ED25519", namedCurve: "NODE-ED25519" },
];

async function importEd25519(keyBytes) {
  for (const algorithm of ED25519_VARIANTS) {
    try {
      const key = await crypto.subtle.importKey(
        "raw", keyBytes, algorithm, false, ["verify"]
      );
      return { key, algorithm };
    } catch (err) {
      console.log(`importKey(${algorithm.name}) unavailable: ${err.message}`);
    }
  }
  return null;
}

function hexToBytes(hex) {
  if (typeof hex !== "string" || hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) {
    throw new Error("not hex");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

/* ============================================================
   INTERACTIONS
   ============================================================ */
async function handleInteraction(request, env) {
  if (!env.DISCORD_PUBLIC_KEY) {
    console.error("DISCORD_PUBLIC_KEY is not set");
    return json({ error: "Server misconfigured" }, 500);
  }

  const rawBody = await request.text();

  const ok = await verify(request, rawBody, env.DISCORD_PUBLIC_KEY);
  if (!ok) {
    /* Discord expects exactly 401 here, and checks for it when
       you save the endpoint URL. Anything else and verification
       fails with a confusing message. */
    return new Response("invalid request signature", { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }

  /* Discord's handshake. It fires this the moment you save the
     Interactions Endpoint URL, and refuses the save unless this
     exact reply comes back. */
  if (body.type === PING) return json({ type: PONG });

  if (body.type === MESSAGE_COMPONENT) return handleVote(body, env);

  /* Anything else is something we never registered for. Answer
     politely rather than erroring — an unhandled interaction shows
     the user "this interaction failed", which looks broken. */
  return reply("That control isn't wired to anything.");
}

/* ------------------------------------------------------------
   A VOTE
   Five checks, then one write. Discord allows three seconds for
   a response; a D1 write is single-digit milliseconds, so the
   budget is comfortable — but nothing slow may happen before the
   reply is returned.
   ------------------------------------------------------------ */
async function handleVote(body, env) {
  const match = CUSTOM_ID.exec(body.data?.custom_id || "");
  if (!match) return reply("That button is from an older poll.");

  const pollId = Number(match[1]);
  const choice = match[2];

  /* 1 — WHO. member is present for clicks in a server; user is
     the DM shape. A poll only ever lives in the channel, so no
     member means something is off and there are no roles to
     check against. */
  const member = body.member;
  const user = member?.user || body.user;
  if (!member || !user) {
    return reply("Pick'em votes only count in the server.");
  }

  /* 2 — MAY THEY VOTE. The channel is role-gated already, but a
     click carries the roles with it, so this closes the case
     where someone can see the channel without holding the role.
     RekenCrew holds the 3-star role, so this is a single test
     with no special case. */
  const roles = member.roles || [];
  if (!roles.includes(env.THREE_STAR_ROLE_ID)) {
    return reply("Pick'em is for the 3-star dynasty. Ask Blood if that's wrong.");
  }

  /* 3 — DOES THE POLL EXIST, AND IS IT OPEN. closes_at is a
     timestamp compared against now, which is why nothing has to
     close a poll on a schedule. */
  const poll = await env.DB.prepare(
    "SELECT id, option_a_label, option_b_label, closes_at, outcome FROM polls WHERE id = ?"
  ).bind(pollId).first();

  if (!poll) return reply("That poll no longer exists.");

  const now = nowSeconds();
  if (now >= poll.closes_at) {
    return reply(
      `Voting closed <t:${poll.closes_at}:R>. Your pick before then is the one that counts.`
    );
  }

  const label = choice === "a" ? poll.option_a_label : poll.option_b_label;
  const other = choice === "a" ? poll.option_b_label : poll.option_a_label;

  /* 4 — NEW VOTE, CHANGED VOTE, OR THE SAME BUTTON AGAIN.
     Read first so the confirmation can say which of the three
     happened. Clicking the button you already picked is a no-op
     and NOT a toggle-off: on a phone a stray double-tap would
     otherwise silently un-vote someone who thinks they're in. */
  const existing = await env.DB.prepare(
    "SELECT choice FROM votes WHERE poll_id = ? AND user_id = ?"
  ).bind(pollId, user.id).first();

  if (existing && existing.choice === choice) {
    return reply(`You've already picked **${label}**. Tap **${other}** to switch.`);
  }

  /* 5 — WRITE. Vote, history, and the display-name cache go
     together; batch() runs them as one transaction so a partial
     write can't leave a vote without its history row. */
  const statements = [
    env.DB.prepare(
      `INSERT INTO votes (poll_id, user_id, choice, first_cast_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?4)
       ON CONFLICT (poll_id, user_id)
       DO UPDATE SET choice = ?3, updated_at = ?4`
    ).bind(pollId, user.id, choice, now),

    env.DB.prepare(
      "INSERT INTO vote_history (poll_id, user_id, choice, cast_at) VALUES (?, ?, ?, ?)"
    ).bind(pollId, user.id, choice, now),

    env.DB.prepare(
      `INSERT INTO voters (user_id, handle, nickname, last_seen_at)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (user_id)
       DO UPDATE SET handle = ?2, nickname = ?3, last_seen_at = ?4`
    ).bind(user.id, user.username || null, member.nick || null, now),
  ];

  try {
    await env.DB.batch(statements);
  } catch (err) {
    console.error("vote write failed", err);
    return reply("Something went wrong saving that. Try again in a moment.");
  }

  /* Deliberately no running total here. Telling one voter the
     split is telling everyone, and a visible tally before the
     deadline turns a prediction contest into a following
     contest. */
  return reply(
    existing
      ? `Changed to **${label}**. Closes <t:${poll.closes_at}:R>.`
      : `Locked in: **${label}**. You can change it until <t:${poll.closes_at}:R>.`
  );
}

/* ============================================================
   POSTING A POLL
   ------------------------------------------------------------
   Both buttons are SECONDARY (grey). Making one primary would
   tint it blurple and put a thumb on the scale for whichever
   option happened to be typed first.

   The deadline goes out as Discord's <t:...> markup, which every
   client renders in the reader's own timezone. No "8pm ET" for
   anyone to mistranslate.
   ============================================================ */
async function postPollMessage(poll, env) {
  const payload = {
    embeds: [{
      title: poll.kind === "dynasty" ? "Dynasty pick'em" : "Pick'em",
      description:
        `**${poll.option_a_label}**  vs  **${poll.option_b_label}**` +
        (poll.note ? `\n${poll.note}` : ""),
      color: EMBED_COLOR,
      footer: { text: "One vote each. Change it any time before it closes." },
      fields: [{
        name: "Closes",
        value: `<t:${poll.closes_at}:F>  ·  <t:${poll.closes_at}:R>`,
      }],
    }],
    components: [{
      type: 1,
      components: [
        { type: 2, style: 2, label: trim(poll.option_a_label), custom_id: `vote:${poll.id}:a` },
        { type: 2, style: 2, label: trim(poll.option_b_label), custom_id: `vote:${poll.id}:b` },
      ],
    }],
  };

  const res = await fetch(`${DISCORD_API}/channels/${env.PICKEM_CHANNEL_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Discord ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/* Discord rejects button labels over 80 characters outright, so
   truncate rather than let the whole post fail on a long name. */
const trim = s => (s.length > 80 ? s.slice(0, 77) + "..." : s);

/* ============================================================
   TEMPORARY DEV ENDPOINT
   ------------------------------------------------------------
   Exists so Phase 1 can be tested end to end with curl, before
   the admin page has any pick'em UI. Phase 2 replaces it with a
   real endpoint authorised by ACCESS_CODES — DELETE THIS THEN.
   ============================================================ */
async function handleDevPoll(request, env) {
  if (!env.DEV_SECRET) return json({ error: "DEV_SECRET not set" }, 403);

  /* Trim both sides. Pasting a secret into a dashboard field picks
     up a trailing newline more often than anyone expects, and a
     one-character length difference fails the compare with an error
     that looks identical to a completely wrong value. */
  const sent = (request.headers.get("x-dev-secret") || "").trim();
  const expected = env.DEV_SECRET.trim();

  if (!safeEqual(sent, expected)) {
    /* Lengths are not the secret, and printing them turns "wrong
       value" and "didn't replace the placeholder" into two visibly
       different failures. */
    console.error(
      `dev/poll rejected: sent ${sent.length} chars, expected ${expected.length}`
    );
    return json({
      error: "Nope",
      hint: sent.length === 0
        ? "No X-Dev-Secret header was sent."
        : `Sent ${sent.length} characters, expected ${expected.length}.`,
    }, 403);
  }

  let b;
  try {
    b = await request.json();
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }

  const a = String(b.a || "").trim();
  const bb = String(b.b || "").trim();
  const closesAt = Number(b.closes_at);

  if (!a || !bb) return json({ error: "Need both a and b" }, 400);
  if (!Number.isInteger(closesAt) || closesAt <= nowSeconds()) {
    return json({ error: "closes_at must be a future unix time in SECONDS" }, 400);
  }

  const kind = b.kind === "external" ? "external" : "dynasty";
  const now = nowSeconds();

  const inserted = await env.DB.prepare(
    `INSERT INTO polls (kind, option_a_label, option_b_label, note, closes_at,
                        channel_id, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`
  ).bind(kind, a, bb, b.note || null, closesAt,
         env.PICKEM_CHANNEL_ID, "dev", now).first();

  const poll = {
    id: inserted.id, kind, option_a_label: a, option_b_label: bb,
    note: b.note || null, closes_at: closesAt,
  };

  try {
    const message = await postPollMessage(poll, env);
    await env.DB.prepare("UPDATE polls SET message_id = ? WHERE id = ?")
      .bind(message.id, poll.id).run();
    return json({ ok: true, poll_id: poll.id, message_id: message.id });
  } catch (err) {
    /* Roll the row back. A poll with no message_id is unreachable
       — no buttons exist to vote on it — so leaving it behind just
       accumulates phantom "open" polls that the site would happily
       render. Deleting makes a failed attempt a no-op you can
       simply retry. */
    console.error("post failed", err);
    await env.DB.prepare("DELETE FROM polls WHERE id = ?").bind(poll.id).run();

    const msg = String(err);
    let hint;
    if (msg.includes("50001")) {
      hint = "The bot can't see that channel. Edit Channel -> Permissions -> " +
             "add the bot with View Channel, Send Messages and Embed Links. " +
             "Being in the server is not enough for a private channel.";
    } else if (msg.includes("50013")) {
      hint = "The bot can see the channel but can't post in it. Grant " +
             "Send Messages and Embed Links.";
    } else if (msg.includes("401")) {
      hint = "DISCORD_BOT_TOKEN is wrong or was reset.";
    } else if (msg.includes("Discord 404")) {
      hint = "PICKEM_CHANNEL_ID doesn't match a channel the bot can reach.";
    }

    return json({ ok: false, rolled_back: true, error: msg, hint }, 502);
  }
}

/* ============================================================
   ADMIN — AUTH
   ------------------------------------------------------------
   Same model as admin-api.js: the code IS the identity, it is
   held in a variable by the page and never in storage, and every
   request re-checks it. What's different here is one extra test —
   a code must carry `pickem: true`. Running a league and running
   the pick'em are separate grants, so a commissioner who scores
   3-star cannot post polls unless they've also been given this.
   ============================================================ */
const MIN_CODE_LENGTH = 16;

/* Returns { codes } or { error }. The error text names the actual
   problem and is safe to return to the caller: it describes the
   shape of a config value, never its contents, and every one of
   these states means nobody can authenticate at all — so there is
   no attacker to help. An earlier version returned a bare null and
   the commonest cause, the variable simply not being set, logged
   nothing whatsoever. */
function loadCodes(env) {
  if (!env.ACCESS_CODES) {
    return { error: "ACCESS_CODES isn't set on this Worker." };
  }

  let parsed;
  try {
    parsed = JSON.parse(env.ACCESS_CODES);
  } catch (err) {
    /* Pass the parser's own message through — it names the offending
       character and its position, which is the difference between
       "it's broken somewhere" and a five-second fix. It quotes only
       structural characters, never a code.

       (Multi-line JSON parses fine. An earlier version of this
       message claimed otherwise and sent people looking in the wrong
       place. The real causes are a trailing comma, a smart quote
       from a word processor, or a truncated paste.) */
    return {
      error: `ACCESS_CODES isn't valid JSON — ${err.message}. ` +
             `Length is ${env.ACCESS_CODES.length} characters.`,
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "ACCESS_CODES must be a JSON object keyed by code." };
  }

  const keys = Object.keys(parsed);
  if (!keys.length) {
    return { error: "ACCESS_CODES is empty." };
  }

  /* Refuse to start on a short code rather than quietly accepting
     it. Code length is the only thing really standing between this
     and a brute-force attempt. */
  for (const code of keys) {
    if (code.length < MIN_CODE_LENGTH) {
      return {
        error: `A code in ACCESS_CODES is ${code.length} characters; ` +
               `the minimum is ${MIN_CODE_LENGTH}.`,
      };
    }
  }

  return { codes: parsed };
}

/* Constant-time lookup. A plain object lookup would return in
   different time for a near-miss than a wild miss; walking every
   entry costs nothing at this size and leaks nothing. */
function lookup(codes, supplied) {
  let found = null;
  for (const [code, entry] of Object.entries(codes)) {
    if (safeEqual(code, supplied)) found = entry;
  }
  return found;
}

async function withAdmin(request, env, handler) {
  const origin = request.headers.get("Origin");
  if (!originAllowed(origin, env)) {
    return cors(json({ error: "Not allowed from there." }, 403), origin, env);
  }

  const loaded = loadCodes(env);
  if (loaded.error) {
    console.error("config:", loaded.error);
    return cors(json({
      error: "Server is misconfigured. Tell Josh.",
      detail: loaded.error,
    }, 500), origin, env);
  }
  const codes = loaded.codes;

  let body;
  try {
    body = await request.json();
  } catch {
    return cors(json({ error: "Bad request." }, 400), origin, env);
  }

  const supplied = String(body.code || "");
  const me = supplied.length >= MIN_CODE_LENGTH ? lookup(codes, supplied) : null;

  if (!me) {
    return cors(json({ error: "That code wasn't recognised." }, 403), origin, env);
  }
  if (me.pickem !== true) {
    return cors(json({
      error: "That code doesn't have pick'em access. Ask Josh to add it.",
    }, 403), origin, env);
  }

  const res = await handler(body, env, me);
  return cors(res, origin, env);
}

/* ============================================================
   ADMIN — HANDLERS
   ============================================================ */
function handleWhoami(_body, _env, me) {
  return json({ name: me.name, pickem: true });
}

/* The admin list obeys the same visibility rule as the public
   page: an OPEN poll reports how many people have voted and NOT
   how they split.

   That is deliberate and it is not paranoia about Blood. He's in
   the drawing too, and a running 11-2 visible to anyone before the
   deadline lets that person move their own pick to match. Hiding
   it from every surface is what makes "everyone commits
   independently" true rather than aspirational. */
async function handlePollsList(_body, env) {
  const now = nowSeconds();

  const polls = (await env.DB.prepare(
    `SELECT p.*,
            (SELECT COUNT(*) FROM votes v WHERE v.poll_id = p.id) AS votes,
            (SELECT COUNT(*) FROM votes v WHERE v.poll_id = p.id AND v.choice = 'a') AS a_votes,
            (SELECT COUNT(*) FROM votes v WHERE v.poll_id = p.id AND v.choice = 'b') AS b_votes
       FROM polls p
      ORDER BY p.closes_at DESC`
  ).all()).results || [];

  const shape = (p, withSplit) => ({
    id: p.id,
    kind: p.kind,
    a: p.option_a_label,
    b: p.option_b_label,
    note: p.note,
    closes_at: p.closes_at,
    message_id: p.message_id,
    outcome: p.outcome,
    votes: p.votes,
    ...(withSplit ? { a_votes: p.a_votes, b_votes: p.b_votes } : {}),
  });

  return json({
    open: polls.filter(p => p.closes_at > now && p.outcome === null)
               .map(p => shape(p, false)),
    awaiting: polls.filter(p => p.closes_at <= now && p.outcome === null)
                   .map(p => shape(p, true)),
    settled: polls.filter(p => p.outcome !== null).map(p => shape(p, true)),
  });
}

async function handlePollsCreate(body, env, me) {
  const a = String(body.a || "").trim();
  const b = String(body.b || "").trim();
  const closesAt = Number(body.closes_at);
  const kind = body.kind === "external" ? "external" : "dynasty";
  const note = String(body.note || "").trim().slice(0, 120) || null;

  if (!a || !b) return json({ error: "Both sides need a name." }, 400);
  if (a.length > 80 || b.length > 80) {
    return json({ error: "Names are limited to 80 characters." }, 400);
  }
  if (a.toLowerCase() === b.toLowerCase()) {
    return json({ error: "Both sides are the same." }, 400);
  }
  if (!Number.isInteger(closesAt)) {
    return json({ error: "Closing time is missing." }, 400);
  }

  const now = nowSeconds();
  if (closesAt <= now + 60) {
    return json({ error: "Closing time must be at least a minute away." }, 400);
  }
  /* 32 days matches Discord's own ceiling on a native poll, and a
     pick'em open longer than a month is a mistake rather than a
     plan. */
  if (closesAt > now + 32 * 86400) {
    return json({ error: "Closing time is more than 32 days out." }, 400);
  }

  const inserted = await env.DB.prepare(
    `INSERT INTO polls (kind, option_a_label, option_b_label, note, closes_at,
                        channel_id, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`
  ).bind(kind, a, b, note, closesAt, env.PICKEM_CHANNEL_ID, me.name, now).first();

  const poll = {
    id: inserted.id, kind, option_a_label: a, option_b_label: b,
    note, closes_at: closesAt,
  };

  try {
    const message = await postPollMessage(poll, env);
    await env.DB.prepare("UPDATE polls SET message_id = ? WHERE id = ?")
      .bind(message.id, poll.id).run();
    return json({ ok: true, poll_id: poll.id, message_id: message.id });
  } catch (err) {
    /* Roll back. A poll with no message has no buttons, so it can
       never be voted on — leaving it would put a permanently empty
       "open" poll on the site. */
    console.error("post failed", err);
    await env.DB.prepare("DELETE FROM polls WHERE id = ?").bind(poll.id).run();
    return json({
      ok: false,
      error: "Couldn't post to Discord, so nothing was created. Try again.",
      detail: String(err),
    }, 502);
  }
}

async function handlePollsOutcome(body, env) {
  const pollId = Number(body.poll_id);
  const outcome = body.outcome;

  if (!["a", "b", "void", "clear"].includes(outcome)) {
    return json({ error: "Outcome must be a, b, void or clear." }, 400);
  }

  const poll = await env.DB.prepare(
    "SELECT id, closes_at FROM polls WHERE id = ?"
  ).bind(pollId).first();

  if (!poll) return json({ error: "No such poll." }, 404);

  /* "clear" undoes a result, dropping the poll back into "needs a
     result". Correcting a mistake has to be possible — a wrong
     winner silently misallocates drawing entries for everyone who
     picked that game — and unsetting is safer than editing in
     place, because it forces the result to be entered again
     deliberately rather than nudged. */
  if (outcome === "clear") {
    await env.DB.prepare(
      "UPDATE polls SET outcome = NULL, settled_at = NULL WHERE id = ?"
    ).bind(pollId).run();
    return json({ ok: true, cleared: true });
  }

  /* Refuse to settle a poll people can still vote in. Otherwise a
     result set early would score picks made after the answer was
     known. */
  if (poll.closes_at > nowSeconds()) {
    return json({ error: "That poll is still open. Close it first." }, 409);
  }

  await env.DB.prepare(
    "UPDATE polls SET outcome = ?, settled_at = ? WHERE id = ?"
  ).bind(outcome, nowSeconds(), pollId).run();

  return json({ ok: true });
}

/* Closing early only moves closes_at into the past. The vote
   handler already refuses anything at or after that instant, so
   there is no second notion of "closed" to keep in step. */
async function handlePollsClose(body, env) {
  const pollId = Number(body.poll_id);
  const res = await env.DB.prepare(
    "UPDATE polls SET closes_at = ? WHERE id = ? AND outcome IS NULL"
  ).bind(nowSeconds() - 1, pollId).run();

  if (!res.meta.changes) return json({ error: "Nothing to close." }, 404);
  return json({ ok: true });
}

/* ============================================================
   CORS
   ------------------------------------------------------------
   ALLOWED_ORIGINS is what stops someone else's website putting a
   form in front of these endpoints. Same reasoning as the admin
   Worker, and worth setting properly here for the same reason.
   ============================================================ */
function originAllowed(origin, env) {
  if (!env.ALLOWED_ORIGINS) return true;   // unset = allow, with a warning below
  if (!origin) return false;
  return env.ALLOWED_ORIGINS.split(",").map(s => s.trim()).includes(origin);
}

function cors(response, origin, env) {
  if (!originAllowed(origin, env)) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin || "*");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}

function corsPreflight(request, env) {
  const origin = request.headers.get("Origin");
  if (!originAllowed(origin, env)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}

/* ============================================================
   HELPERS
   ============================================================ */
const nowSeconds = () => Math.floor(Date.now() / 1000);

function reply(content) {
  return json({
    type: CHANNEL_MESSAGE,
    data: { content, flags: EPHEMERAL },
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/* Constant-time compare, same as admin-api.js uses on access
   codes. Overkill for a dev secret; free, and the habit is worth
   more than the cycles. */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
