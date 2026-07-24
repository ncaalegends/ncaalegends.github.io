#!/usr/bin/env node
/* ============================================================
   APPLY — run one admin-page submission
   ------------------------------------------------------------
   The bridge between the web admin page and the existing tools.
   Reads a JSON payload from disk and performs exactly one action:
   record scores, or advance the week.

     node tools/apply.js payload.json

   NOTHING IS REIMPLEMENTED HERE. Scores go through scores.js's
   own parseSet() and applyScores(); the advance goes through
   advance.js's updateSeason(). This file is validation and
   plumbing, so a score submitted from a phone hits the same
   guardrails as one typed at the prompt — the tie check, the
   ambiguous-name check, the bye check, all of it.

   WHY THE PAYLOAD IS A FILE AND NOT ARGUMENTS
   It arrives from the internet. Interpolating attacker-influenced
   text into a shell command line in a workflow YAML is how you get
   command injection; the workflow writes it to a file straight
   from an environment variable and passes only the filename.

   TRUST MODEL
   Everything below re-validates from scratch. The Worker already
   checked the caller's access code and which leagues they may
   touch, but this script assumes the payload could be arbitrary
   and enforces its own limits anyway. In particular the league
   allow-lists are hardcoded, so no payload — however it got here —
   can perform an action against a league it isn't cleared for.

   ALL THREE LEAGUES ADVANCE — AND POST — FROM THE WEB
   Every league (main included) can now be both scored and advanced
   from the admin page. An advance rewrites SEASON and then posts the
   week announcement to that league's Discord channel, exactly as a
   local advance.cmd run would. The webhooks and coach mention IDs
   reach this runner through the DISCORD_CONFIG repo secret, which the
   workflow writes to tools/config.json before this script runs (see
   worker/ADMIN-SETUP.md). The two league lists below are kept
   separate so a future league can be scores-only again without
   reworking the checks — today they hold the same three leagues.
   ============================================================ */

const fs = require("fs");
const path = require("path");

const {
  die,
  resolveLeague,
  loadData,
  buildWeek,
  weekLabel,
  top25GateError,
  loadConfig,
} = require("./lib/league");
const { applyScores, parseSet, scoreableGames } = require("./scores");
const { updateSeason, buildMessage, post, webhookUrl } = require("./advance");

/* ------------------------------------------------------------
   LIMITS
   ------------------------------------------------------------
   Deliberately hardcoded rather than configurable. Each one is a
   ceiling no legitimate submission comes close to.
   ------------------------------------------------------------ */
/* Which leagues each action may touch. Both actions now cover all
   three leagues: the web advance posts to Discord just like the local
   tool, so main no longer has to stay behind. The lists are kept
   separate (rather than collapsed to one) so a league can be made
   scores-only again later by dropping it from ADVANCE_LEAGUES alone. */
const SCORE_LEAGUES = ["1star", "3star", "main"];
const ADVANCE_LEAGUES = ["1star", "3star", "main"];

/* Everything the web path can reach at all — the union, used only
   for the "is this even a web league" check and error text. */
const ALLOWED_LEAGUES = [...new Set([...SCORE_LEAGUES, ...ADVANCE_LEAGUES])];

function leaguesForAction(action) {
  return action === "advance" ? ADVANCE_LEAGUES : SCORE_LEAGUES;
}

const MAX_ENTRIES = 40; // a 16-team league has at most ~16 games/week
const MAX_TEAM_LEN = 120;
const MAX_TEXT_LEN = 120;

/* Deadline and status strings are written into league-data.js and
   rendered on the site. Both of those paths are already safe —
   updateSeason() runs the value through JSON.stringify() so it
   can't break out of the string literal, and script.js escapes it
   through esc() before it reaches innerHTML. This allowlist is a
   third layer, and it's here because the cost is one regex and the
   failure it prevents is someone pasting markup into a field that
   ends up in a file no one re-reads. */
