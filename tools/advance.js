#!/usr/bin/env node
/* ============================================================
   ADVANCE — bump the site to a new week and announce it in Discord
   ------------------------------------------------------------
   One command does both halves of an advance:

     1. rewrites SEASON in league-data.js (currentWeek, statusLine,
        nextAdvance)
     2. reads schedule-data.js, works out every matchup for that
        week, splits H2H (user vs user) games from CPU games, and
        posts the announcement to a Discord webhook

   USAGE
     node tools/advance.js --week 5 --next "2026-07-26 18:00"
     node tools/advance.js --league 3star --week 2 --no-post

   FLAGS
     --league SLUG     main | 3star | 1star. Defaults to main.
     --week N          the week now being played (0-15). Required.
     --next "..."      the next advance deadline, as a DATE, not a
                       sentence. "2026-07-26 18:00" or "2026-07-26"
                       for a league that names a day and no time.
                       Eastern either way — see /deadline.js.
                       Carried over from the file when omitted.
     --at "..."        alias for --next, if that reads better.
     --status "..."    override the hero status line. Defaults to "WEEK N".

   WHY THE DEADLINE IS A DATE AND NOT A SENTENCE
   It used to be free text, typed however it read best, and that made
   it impossible to ask "is the advance today?" — the question the
   advance-day heads-up post (tools/heads-up.js) has to answer every
   morning. So a date goes in, and the sentence coaches read comes
   out: this writes BOTH nextAdvanceAt (the timestamp) and
   nextAdvance (the generated text) into league-data.js. Free text is
   now rejected rather than stored, because a deadline nothing can
   read is how the heads-up silently stops firing.
     --dry-run         print the message, change nothing, post nothing.
     --no-post         update the data file but skip Discord.
     --no-write        post to Discord but leave the data file alone.

   WEBHOOK — per league
     Read from env DISCORD_WEBHOOK_URL, or from tools/config.json:
       { "leagues": { "main": { "webhookUrl": "https://discord.com/..." } } }
     All three leagues have one now, so a local advance posts by
     default; pass --no-post to skip it for a given run.
     config.json is gitignored — the URL is a secret. Anyone holding
     it can post to the channel as the bot. The web advance path gets
     the same config on its runner via the DISCORD_CONFIG repo secret
     (see worker/ADMIN-SETUP.md), so it posts too.

   This script has no dependencies and never touches the network
   except for the single webhook POST.
   ============================================================ */

const fs = require("fs");
const path = require("path");

/* Data loading, roster/alias resolution and the week breakdown are
   shared with scores.js — see tools/lib/league.js. Keeping one copy
   is what guarantees Discord and the site never disagree about who
   plays whom. */
/* The one implementation of Eastern-time handling, shared with the
   admin page. Everything here that turns a date into a stored value
   or a printed sentence goes through it. */
const Deadline = require("../deadline");

const {
  parseArgs,
  die,
  resolveLeague,
  loadData,
  buildWeek,
  weekLabel,
  parseWeek,
  loadConfig,
  top25GateError,
  bowlWeekWarning,
} = require("./lib/league");

/* ------------------------------------------------------------
   MENTIONS
   ------------------------------------------------------------
   Discord only fires a notification for mentions in the top-level
   `content` field. Mentions inside an embed render as blue text and
   ping nobody — so anything that needs to actually notify someone
   has to live in `content`, not in an embed field. That single rule
   is why the H2H matchups sit in the message body while the CPU
   list stays in the embed.

   Syntax:
     user   <@123456789012345678>
     role   <@&123456789012345678>

   IDs are numeric snowflakes, not usernames. "@someone" is just
   text. Get them via Discord Settings > Advanced > Developer Mode,
   then right-click a user or role > Copy ID.
   ------------------------------------------------------------ */
const isSnowflake = (v) => /^\d{15,25}$/.test(String(v ?? "").trim());

