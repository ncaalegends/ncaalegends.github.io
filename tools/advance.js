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
     node tools/advance.js --week 5 --next "Sunday, July 26 - 6:00 PM EDT"

   FLAGS
     --week N          the week now being played (0-15). Required.
     --next "..."      advance deadline, free text. Required unless --no-post.
     --status "..."    override the hero status line. Defaults to "WEEK N".
     --dry-run         print the message, change nothing, post nothing.
     --no-post         update the data file but skip Discord.
     --no-write        post to Discord but leave the data file alone.

   WEBHOOK
     Read from env DISCORD_WEBHOOK_URL, or from tools/config.json:
       { "webhookUrl": "https://discord.com/api/webhooks/..." }
     config.json is gitignored — the URL is a secret. Anyone holding
     it can post to the channel as the bot.

   This script has no dependencies and never touches the network
   except for the single webhook POST.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const LEAGUE_FILE = path.join(ROOT, "league-data.js");
const SCHEDULE_FILE = path.join(ROOT, "schedule-data.js");
const CONFIG_FILE = path.join(__dirname, "config.json");

/* ------------------------------------------------------------
   ARGS
   ------------------------------------------------------------ */
function parseArgs(argv) {
  const out = { flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out.flags.add(key);
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function die(msg) {
  console.error(`\n  ERROR: ${msg}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------
   LOAD DATA
   ------------------------------------------------------------
   The two data files are plain top-level `const` declarations meant
   for a <script> tag. Running them in a VM context and reading the
   globals back is the least invasive way to get at them — no build
   step, no module wrapper, and the files stay exactly as the site
   expects them.
   ------------------------------------------------------------ */
function loadData() {
  const ctx = {};
  vm.createContext(ctx);
  for (const file of [LEAGUE_FILE, SCHEDULE_FILE]) {
    if (!fs.existsSync(file)) die(`missing data file: ${file}`);
    // `var` so the declarations land on the context object.
    const src = fs.readFileSync(file, "utf8").replace(/^const /gm, "var ");
    try {
      vm.runInContext(src, ctx, { filename: path.basename(file) });
    } catch (e) {
      die(`could not parse ${path.basename(file)} — ${e.message}`);
    }
  }
  return {
    SEASON: ctx.SEASON || {},
    COACHES: ctx.COACHES || [],
    TEAM_SCHEDULES: ctx.TEAM_SCHEDULES || [],
    ALIASES: ctx.SCHEDULE_TEAM_ALIASES || {},
    LEAGUE_INFO: ctx.LEAGUE_INFO || { name: "League" },
  };
}

/* ------------------------------------------------------------
   NAME RESOLUTION — mirrors script.js exactly
   ------------------------------------------------------------ */
function makeResolver({ COACHES, ALIASES }) {
  const normalize = (s) => String(s ?? "").trim().toLowerCase();

  const rosterKeys = new Set();
  COACHES.forEach((c) => {
    String(c.team)
      .split("/")
      .forEach((part) => {
        const k = normalize(part);
        if (k) rosterKeys.add(k);
      });
  });

  const rosterKeyFor = (scheduleName) => {
    const aliased = ALIASES[scheduleName];
    return aliased ? normalize(aliased) : normalize(scheduleName);
  };

  const isLeagueTeam = (n) => rosterKeys.has(rosterKeyFor(n));

  const entryFor = (n) => {
    const key = rosterKeyFor(n);
    return COACHES.find((c) =>
      String(c.team).split("/").some((part) => normalize(part) === key)
    );
  };

  const coachFor = (n) => entryFor(n)?.name || "";

  return { normalize, rosterKeyFor, isLeagueTeam, entryFor, coachFor };
}

/* ------------------------------------------------------------
   BUILD THE WEEK
   ------------------------------------------------------------
   An H2H (user vs user) game lives in BOTH coaches' schedules, so
   it has to be
   deduped down to one matchup. A CPU game only ever appears once,
   under the coach playing it.
   ------------------------------------------------------------ */
function buildWeek(data, week) {
  const R = makeResolver(data);
  const league = new Map(); // pairKey -> matchup
  const cpu = [];
  const notes = []; // byes, Army-Navy, championship weeks
  const missing = []; // coaches with no entry for this week at all

  data.TEAM_SCHEDULES.forEach((t) => {
    const entry = (t.weeks || []).find((w) => Number(w.week) === week);

    if (!entry) {
      missing.push(t.team);
      return;
    }

    if (entry.note || !entry.opponent) {
      notes.push({ team: t.team, coach: R.coachFor(t.team), note: entry.note || "No game listed" });
      return;
    }

    const home = entry.location === "at" ? entry.opponent : t.team;
    const away = entry.location === "at" ? t.team : entry.opponent;

    if (R.isLeagueTeam(entry.opponent)) {
      const pairKey = [R.rosterKeyFor(t.team), R.rosterKeyFor(entry.opponent)].sort().join("::");
      if (!league.has(pairKey)) {
        league.set(pairKey, {
          home,
          away,
          homeCoach: R.coachFor(home),
          awayCoach: R.coachFor(away),
          stadium: entry.stadium || "",
        });
      }
    } else {
      cpu.push({
        team: t.team,
        coach: R.coachFor(t.team),
        opponent: entry.opponent,
        location: entry.location,
        stadium: entry.stadium || "",
      });
    }
  });

  cpu.sort((a, b) => a.coach.localeCompare(b.coach));
  notes.sort((a, b) => a.coach.localeCompare(b.coach));

  return { league: [...league.values()], cpu, notes, missing };
}

/* ------------------------------------------------------------
   WEEK LABEL — matches the site's own naming
   ------------------------------------------------------------ */
function weekLabel(week) {
  if (week === 14) return "Week 14 (Army-Navy)";
  if (week === 15) return "Week 15 (Championships)";
  return `Week ${week}`;
}

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

function makeMentioner(cfg) {
  const ids = cfg.coaches || {};
  const missing = new Set();

  // Coach name -> "<@id>", or bold plain text when no ID is on file.
  const forCoach = (name) => {
    if (!name) return "";
    const rec = ids[name];
    const id = typeof rec === "string" ? rec : rec?.id;
    if (isSnowflake(id)) return `<@${String(id).trim()}>`;
    missing.add(name);
    return `**${name}**`;
  };

  /* Channel-wide ping. Two mutually exclusive ways to get one:
       roleMention.id        a ROLE snowflake -> <@&id>
       roleMention.everyone  the literal "@everyone" or "@here"
     A CHANNEL id is neither. <#channelId> renders a clickable link
     and notifies nobody, so it is deliberately not accepted here. */
  const roleId = String(cfg.roleMention?.id ?? "").trim();
  const blanket = String(cfg.roleMention?.everyone ?? "").trim().toLowerCase();
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
const SITE_URL = "https://ncaalegends.github.io";
const CONTENT_LIMIT = 2000;

function buildMessage(data, week, wk, nextAdvance, cfg) {
  const label = weekLabel(week);
  const M = makeMentioner(cfg);

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
          url: SITE_URL,
          color: 0xc9a227,
          description: `Full schedule, rosters, and rankings at ${SITE_URL}`,
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
function seasonBlock(src) {
  const start = src.search(/const\s+SEASON\s*=\s*\{/);
  if (start === -1) die("could not find `const SEASON = {` in league-data.js");

  const open = src.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return { open, close: i, body: src.slice(open, i + 1) };
    }
  }
  die("SEASON block in league-data.js is never closed — unbalanced braces");
}

function updateSeason(week, statusLine, nextAdvance) {
  const src = fs.readFileSync(LEAGUE_FILE, "utf8");
  const { open, close, body } = seasonBlock(src);

  let next = body;
  next = replaceOne(next, /^(\s*currentWeek:\s*)(?:"PRESEASON"|\d+)(,)/m, `$1${week}$2`, "currentWeek");
  next = replaceOne(
    next,
    /^(\s*statusLine:\s*)"[^"]*"(,)/m,
    `$1${JSON.stringify(statusLine)}$2`,
    "statusLine"
  );
  if (nextAdvance !== undefined) {
    next = replaceOne(
      next,
      /^(\s*nextAdvance:\s*)"[^"]*"(,)/m,
      `$1${JSON.stringify(nextAdvance)}$2`,
      "nextAdvance"
    );
  }

  /* No diff is a legitimate no-op, not an error: re-running the same
     week to re-post the announcement lands here every time. The
     individual replaceOne() calls above already fail loudly if a field
     is genuinely missing, so reaching this point with no change means
     the file simply already says what we want it to say. */
  if (next === body) return false;

  fs.writeFileSync(LEAGUE_FILE, src.slice(0, open) + next + src.slice(close + 1), "utf8");
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
function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch (e) {
    die(`tools/config.json is not valid JSON — ${e.message}`);
  }
}

function webhookUrl(cfg) {
  if (process.env.DISCORD_WEBHOOK_URL) return process.env.DISCORD_WEBHOOK_URL.trim();
  if (cfg.webhookUrl && !cfg.webhookUrl.includes("PASTE")) return cfg.webhookUrl.trim();
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
    die(`Discord rejected the post (HTTP ${res.status}) ${body.slice(0, 300)}`);
  }
}

/* ------------------------------------------------------------
   MAIN
   ------------------------------------------------------------ */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.flags.has("dry-run");
  const noPost = args.flags.has("no-post") || dryRun;
  const noWrite = args.flags.has("no-write") || dryRun;

  if (args.week === undefined) die('missing --week. Example: --week 5 --next "Sunday 6PM EDT"');
  const week = Number(args.week);
  if (!Number.isInteger(week) || week < 0 || week > 15) die(`--week must be 0-15, got "${args.week}"`);

  const data = loadData();
  const wk = buildWeek(data, week);
  const label = weekLabel(week);
  const statusLine = args.status || label.toUpperCase();
  const nextAdvance = args.next !== undefined ? args.next : data.SEASON.nextAdvance;

  // Report before doing anything irreversible.
  console.log(`\n  ${label} — ${wk.league.length} H2H, ${wk.cpu.length} CPU, ${wk.notes.length} bye/off`);
  if (wk.missing.length) {
    console.log(`  WARNING: no week ${week} entry for: ${wk.missing.join(", ")}`);
  }

  const cfg = loadConfig();
  const built = buildMessage(data, week, wk, nextAdvance, cfg);
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
    const changed = updateSeason(week, statusLine, nextAdvance);
    console.log(
      changed
        ? `  league-data.js updated → currentWeek ${week}, next advance "${nextAdvance}"`
        : `  league-data.js already at week ${week} with this deadline — left as is`
    );
  }

  if (!noPost) {
    const url = webhookUrl(cfg);
    if (!url) {
      die(
        "no Discord webhook configured.\n" +
          "  Create one in Discord: Server Settings > Integrations > Webhooks > New Webhook,\n" +
          "  pick the channel, Copy Webhook URL, then put it in tools/config.json:\n" +
          '    { "webhookUrl": "https://discord.com/api/webhooks/..." }'
      );
    }
    await post(url, payload);
    console.log("  posted to Discord");
  }

  console.log(
    `\n  Done. Commit and push to publish:\n    git add -A && git commit -m "Advance to ${label}" && git push\n`
  );
}

main().catch((e) => die(e.stack || e.message));