const SAFE_TEXT = /^[\p{L}\p{N} .,:;·—–\-()&/'+!?]*$/u;

/* ------------------------------------------------------------
   VALIDATION
   ------------------------------------------------------------ */
function bad(msg) {
  die(`payload rejected — ${msg}`);
}

function requireString(value, field, max) {
  if (typeof value !== "string") bad(`${field} must be a string`);
  const v = value.trim();
  if (!v) bad(`${field} is empty`);
  if (v.length > max) bad(`${field} is longer than ${max} characters`);
  return v;
}

function requireSafeText(value, field) {
  const v = requireString(value, field, MAX_TEXT_LEN);
  if (!SAFE_TEXT.test(v)) {
    bad(`${field} contains characters that aren't allowed (letters, numbers and basic punctuation only)`);
  }
  return v;
}

function validate(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    bad("expected a JSON object");
  }

  const action = payload.action;
  if (action !== "scores" && action !== "advance") {
    bad(`unknown action "${action}" — expected "scores" or "advance"`);
  }

  const league = payload.league;
  const permitted = leaguesForAction(action);
  if (!permitted.includes(league)) {
    bad(
      `league "${league}" cannot be ${action === "advance" ? "advanced" : "scored"} ` +
        `this way. Allowed: ${permitted.join(", ")}`
    );
  }

  const week = Number(payload.week);
  if (!Number.isInteger(week) || week < 0 || week > 15) {
    bad(`week must be a whole number 0-15, got ${JSON.stringify(payload.week)}`);
  }

  /* Recorded for the commit message and the Actions log. This is the
     entire audit trail, which is why the codes are per-person. */
  const actor = requireSafeText(payload.actor || "unknown", "actor");

  const out = { action, league, week, actor };

  if (action === "scores") {
    const entries = payload.entries;
    if (!Array.isArray(entries) || entries.length === 0) {
      bad("scores payload has no entries");
    }
    if (entries.length > MAX_ENTRIES) {
      bad(`${entries.length} entries is more than the ${MAX_ENTRIES} allowed in one submission`);
    }
    out.entries = entries.map((e, i) => {
      if (!e || typeof e !== "object") bad(`entry ${i + 1} is not an object`);
      const team = requireString(e.team, `entry ${i + 1} team`, MAX_TEAM_LEN);
      const score = requireString(e.score, `entry ${i + 1} score`, 16);
      if (!/^\d{1,3}\s*[-:\s]\s*\d{1,3}$/.test(score)) {
        bad(`entry ${i + 1} score "${score}" isn't in the form 27-24`);
      }
      const rec = { team, score };
      /* Optional: marks a game as a force-sim / forfeit. Passed
         through to the writer, which records it but keeps the result
         out of the power rankings. Only H2H rows send it. */
      if (e.sim !== undefined) {
        if (typeof e.sim !== "boolean") bad(`entry ${i + 1} sim must be true or false`);
        rec.sim = e.sim;
      }
      return rec;
    });
    out.force = payload.force === true;
  }

  if (action === "advance") {
    /* The admin page asks twice before sending. This flag is the
       server-side half of that: a payload that never passed the
       confirmation step is not an advance. */
    if (payload.confirm !== true) {
      bad("advance requires an explicit confirmation");
    }
    out.next = payload.next === undefined ? undefined : requireSafeText(payload.next, "next");
    out.status = payload.status === undefined ? undefined : requireSafeText(payload.status, "status");
  }

  return out;
}

/* ------------------------------------------------------------
   ACTIONS
   ------------------------------------------------------------ */
function doScores(p, L) {
  const data = loadData(L.paths);
  if (!data.TEAM_SCHEDULES.length) {
    die(`${L.dir}/schedule-data.js has no schedules yet, so there's nothing to score.`);
  }

  const wk = buildWeek(data, p.week);
  const games = scoreableGames(wk);
  if (!games.length) {
    die(`no games to score in ${weekLabel(p.week).toLowerCase()} for ${L.label}.`);
  }

  const edits = [];
  const answered = [];

  for (const entry of p.entries) {
    /* parseSet is the CLI's own parser. Handing it the same
       "Team 27-24" string the command line would use means the
       web path inherits every check it does: unknown name,
       ambiguous name, naming a CPU opponent instead of the
       coach's team, and flipping the score when the caller named
       the other side of the matchup. */
    const r = parseSet(`${entry.team} ${entry.score}`, games, p.week, data, entry.sim);

    if (r.game.scored && !p.force) {
      die(
        `${r.game.label} is already final (${r.game.scored}).\n` +
          `  The admin page should have asked before sending this.`
      );
    }

    edits.push(...r.edits);
    answered.push(r.summary);
  }

  const result = applyScores(L.paths.schedule, edits);

  console.log(`\n  ${L.label} · ${weekLabel(p.week)} — ${answered.length} game(s) by ${p.actor}:\n`);
  answered.forEach((a) => console.log(`    ${a}`));

  if (!result.applied.length) {
    console.log(`\n  Every entry already read that way. Nothing to write.\n`);
    return { changed: false };
  }

  result.write();
  console.log(`\n  ${L.dir}/schedule-data.js updated — ${result.applied.length} entries.\n`);

  return {
    changed: true,
    commit: `${L.label}: ${weekLabel(p.week)} scores (via ${p.actor})`,
    summary: answered.join("; "),
  };
}