function makeMentioner(cfg, slug) {
  const ids = cfg.coaches || {};
  const missing = new Set();

  /* Case-insensitive index. The three leagues spell some names with
     different capitalization (config's "ronricofsu" vs 3star's
     "RonRicoFSU"), and an exact-match lookup would silently drop the
     ping and just bold the name. Lowercasing both sides fixes that
     whole class of bug. No two distinct coaches collide when lowered. */
  const byLower = {};
  for (const k of Object.keys(ids)) byLower[k.toLowerCase()] = ids[k];

  // Coach name -> "<@id>", or bold plain text when no ID is on file.
  const forCoach = (name) => {
    if (!name) return "";
    const rec = byLower[String(name).toLowerCase()];
    const id = typeof rec === "string" ? rec : rec?.id;
    if (isSnowflake(id)) return `<@${String(id).trim()}>`;
    missing.add(name);
    return `**${name}**`;
  };

  /* Channel-wide ping. Two mutually exclusive ways to get one:
       roleMention.id        a ROLE snowflake -> <@&id>
       roleMention.everyone  the literal "@everyone" or "@here"
     A CHANNEL id is neither. <#channelId> renders a clickable link
     and notifies nobody, so it is deliberately not accepted here.

     Roles are PER LEAGUE: each league lives on its own Discord server,
     so its role snowflake is meaningful only there. Posting main's role
     ID into the 3-star server would render as a dead "@unknown-role"
     and ping nobody. leagues[slug].roleMention wins; the top-level
     roleMention is the fallback for a caller with no slug and for older
     configs written before the leagues split. */
  const roleCfg = cfg.leagues?.[slug]?.roleMention ?? cfg.roleMention ?? {};
  const roleId = String(roleCfg.id ?? "").trim();
  const blanket = String(roleCfg.everyone ?? "").trim().toLowerCase();
  const useBlanket = blanket === "@everyone" || blanket === "@here";

  let role = "";
  if (isSnowflake(roleId)) role = `<@&${roleId}>`;
  else if (useBlanket) role = blanket;

  // Everything we deliberately allow to ping. Anything not listed is
  // inert even if the text looks like a mention — so a stray
  // "@everyone" in a deadline string can never blast the server.
  const allowed = () => ({
    parse: useBlanket && !isSnowflake(roleId) ? ["everyone"] : [],
    users: Object.values(ids)
      .map((r) => (typeof r === "string" ? r : r?.id))
      .filter(isSnowflake),
    roles: isSnowflake(roleId) ? [roleId] : [],
  });

  return { forCoach, role, allowed, missing };
}

/* ------------------------------------------------------------
   MESSAGE
   ------------------------------------------------------------ */
const CONTENT_LIMIT = 2000;

function buildMessage(data, week, wk, nextAdvance, cfg, siteUrl, slug) {
  const label = weekLabel(week);
  const M = makeMentioner(cfg, slug);

  /* ---- content: the part that actually notifies people ---- */
  const head = [
    M.role,
    `**We've advanced to ${label}.**`,
    nextAdvance ? `Get your games in by **${nextAdvance}**.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const leagueBody = wk.league.length
    ? wk.league
        .map(
          (m) =>
            `• ${M.forCoach(m.awayCoach) || m.away} *(${m.away})*` +
            `  at  ${M.forCoach(m.homeCoach) || m.home} *(${m.home})*`
        )
        .join("\n")
    : "_No user vs user games this week._";

  /* CPU games live in the body too, not the embed. Every coach has
     exactly one line each week, so this is the only way all 24 get
     notified when there's no @everyone / role ping to fall back on.
     An embed would look tidier and notify nobody. */
  const cpuBody = wk.cpu.length
    ? wk.cpu
        .map(
          (g) =>
            `• ${M.forCoach(g.coach) || g.team} *(${g.team})* ` +
            `${g.location === "at" ? "at" : "vs"} ${g.opponent}`
        )
        .join("\n")
    : "_None._";

  const section = (title, body) => `\n\n__**${title}**__\n${body}`;

  let content =
    head +
    section(`H2H Games (${wk.league.length})`, leagueBody) +
    section(`CPU Games (${wk.cpu.length})`, cpuBody);

  /* Hard Discord limit of 2000. If we blow it, CPU games fall back to
     the embed — they lose their pings, but H2H games (the ones that
     need coordinating between two humans) keep theirs. Reported loudly
     so a silent downgrade can't happen unnoticed. */
  let overflow = "";
  if (content.length > CONTENT_LIMIT) {
    overflow = cpuBody;
    content = head + section(`H2H Games (${wk.league.length})`, leagueBody);
  }

  /* ---- embed: reference material only ---- */
  const fields = [];

  if (overflow) {
    fields.push({
      name: `CPU Games (${wk.cpu.length})`,
      value: truncate(
        wk.cpu
          .map(
            (g) =>
              `**${g.coach || g.team}** (${g.team}) ` +
              `${g.location === "at" ? "at" : "vs"} ${g.opponent}`
          )
          .join("\n"),
        1024
      ),
    });
  }

  /* Byes live in the embed and ping nobody individually — the coaches
     on a bye are covered by the league role ping at the top of the
     message, so this list is reference material, not a notification. */
  if (wk.notes.length) {
    fields.push({
      name: `Byes & Off Weeks (${wk.notes.length})`,
      value: truncate(
        wk.notes.map((n) => `**${n.coach || n.team}** (${n.team}) — ${n.note}`).join("\n"),
        1024
      ),
    });
  }

  if (nextAdvance) {
    fields.push({ name: "​", value: `**Next advance:** ${nextAdvance}` });
  }

  return {
    payload: {
      username: `${data.LEAGUE_INFO.name || "League"} Commissioner`,
      content,
      allowed_mentions: M.allowed(),
      embeds: [
        {
          title: label.toUpperCase(),
          url: siteUrl,
          color: 0xc9a227,
          description: `Full schedule, rosters, and rankings at ${siteUrl}`,
          fields,
          footer: { text: `${data.LEAGUE_INFO.name} · ${data.LEAGUE_INFO.tag || ""}`.trim() },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    missingMentions: [...M.missing],
    hasRole: Boolean(M.role),
    overflowed: Boolean(overflow),
  };
}

function truncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max - 20).replace(/\n[^\n]*$/, "") + "\n_…list truncated_";
}

/* ------------------------------------------------------------
   REWRITE SEASON IN league-data.js
   ------------------------------------------------------------
   Surgical replacement rather than regenerating the file — the
   comments in league-data.js are documentation the commissioner
   relies on and must survive untouched.

   Those same comments discuss `currentWeek` and `nextAdvance` by
   name, so a naive file-wide regex would match prose. Everything
   below is scoped to the body of `const SEASON = { ... }` and, within
   it, to real assignment lines (indented, ending in a comma) rather
   than mentions inside block comments.
   ------------------------------------------------------------ */
function seasonBlock(src, leagueFile) {
  const start = src.search(/const\s+SEASON\s*=\s*\{/);
  if (start === -1) die(`could not find \`const SEASON = {\` in ${leagueFile}`);

  const open = src.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return { open, close: i, body: src.slice(open, i + 1) };
    }
  }
  die(`SEASON block in ${leagueFile} is never closed — unbalanced braces`);
}

