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
   and enforces its own limits anyway. In particular ALLOWED_LEAGUES
   is hardcoded, so no payload — however it got here — can write to
   the main dynasty.
   ============================================================ */

const fs = require("fs");
const path = require("path");

const { die, resolveLeague, loadData, buildWeek, weekLabel } = require("./lib/league");
const { applyScores, parseSet, scoreableGames } = require("./scores");
const { updateSeason } = require("./advance");

/* ------------------------------------------------------------
   LIMITS
   ------------------------------------------------------------
   Deliberately hardcoded rather than configurable. Each one is a
   ceiling no legitimate submission comes close to.
   ------------------------------------------------------------ */
const ALLOWED_LEAGUES = ["1star", "3star"];
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
  if (!ALLOWED_LEAGUES.includes(league)) {
    /* The main dynasty is intentionally not reachable from the web
       path. It has a Discord announcement step and a commissioner
       who already has the local tools; there's no reason to expose
       it, so it can't be reached even by a valid access code. */
    bad(
      `league "${league}" cannot be updated this way. ` +
        `Allowed: ${ALLOWED_LEAGUES.join(", ")}`
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

function doAdvance(p, L) {
  const data = loadData(L.paths);
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
    console.log(`\n  ${L.dir}/league-data.js already said that. Nothing to write.\n`);
    return { changed: false };
  }

  console.log(`\n  ${L.dir}/league-data.js updated — week ${p.week}, next "${next}".\n`);

  /* No Discord post. Neither of these leagues has a webhook
     configured yet; when one does, this is where the call goes —
     see the note in worker/ADMIN-SETUP.md. */
  return {
    changed: true,
    commit: `${L.label}: advance to ${weekLabel(p.week)} (via ${p.actor})`,
    summary: `Advanced to ${weekLabel(p.week)}, next deadline "${next}"`,
  };
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
function main() {
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

  const result = p.action === "scores" ? doScores(p, L) : doAdvance(p, L);
  emit(result);
}

if (require.main === module) {
  main();
}

module.exports = { validate, ALLOWED_LEAGUES };