async function doAdvance(p, L) {
  const data = loadData(L.paths);

  /* Block advancing into a week whose Top 25 isn't transcribed yet.
     A no-op for leagues that don't run a poll (TOP25 empty). This gate
     stays exactly as it was — an advance still can't jump ahead of the
     new week's poll, main included. */
  const gate = top25GateError(data, p.week);
  if (gate) die(gate);

  const status = p.status || `WEEK ${p.week}`;

  /* Carry the existing deadline over when none was given, matching
     advance.js's behaviour rather than blanking the badge. */
  const next = p.next === undefined ? data.SEASON.nextAdvance : p.next;

  const changed = updateSeason(L.paths.league, p.week, status, next);

  const wk = buildWeek(data, p.week);
  console.log(
    `\n  ${L.label} → ${weekLabel(p.week)} by ${p.actor} — ` +
      `${wk.league.length} H2H, ${wk.cpu.length} CPU, ${wk.notes.length} bye/off`
  );
  if (wk.missing.length) {
    console.log(`  WARNING: no week ${p.week} entry for: ${wk.missing.join(", ")}`);
  }

  if (!changed) {
    /* The file already said this — a re-run. Don't re-post: the commit
       step is skipped on no-change, and a spurious second announcement
       is worse than silence. */
    console.log(`\n  ${L.dir}/league-data.js already said that. Nothing to write, nothing posted.\n`);
    return { changed: false };
  }

  console.log(`\n  ${L.dir}/league-data.js updated — week ${p.week}, next "${next}".\n`);

  /* Announce it in Discord — the same message a local advance.cmd run
     posts, through advance.js's buildMessage/post. The webhooks and
     coach IDs arrive on the runner via the DISCORD_CONFIG repo secret
     (written to tools/config.json before this runs). A failure here is
     logged loudly but does NOT fail the run: the site advance has been
     written and must not be lost to a Discord outage. */
  const announced = await announce(p, L, data, wk, next);

  return {
    changed: true,
    commit: `${L.label}: advance to ${weekLabel(p.week)} (via ${p.actor})`,
    summary: `Advanced to ${weekLabel(p.week)}, next deadline "${next}"${announced.note}`,
  };
}

/* ------------------------------------------------------------
   DISCORD ANNOUNCEMENT (web path)
   ------------------------------------------------------------
   Builds and posts the week announcement using advance.js's exact
   buildMessage + post, so the web advance and a local advance produce
   the identical message with the identical mentions. Never throws:
   returns a short note appended to the workflow summary so the outcome
   is visible in the Actions run, whatever happened.
   ------------------------------------------------------------ */
async function announce(p, L, data, wk, next) {
  const cfg = loadConfig();
  const url = webhookUrl(cfg, L.slug);

  if (!url) {
    /* No webhook on the runner — usually the DISCORD_CONFIG secret
       isn't set yet. The advance itself is fine; only the ping is
       missing, so say so and move on rather than failing. */
    console.log(
      `  no Discord webhook for "${L.slug}" on the runner — advanced without announcing. ` +
        `Set the DISCORD_CONFIG repo secret to enable it (see worker/ADMIN-SETUP.md).`
    );
    return { note: " — NOT announced (no webhook on runner)" };
  }

  const built = buildMessage(data, p.week, wk, next, cfg, L.siteUrl);

  /* Same health warnings the CLI prints. A missing ID pings nobody and
     is silent in Discord, so it has to surface in the run log. */
  if (built.missingMentions.length) {
    console.log(
      `  WARNING: no Discord ID for ${built.missingMentions.length} coach(es), ` +
        `they will NOT be pinged: ${built.missingMentions.join(", ")}`
    );
  }
  if (built.overflowed) {
    console.log(
      "  WARNING: message body over 2000 chars — CPU games moved to the embed, " +
        "so those coaches will NOT be pinged this week."
    );
  }

  try {
    await post(url, built.payload);
    console.log("  posted the advance announcement to Discord.");
    return { note: " · announced in Discord" };
  } catch (e) {
    /* Deliberately non-fatal: the season file is already written and
       will be committed. Surface the failure so it can be re-posted by
       hand (advance.js --no-write), but keep the advance. */
    console.error(`  WARNING: Discord announcement FAILED — ${e.message}`);
    console.error(
      "  The site advance still stands. Re-post with:\n" +
        `    node tools/advance.js --league ${L.slug} --week ${p.week} --no-write`
    );
    return { note: " · Discord announcement FAILED (see Actions log)" };
  }
}

/* ------------------------------------------------------------
   OUTPUT FOR THE WORKFLOW
   ------------------------------------------------------------
   The workflow needs to know whether to commit and what to say in
   the message. Written to $GITHUB_OUTPUT when running in Actions,
   ignored entirely when run by hand.
   ------------------------------------------------------------ */
function emit(result) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;

  /* Heredoc form — the summary can contain anything, including the
     "=" that the key=value form would choke on. */
  const lines = [
    `changed=${result.changed ? "true" : "false"}`,
    `commit_message<<PAYLOAD_EOF\n${result.commit || ""}\nPAYLOAD_EOF`,
    `summary<<PAYLOAD_EOF\n${result.summary || ""}\nPAYLOAD_EOF`,
  ];
  fs.appendFileSync(file, lines.join("\n") + "\n", "utf8");
}

/* ------------------------------------------------------------
   MAIN
   ------------------------------------------------------------ */
async function main() {
  const file = process.argv[2];
  if (!file) die("usage: node tools/apply.js <payload.json>");

  const full = path.resolve(file);
  if (!fs.existsSync(full)) die(`payload file not found: ${full}`);

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (e) {
    die(`payload is not valid JSON — ${e.message}`);
  }

  const p = validate(raw);
  const L = resolveLeague(p.league);

  const result = p.action === "scores" ? doScores(p, L) : await doAdvance(p, L);
  emit(result);
}

if (require.main === module) {
  main().catch((e) => die(e.stack || e.message));
}

module.exports = { validate, ALLOWED_LEAGUES };