/* The deadline is written as a PAIR: the timestamp that tools read
   and the sentence the site shows, generated from it. They are only
   ever set together, here, which is what stops them drifting apart.
   Pass nextAdvanceAt as undefined to leave the existing deadline
   alone; pass "" to clear it, which blanks both fields and hides the
   countdown line. */
function updateSeason(leagueFile, week, statusLine, nextAdvanceAt) {
  const src = fs.readFileSync(leagueFile, "utf8");
  const { open, close, body } = seasonBlock(src, path.basename(leagueFile));

  let next = body;
  next = replaceOne(next, /^(\s*currentWeek:\s*)(?:"PRESEASON"|\d+)(,)/m, `$1${week}$2`, "currentWeek");
  next = replaceOne(
    next,
    /^(\s*statusLine:\s*)"[^"]*"(,)/m,
    `$1${JSON.stringify(statusLine)}$2`,
    "statusLine"
  );
  if (nextAdvanceAt !== undefined) {
    const at = String(nextAdvanceAt).trim();
    /* A non-empty value that won't parse must never reach the file.
       It would sit there looking like a deadline while every tool
       that reads it — starting with the heads-up — treats it as
       absent. Callers validate first; this is the backstop. */
    const stored = Deadline.canonical(at);
    if (stored === null) {
      die(`refusing to write an unreadable deadline: ${JSON.stringify(at)}`);
    }
    const text = stored ? Deadline.formatDeadline(stored) : "";

    /* nextAdvanceAt: is matched before nextAdvance: on purpose — the
       shorter regex requires the colon immediately after the name, so
       it cannot match the longer key, but the ordering makes that
       obvious to the next person reading it. */
    next = replaceOne(
      next,
      /^(\s*nextAdvanceAt:\s*)"[^"]*"(,)/m,
      `$1${JSON.stringify(stored)}$2`,
      "nextAdvanceAt"
    );
    next = replaceOne(
      next,
      /^(\s*nextAdvance:\s*)"[^"]*"(,)/m,
      `$1${JSON.stringify(text)}$2`,
      "nextAdvance"
    );
  }

  /* No diff is a legitimate no-op, not an error: re-running the same
     week to re-post the announcement lands here every time. The
     individual replaceOne() calls above already fail loudly if a field
     is genuinely missing, so reaching this point with no change means
     the file simply already says what we want it to say. */
  if (next === body) return false;

  fs.writeFileSync(leagueFile, src.slice(0, open) + next + src.slice(close + 1), "utf8");
  return true;
}

function replaceOne(src, re, repl, field) {
  const matches = src.match(new RegExp(re.source, "gm")) || [];
  if (matches.length === 0) die(`could not find a \`${field}:\` assignment in the SEASON block`);
  if (matches.length > 1) die(`found ${matches.length} \`${field}:\` lines in SEASON — refusing to guess`);
  return src.replace(re, repl);
}

/* ------------------------------------------------------------
   DISCORD
   ------------------------------------------------------------ */
/* Per-league webhook, with the pre-multi-league top-level
   `webhookUrl` still honoured for main so an older config keeps
   working. Env var overrides everything, for one-off testing. */
function webhookUrl(cfg, slug) {
  if (process.env.DISCORD_WEBHOOK_URL) return process.env.DISCORD_WEBHOOK_URL.trim();

  const perLeague = cfg.leagues?.[slug]?.webhookUrl;
  if (perLeague && !perLeague.includes("PASTE")) return perLeague.trim();

  if (slug === "main" && cfg.webhookUrl && !cfg.webhookUrl.includes("PASTE")) {
    return cfg.webhookUrl.trim();
  }
  return "";
}

async function post(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    /* Throw rather than die() so callers can decide what a failed post
       means. main() below catches it and dies exactly as before; the
       web path (tools/apply.js) catches it and keeps the site advance
       instead of losing it to a Discord outage. */
    throw new Error(`Discord rejected the post (HTTP ${res.status}) ${body.slice(0, 300)}`);
  }
}

/* ------------------------------------------------------------
   THE DEADLINE ARGUMENT
   ------------------------------------------------------------
   Turns whatever was typed on the command line into the pair the
   rest of the run needs: `at`, the value stored in league-data.js,
   and `text`, the sentence that goes on the site and into Discord.

   Omitting the flag carries the existing deadline over untouched,
   which is what makes `--no-write --week N` re-post the same
   announcement rather than inventing a new date.

   A value that doesn't parse stops the run. The tempting
   alternative — store the text and leave the timestamp blank — is
   exactly the failure this whole change exists to remove: the site
   would look fine and the heads-up would never fire again, with
   nothing anywhere saying why.
   ------------------------------------------------------------ */
function resolveDeadline(args, data) {
  const raw = args.at !== undefined ? args.at : args.next;

  if (raw === undefined) {
    const at = data.SEASON.nextAdvanceAt ?? "";
    return { at: undefined, text: at ? Deadline.formatDeadline(at) : data.SEASON.nextAdvance || "" };
  }

  const value = String(raw).trim();
  if (!value) return { at: "", text: "" }; // deliberate clear

  if (!Deadline.parseAt(value)) {
    die(
      `--next "${value}" isn't a date this can work with.\n` +
        "  Give a date, not a sentence — the sentence is generated from it:\n" +
        '    --next "2026-07-26 18:00"   Sunday, July 26th - 6:00 PM EDT\n' +
        '    --next "2026-07-26"         Sunday, July 26th  (no time shown)\n' +
        "  Times are Eastern. See /deadline.js."
    );
  }

  return { at: value, text: Deadline.formatDeadline(value) };
}

/* ------------------------------------------------------------
   MAIN
   ------------------------------------------------------------ */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.flags.has("dry-run");
  const noPost = args.flags.has("no-post") || dryRun;
  const noWrite = args.flags.has("no-write") || dryRun;

  const L = resolveLeague(args.league || "main");
  const slug = L.slug;
  const meta = { label: L.label, dir: L.dir };
  const paths = L.paths;
  const siteUrl = L.siteUrl;

  const week = parseWeek(args.week, '--week 5 --next "2026-07-26 18:00"');

  const data = loadData(paths);

  /* Don't advance into a week whose Top 25 isn't in yet — a dry run is
     just a preview, so it's allowed through to show the message.
     Applies to main only; the gate itself decides that, per league. */
  if (!dryRun) {
    const gate = top25GateError(data, week, L);
    if (gate) die(gate);
  }

  /* Advisory, not a gate: a missing previous round leaves the next
     round's bracket slots empty, which is worth saying and not worth
     blocking on. Printed for dry runs too — that's what a dry run is
     for. */
  const bowlNote = bowlWeekWarning(data, week);
  if (bowlNote) console.log(`\n  NOTE: ${bowlNote}`);

  const wk = buildWeek(data, week);
  const label = weekLabel(week);
  const statusLine = args.status || label.toUpperCase();
  /* `at` is what gets written, `text` is what gets shown. See
     resolveDeadline above for why an unparseable value stops here. */
  const { at: nextAdvanceAt, text: nextAdvance } = resolveDeadline(args, data);

  // Report before doing anything irreversible.
  console.log(`\n  ${meta.label} · ${label} — ${wk.league.length} H2H, ${wk.cpu.length} CPU, ${wk.notes.length} bye/off`);
  if (wk.missing.length) {
    console.log(`  WARNING: no week ${week} entry for: ${wk.missing.join(", ")}`);
  }

  const cfg = loadConfig();
  const built = buildMessage(data, week, wk, nextAdvance, cfg, siteUrl, slug);
  const { payload } = built;

  /* Mention health. A missing ID is silent in Discord — the name just
     renders as bold text and that coach never gets notified — so it
     has to be surfaced here or it'll go unnoticed for weeks. */
  if (built.missingMentions.length) {
    console.log(
      `  WARNING: no Discord ID for ${built.missingMentions.length} coach(es), ` +
        `they will NOT be pinged:\n    ${built.missingMentions.join(", ")}`
    );
  }
  if (built.overflowed) {
    console.log("  WARNING: message body over 2000 chars — CPU games moved to the embed,");
    console.log("           so those coaches will NOT be pinged this week.");
  }
  console.log(`  message body: ${payload.content.length}/${CONTENT_LIMIT} chars`);

  if (dryRun) {
    console.log("\n--- DRY RUN: message that would be posted ---\n");
    console.log(payload.content);
    payload.embeds[0].fields.forEach((f) => {
      console.log(`\n[${f.name}]\n${f.value}`);
    });
    console.log(
      `\n--- pings allowed: ${payload.allowed_mentions.users.length} user(s), ` +
        `${payload.allowed_mentions.roles.length} role(s) ---`
    );
    console.log("--- nothing written, nothing posted ---\n");
    return;
  }

  if (!noWrite) {
    const changed = updateSeason(paths.league, week, statusLine, nextAdvanceAt);
    console.log(
      changed
        ? `  ${meta.dir}/league-data.js updated → currentWeek ${week}, next advance "${nextAdvance}"`
        : `  ${meta.dir}/league-data.js already at week ${week} with this deadline — left as is`
    );
  }

  if (!noPost) {
    const url = webhookUrl(cfg, slug);
    if (!url) {
      die(
        `no Discord webhook configured for "${slug}".\n` +
          "  Create one in Discord: Server Settings > Integrations > Webhooks > New Webhook,\n" +
          "  pick the channel, Copy Webhook URL, then put it in tools/config.json:\n" +
          `    { "leagues": { "${slug}": { "webhookUrl": "https://discord.com/api/webhooks/..." } } }\n` +
          "  Or run with --no-post to update the site files only."
      );
    }
    await post(url, payload);
    console.log("  posted to Discord");
  }

  console.log(
    `\n  Done. Commit and push to publish:\n    git add -A && git commit -m "${meta.label}: advance to ${label}" && git push\n`
  );
}

/* ------------------------------------------------------------
   ENTRY POINT
   ------------------------------------------------------------
   Only runs the CLI when invoked directly. tools/apply.js requires
   this file for updateSeason() so an advance triggered from the
   admin page rewrites the SEASON block through the same
   brace-matched, comment-preserving surgery as one run from the
   command line — rather than a second writer that would drift.

   Note that requiring this module does NOT post to Discord: the
   webhook call lives inside main(), which no longer fires on
   import.
   ------------------------------------------------------------ */
if (require.main === module) {
  main().catch((e) => die(e.stack || e.message));
}

/* post and webhookUrl are exported so tools/apply.js (the web path)
   posts through the exact same webhook resolution and HTTP call as a
   local advance — one implementation, no drift between the two paths. */
/* makeMentioner is exported for the same reason: tools/nudge.js posts
   its own message but must resolve coach names to pings through the
   identical case-insensitive lookup and identical allowed_mentions
   allowlist. A second copy would be a second place for a missing ID to
   go unnoticed. */
module.exports = { updateSeason, buildMessage, seasonBlock, post, webhookUrl, makeMentioner };
