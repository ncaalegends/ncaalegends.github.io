#!/usr/bin/env node
/* ============================================================
   APPLY — run one admin-page submission
   ------------------------------------------------------------
   The bridge between the web admin page and the existing tools.
   Reads a JSON payload from disk and performs exactly one action:
   record scores, or advance the week.

     node tools/apply.js payload.json

   NOTHING IS REIMPLEMENTED HERE. Scores go through score-core's
   resolveEntries() and scores.js's applyScores(); the advance goes
   through advance.js's updateSeason(). This file is validation and
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

const Deadline = require("../deadline");

const {
  die,
  resolveLeague,
  loadData,
  buildWeek,
  weekLabel,
  FINAL_WEEK,
  top25GateError,
  isSentinel,
  seasonIndex,
  loadVacations,
  writeVacations,
  allRosterNames,
  leaguesForCoach,
} = require("./lib/league");

/* The vacation rules — active/upcoming, the sanity checks on a
   submitted range, and the append-or-correct merge. Same file the
   site and tools/nudge.js read them from, so a range the page
   accepted can't be one this rejects. */
const Vac = require("../vacation-core");
const { applyScores, scoreableGames } = require("./scores");
const { resolveEntries, ScoreError } = require("../score-core");
const { updateSeason, buildMessage, post, webhookUrl, makeMentioner } = require("./advance");

/* The rollover itself — archive, verify, reset — lives in
   tools/rollover.js and is called, never reimplemented. Its header
   explains at length why the archive-then-reset ORDER is the whole
   safety property; a second copy of that sequence here would be a
   second chance to get it backwards. */
const { runRollover } = require("./rollover");

/* The next playoff round's schedule rows — see tools/bracket-sync.js.
   Called, never reimplemented, for the same reason as the rollover:
   the pairing arithmetic and the two-source winner lookup already
   exist in one place and have to keep agreeing with the bracket the
   site draws. */
const { syncRound, syncSummary, BracketSyncError, ROUND_FOR_WEEK } = require("./bracket-sync");

/* ------------------------------------------------------------
   THE BOWL-WEEK ROWS
   ------------------------------------------------------------
   A playoff game between two coached teams only becomes enterable
   once it exists as a row on both coaches' schedules, and until this
   ran on the web path, nothing created those rows unless someone
   remembered to run bracket-sync.js from a laptop. When they didn't,
   the postseason stalled in the least obvious way available: the
   admin page offered no games to score, so the round couldn't be
   recorded, so the bracket couldn't advance, so the round after it
   had no rows either.

   So every web advance INTO a bowl week now derives that round, and
   every score entered during one re-derives the current round — which
   is what catches a result that lands after the advance rather than
   before it. Re-running is silent by design (bracket-sync never
   touches a row that exists), so calling it on every pass costs
   nothing and removes the "did anyone remember?" question entirely.

   NOTHING HERE MAY FAIL AN ADVANCE. By the time this is reached the
   season file is written and the announcement is about to go out; a
   bracket that can't be read yet — still projected, not entered,
   half a round short — is a warning in the Actions log and a row
   someone adds by hand, never a lost advance. That is why syncRound
   throws where the CLI would exit.
   ------------------------------------------------------------ */
function syncBracketRows(L, week) {
  const w = seasonIndex(week);
  if (!ROUND_FOR_WEEK[w]) return null; // not a bowl week — nothing to derive

  let result;
  try {
    result = syncRound({ L, week: w });
  } catch (e) {
    if (!(e instanceof BracketSyncError)) throw e;
    console.error(`\n  WARNING: could not derive the ${weekLabel(w).toLowerCase()} matchups — ${e.message}`);
    console.error(
      "  The submission still stands. Add the rows by hand once the bracket is readable:\n" +
        `    node tools/bracket-sync.js --league ${L.slug} --week ${w}`
    );
    return null;
  }

  result.lines.forEach((l) => console.log(l ? "  " + l : ""));
  return result;
}

/* Read tools/config.json (which on the Actions runner IS the
   DISCORD_CONFIG secret, written there by the workflow) WITHOUT the
   hard-exit that lib/league's loadConfig() does on bad JSON. Returns
   null on a missing or unparseable file so the caller can degrade to
   "advanced, didn't announce" instead of failing the whole advance.
   The local advance.js path keeps using loadConfig() and its clean
   error, since a broken config there is worth stopping for. */
function loadDiscordConfig() {
  const file = path.join(__dirname, "config.json");
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`  WARNING: tools/config.json is not valid JSON — ${e.message}`);
    console.error("  Check the DISCORD_CONFIG repo secret. Advancing without announcing.");
    return null;
  }
}

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

/* Which leagues may be ROLLED OVER from the web — the once-a-year
   action that archives a finished season and starts the next one.
   Its own list rather than a reuse of ADVANCE_LEAGUES: an ordinary
   advance rewrites four fields, and this writes a permanent archive,
   so "may advance" and "may end the season" are worth being separate
   answers even while they hold the same three leagues. */
const ROLLOVER_LEAGUES = ["1star", "3star", "main"];

/* Everything the web path can reach at all — the union, used only
   for the "is this even a web league" check and error text. */
const ALLOWED_LEAGUES = [
  ...new Set([...SCORE_LEAGUES, ...ADVANCE_LEAGUES, ...ROLLOVER_LEAGUES]),
];

function leaguesForAction(action) {
  if (action === "advance") return ADVANCE_LEAGUES;
  if (action === "rollover") return ROLLOVER_LEAGUES;
  return SCORE_LEAGUES;
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

/* ------------------------------------------------------------
   VACATION SUBMISSIONS
   ------------------------------------------------------------
   The only action that can arrive from someone with no access
   code — the vacation page is open, exactly as the Google Form it
   replaces was. Two things make that safe enough to be worth the
   convenience:

   The name is checked against the union of all three rosters, so
   the endpoint can't be used to write arbitrary text into a file
   the site loads. And nothing here can DELETE: `remove` is
   refused for a self-service submission and only reaches this
   file from the admin page, behind a code.

   The worst a stranger who finds the endpoint can do is claim a
   real coach is on holiday, which is visible on the site within a
   minute, in the daily nudge the next morning, and undoable by any
   commissioner. That's a good trade for not making 32 people
   remember a code to say they're going away for the weekend.
   ------------------------------------------------------------ */
function validateVacation(payload) {
  const actor = requireSafeText(payload.actor || "unknown", "actor");

  const op = payload.op === undefined ? "add" : payload.op;
  if (op !== "add" && op !== "remove") {
    bad(`vacation op must be "add" or "remove", got ${JSON.stringify(payload.op)}`);
  }
  if (op === "remove" && payload.selfService === true) {
    /* The Worker hardcodes op:"add" on the open route, so this can
       only fire if that ever changes. Belt and braces: a deletion
       must carry a code, and this file is where that is true
       regardless of how the payload got here. */
    bad("removing a vacation needs a commissioner code");
  }

  const coach = requireString(payload.coach, "coach", 40);
  const start = requireString(payload.start, "start", 10);
  const end = requireString(payload.end, "end", 10);

  /* Removing is checked more loosely than adding, on purpose. An
     entry that's already over, or one for a coach who has since left
     the league, must still be removable — otherwise a mistake becomes
     permanent the moment either of those is true. */
  const known = allRosterNames();

  const problem =
    op === "add"
      ? Vac.validate({ coach, start, end }, { known })
      : Vac.isDay(start) && Vac.isDay(end)
      ? null
      : "dates must be YYYY-MM-DD";
  if (problem) bad(problem);

  /* Store the ROSTER'S spelling, not the submitted one. Matching is
     case-insensitive everywhere, so "salzy" would work fine — but it
     would be rendered on the site as "salzy" next to a roster card
     that says "Salzy", which looks like two people. Only `add` needs
     this: a removal is matched, not stored. */
  const canonical = known.find((n) => Vac.key(n) === Vac.key(coach));

  return {
    action: "vacation",
    op,
    coach: op === "add" && canonical ? canonical : coach,
    start,
    end,
    actor,
  };
}

function validate(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    bad("expected a JSON object");
  }

  const action = payload.action;
  if (
    action !== "scores" &&
    action !== "advance" &&
    action !== "vacation" &&
    action !== "rollover"
  ) {
    bad(
      `unknown action "${action}" — expected "scores", "advance", "rollover" or "vacation"`
    );
  }

  /* A VACATION HAS NO LEAGUE AND NO WEEK, so it branches out before
     either is required. That isn't a special case being carved out —
     it's the design: a vacation is a fact about a person, and which
     dynasties it applies to is derived from the rosters at read time
     rather than submitted. See the header of /vacations.js. */
  if (action === "vacation") return validateVacation(payload);

  const league = payload.league;
  const permittedForLeague = leaguesForAction(action);

  /* A ROLLOVER HAS A LEAGUE BUT NO WEEK. It doesn't move the season
     along the axis, it ends the axis: 2026 is copied into
     seasons/2026/ and the live folder starts again at "PRESEASON".
     So it branches out above the week checks, the same way a vacation
     branches out above the league checks. */
  if (action === "rollover") {
    if (!permittedForLeague.includes(league)) {
      bad(`league "${league}" cannot be rolled over this way. Allowed: ${permittedForLeague.join(", ")}`);
    }
    if (payload.confirm !== true) {
      bad("rollover requires an explicit confirmation");
    }

    /* THE YEAR IS SENT BACK, AND IT IS A LOCK, NOT A LABEL. The admin
       page reads SEASON.year out of the published league-data.js and
       returns it here; if the two disagree, the page was looking at a
       different season than the one on disk — a stale tab, or a
       rollover that already ran — and the submission is refused rather
       than archiving a year nobody meant. This is the one field that
       makes a double-click on a once-a-year button safe. */
    const year = payload.year;
    if (!Number.isInteger(year) || year < 2000 || year > 2200) {
      bad(`rollover year must be a whole year like 2026, got ${JSON.stringify(payload.year)}`);
    }

    /* The web equivalent of --force. rollover.js prints its readiness
       notes and refuses without it; the admin page shows the same
       notes and makes the commissioner tick a box, so an unfinished
       season can still be archived deliberately and never by accident. */
    if (payload.force !== undefined && typeof payload.force !== "boolean") {
      bad("rollover force must be true or false");
    }

    return {
      action,
      league,
      year,
      force: payload.force === true,
      actor: requireSafeText(payload.actor || "unknown", "actor"),
    };
  }
  const permitted = leaguesForAction(action);
  if (!permitted.includes(league)) {
    bad(
      `league "${league}" cannot be ${action === "advance" ? "advanced" : "scored"} ` +
        `this way. Allowed: ${permitted.join(", ")}`
    );
  }

  /* 0-15 is the regular season and the conference championships;
     16-19 are Bowl Weeks 1-4. The cap used to be 15, which silently
     made the postseason unreachable from the admin page: the Worker
     accepts 0-19 and the page offers a bowl week, so the payload
     passed every check up to here and then died on the runner. The
     bound belongs to week-core, not to a number typed in twice. */
  /* "OFFSEASON" is the exception, and only for an advance. It is the
     held state after the national championship — a real advance with
     a real announcement, but not a week, so there is nothing in it to
     score. The sentinel list lives in lib/league.js; isSentinel() is
     the same test parseWeek() applies to --week on the command line,
     so the web and the CLI can't disagree about what the word means. */
  let week;
  if (action === "advance" && isSentinel(payload.week)) {
    week = String(payload.week).trim().toUpperCase();
  } else {
    week = Number(payload.week);
    if (!Number.isInteger(week) || week < 0 || week > FINAL_WEEK) {
      bad(
        `week must be a whole number 0-${FINAL_WEEK}` +
          (action === "advance" ? ` or OFFSEASON` : ``) +
          `, got ${JSON.stringify(payload.week)}`
      );
    }
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
    /* THE DEADLINE ARRIVES AS A DATE, NOT A SENTENCE.
       The admin page sends `nextAt` — "2026-08-14T18:00:00-04:00",
       or a bare "2026-08-14" for a league that shows a day and no
       time. The sentence coaches read is generated from it further
       down, by the same code the command-line tool uses.

       Rejecting an unparseable value outright is the point: storing
       one would leave the site showing a deadline that no tool can
       read, and the advance-day heads-up would stop firing with
       nothing to say why. Anything not understood fails the
       submission loudly instead.

       `next` (free text) is still accepted from an older admin page
       that hasn't been reloaded since this changed, but only to be
       reinterpreted as a date — the same rule, not a bypass. */
    const rawAt = payload.nextAt !== undefined ? payload.nextAt : payload.next;
    if (rawAt === undefined) {
      out.nextAt = undefined;
    } else if (typeof rawAt === "string" && rawAt.trim() === "") {
      /* An EXPLICIT EMPTY STRING CLEARS THE BADGE — the same
         "deliberate clear" the CLI's --next "" performs. The offseason
         is what it exists for: advances during the hold are announced
         in Discord, so the site has nothing to count down to, and
         carrying the title game's deadline forward would leave a dead
         date on the hero for weeks. Undefined still means "carry the
         existing one over"; the two are not the same answer. */
      out.nextAt = "";
    } else {
      const at = requireString(rawAt, "nextAt", 40);
      const stored = Deadline.canonical(at);
      if (stored === null) {
        bad(
          `deadline ${JSON.stringify(at)} isn't a date — expected 2026-08-14T18:00:00-04:00 ` +
            `or 2026-08-14`
        );
      }
      out.nextAt = stored;
    }
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

  /* score-core's resolveEntries is the same code the command line
     reaches through parseSet and the same code the Worker checks
     against before it dispatches. That's what makes a score
     submitted from a phone hit every guardrail one typed at the
     prompt does: unknown name, ambiguous name, naming a CPU
     opponent instead of the coach's team, flipping the score when
     the caller named the far side of the matchup, and refusing to
     silently overwrite a game that's already final.

     This used to reconstruct a "Team 27-24" string and hand it to
     the CLI's own --set parser, purely to reach that logic. The
     entries arrive structured; taking them apart into a string so
     something else could take the string apart again was a seam
     where a team name with a trailing number could go wrong. */
  let resolved;
  try {
    resolved = resolveEntries(p.entries, games, p.week, data, p.force);
  } catch (e) {
    if (!(e instanceof ScoreError)) throw e;
    if (e.code === "already-scored") {
      die(`${e.message}\n  The admin page should have asked before sending this.`);
    }
    die(e.message);
  }

  const { edits, answered } = resolved;
  const result = applyScores(L.paths.schedule, edits);

  console.log(`\n  ${L.label} · ${weekLabel(p.week)} — ${answered.length} game(s) by ${p.actor}:\n`);
  answered.forEach((a) => console.log(`    ${a}`));

  if (!result.applied.length) {
    console.log(`\n  Every entry already read that way. Nothing to write.\n`);
    return { changed: false };
  }

  result.write();
  console.log(`\n  ${L.dir}/schedule-data.js updated — ${result.applied.length} entries.\n`);

  /* A score can complete a playoff round AFTER the advance into the
     next one has already happened — the last quarterfinal reported a
     day late is the ordinary case, not a strange one. So re-derive
     the round the league is currently in, which is a no-op every
     other time and the thing that unsticks the postseason on the
     occasion it isn't. The week just scored is deliberately not what
     is derived: its rows are what these scores landed on. */
  const synced = syncBracketRows(L, data.SEASON && data.SEASON.currentWeek);
  const syncNote = syncSummary(synced);

  return {
    changed: true,
    commit: `${L.label}: ${weekLabel(p.week)} scores (via ${p.actor})`,
    summary: answered.join("; ") + (syncNote ? ` · ${syncNote}` : ""),
  };
}

async function doAdvance(p, L) {
  let data = loadData(L.paths);

  /* Block advancing into a week whose Top 25 isn't transcribed yet.
     Main only, and a no-op for a league that hasn't started a poll —
     the gate decides that per league, so this behaves identically to
     the local advance.js path. Passing L is what makes 3-star and
     1-star advance from the admin page without waiting on a
     screenshot. */
  /* THE OFFSEASON IS NOT A WEEK, so neither the gate nor buildWeek
     applies to it — the poll gate would demand a CFP Top 25 that
     stopped being published in December, and buildWeek would report
     every coach as missing an entry for a phase that has no entries
     to miss. Same two exemptions advance.js makes on the CLI path;
     see the sentinel branch there. */
  const sentinel = isSentinel(p.week);

  if (!sentinel) {
    const gate = top25GateError(data, p.week, L);
    if (gate) die(gate);
  }

  /* weekLabel(), not `WEEK n` — a bowl week's status line reads
     "BOWL WEEK 1 (CFP FIRST ROUND)", which is what advance.js writes
     and what the badge on the site expects. The old fallback would
     have published "WEEK 16". */
  const label = sentinel ? "the Offseason" : weekLabel(p.week);
  /* Bare "OFFSEASON" rather than "THE OFFSEASON" — same default the
     CLI writes, and the field a per-step line like
     "OFFSEASON · SIGNING DAY" is later hand-edited into. */
  const status = p.status || (sentinel ? p.week : label.toUpperCase());

  /* Carry the existing deadline over when none was given, matching
     advance.js's behaviour rather than blanking the badge. `at` is
     what gets stored; `next` is the generated sentence, used for the
     Discord message and the run summary. */
  const at = p.nextAt === undefined ? data.SEASON.nextAdvanceAt ?? "" : p.nextAt;
  const next = at ? Deadline.formatDeadline(at) : "";

  const changed = updateSeason(L.paths.league, p.week, status, p.nextAt);

  /* The next playoff round's rows, BEFORE the week is built — the
     announcement's whole job is to tell four coaches who they play,
     and rows written after buildWeek would be rows nobody is told
     about until the following advance. A no-op outside weeks 16-19
     and on any bowl week whose rows are already there. */
  const synced = sentinel ? null : syncBracketRows(L, p.week);
  if (synced && synced.written.length) data = loadData(L.paths);
  const syncNote = syncSummary(synced);

  const wk = sentinel
    ? { league: [], cpu: [], notes: [], missing: [] }
    : buildWeek(data, p.week);
  console.log(
    `\n  ${L.label} → ${label} by ${p.actor} — ` +
      `${wk.league.length} H2H, ${wk.cpu.length} CPU, ${wk.notes.length} bye/off`
  );
  if (wk.missing.length) {
    console.log(`  WARNING: no week ${p.week} entry for: ${wk.missing.join(", ")}`);
  }

  if (!changed) {
    /* The file already said this — a re-run. Don't re-post: a spurious
       second announcement is worse than silence.

       The rows are the exception. Re-submitting the advance is the
       obvious thing to do when a bowl week's matchups never appeared,
       and it used to be the one thing that couldn't help: no change to
       league-data.js meant changed=false meant the workflow skipped
       the commit and threw the rows away. So a sync that wrote
       something is a change worth committing on its own, quietly. */
    if (synced && synced.written.length) {
      console.log(`\n  ${L.dir}/league-data.js already said that — committing the bracket rows only.\n`);
      return {
        changed: true,
        commit: `${L.label}: ${label} matchups (via ${p.actor})`,
        summary: syncNote,
      };
    }
    console.log(`\n  ${L.dir}/league-data.js already said that. Nothing to write, nothing posted.\n`);
    return { changed: false };
  }

  console.log(`\n  ${L.dir}/league-data.js updated — ${label}, next "${next}".\n`);

  /* Announce it in Discord — the same message a local advance.cmd run
     posts, through advance.js's buildMessage/post. The webhooks and
     coach IDs arrive on the runner via the DISCORD_CONFIG repo secret
     (written to tools/config.json before this runs). A failure here is
     logged loudly but does NOT fail the run: the site advance has been
     written and must not be lost to a Discord outage. */
  const announced = await announce(p, L, data, wk, next);

  return {
    changed: true,
    commit: `${L.label}: advance to ${label} (via ${p.actor})`,
    summary:
      `Advanced to ${label}, next deadline "${next}"${announced.note}` +
      (syncNote ? ` · ${syncNote}` : ""),
  };
}

/* ------------------------------------------------------------
   ROLLOVER — end the season, start the next one
   ------------------------------------------------------------
   The web front door to tools/rollover.js. Everything that matters
   happens in there; this function's whole job is to check that the
   season on disk is the season the commissioner was looking at, hand
   the work over, and turn the result into a commit message and a
   Discord post.

   IT IS NOT AN ADVANCE and deliberately shares none of its code. An
   advance rewrites four fields in league-data.js and can be undone by
   advancing again. This copies five files into seasons/<year>/,
   verifies the copy loads on its own, and only then empties the live
   folder — polls, bracket, postseason and every schedule week. It is
   recoverable, but by `git revert`, not by pressing the button again.

   NOTHING IS DELETED, here or in rollover.js. That claim is the one
   the confirmation on the admin page makes to the commissioner, so it
   is worth being able to check it against this file.
   ------------------------------------------------------------ */
async function doRollover(p, L) {
  const data = loadData(L.paths);
  const onDisk = Number((data.SEASON || {}).year);

  /* The stale-tab guard. See the note beside `year` in validate():
     the page sends back the year it read, and a mismatch means the
     two are not looking at the same season. Refusing is the only safe
     answer — the alternative is archiving whatever happens to be in
     the folder under a label the commissioner never saw. */
  if (onDisk !== p.year) {
    die(
      `${L.dir}/league-data.js is on ${onDisk}, but the submission asked to archive ${p.year}.\n` +
        `  Reload the admin page and look again before rolling over — this usually means the\n` +
        `  rollover has already run, or the page has been open since before it did.`
    );
  }

  /* runRollover() die()s on anything it won't do — an existing
     archive, an archive that doesn't load, an unfinished season with
     no acknowledgement — and a die() here fails the workflow run,
     which is exactly right: a rollover that half-happened must be
     loud. It never gets as far as touching a live file unless the
     archive is already written and verified. */
  const r = runRollover({ league: L, force: p.force, log: (m) => console.log(m) });

  console.log(`\n  ${L.label} rolled over by ${p.actor}.`);
  if (r.notes.length) {
    console.log(`  Acknowledged before running:`);
    r.notes.forEach((n) => console.log(`    - ${n}`));
  }

  const announced = await announcePreseason(p, L, r);

  const detail =
    `${r.year} archived to ${L.dir}/seasons/${r.year}/ (${r.files.length} files + archive.js). ` +
    `${L.dir} is now ${r.nextYear} PRESEASON — ${r.cleared} schedule(s) emptied` +
    (r.departed ? `, ${r.departed} departed coach(es) marked inactive` : ``) +
    `.` +
    (r.wireWarning ? ` WARNING: index.html not wired — ${r.wireWarning}.` : ``) +
    announced.note;

  return {
    changed: true,
    commit: `${L.label}: archive ${r.year} and roll over to ${r.nextYear} (via ${p.actor})`,
    summary: detail,
  };
}

/* The preseason post. Short on purpose — an advance announcement
   exists to tell people what to do next, and there are no games to
   play yet. So it leads with the thing there IS to do (recruiting)
   and names the advance people are waiting on (Week 0).

   IT SAYS NOTHING ABOUT THE ARCHIVE ON PURPOSE. The finished season's
   files move to seasons/<year>/, but no page renders them: a visitor
   can reach last year only through the power-rankings window and the
   coach cards' career numbers. Standings, the bracket and the Top 25
   weeks are the live season's alone. So a line pointing people at
   "last season, still on the site" would be sending them somewhere
   that doesn't exist yet. Add it back when a history view does.

   Same non-fatal contract as announce() above: the archive is on disk
   and must never be lost to a Discord outage. */
async function announcePreseason(p, L, r) {
  const cfg = loadDiscordConfig();
  const url = cfg ? webhookUrl(cfg, L.slug) : "";

  if (!url) {
    console.log(
      `  no Discord webhook for "${L.slug}" on the runner — rolled over without announcing.`
    );
    return { note: " — NOT announced (no webhook on runner)" };
  }

  const M = makeMentioner(cfg, L.slug);
  const content = [
    M.role,
    `**We've advanced to the ${r.nextYear} preseason.**`,
    ``,
    `Build your recruiting board and get your staff set. Week 0 is the next advance — ` +
      `that's when the season kicks off, so keep an eye out for it.`,
    ``,
    L.siteUrl,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  try {
    await post(url, { content, allowed_mentions: M.allowed() });
    console.log("  posted the preseason announcement to Discord.");
    return { note: " \u00b7 announced in Discord" };
  } catch (e) {
    console.error(`  WARNING: preseason announcement FAILED — ${e.message}`);
    console.error("  The rollover still stands; re-post by hand.");
    return { note: " \u00b7 Discord announcement FAILED (see Actions log)" };
  }
}

/* ------------------------------------------------------------
   VACATION — write it to /vacations.js
   ------------------------------------------------------------
   Adding is append-or-correct, not blind append: an identical
   submission is a no-op (people double-tap Submit), and an
   overlapping one from the same coach replaces the range it
   overlaps, which is the "back a day early" edit. Both rules live
   in vacation-core's mergeInto() so the site can describe the
   outcome before the submission is sent.

   Every write also prunes entries more than six months past their
   end date, so the file stays a tracker rather than a diary and
   there is no second job to remember.
   ------------------------------------------------------------ */
function doVacation(p) {
  const day = Vac.today();
  const current = loadVacations();

  const res =
    p.op === "add"
      ? Vac.mergeInto(current, { coach: p.coach, start: p.start, end: p.end }, day)
      : Vac.removeFrom(current, { coach: p.coach, start: p.start, end: p.end });

  const range = Vac.formatRange({ start: p.start, end: p.end });

  if (!res.changed) {
    console.log(
      p.op === "add"
        ? `\n  ${p.coach} was already down as away ${range}. Nothing to write.\n`
        : `\n  No vacation on file for ${p.coach} ${range}. Nothing to remove.\n`
    );
    return { changed: false };
  }

  const before = res.list.length;
  const list = Vac.prune(res.list, day);
  const dropped = before - list.length;

  writeVacations(list);

  /* Which dynasties this actually touches — derived from the rosters,
     never submitted. This is the line that makes the Actions log
     useful: it says out loud that a Salzy vacation is a 1-star and
     3-star fact and not a main one. */
  const leagues = leaguesForCoach(p.coach);
  const where = leagues.length ? leagues.map((L) => L.label).join(", ") : "no current roster";

  const verb = p.op === "add" ? (res.replaced ? "updated" : "added") : "removed";
  console.log(`\n  Vacation ${verb}: ${p.coach}, ${range} — affects ${where}.`);
  if (res.replaced) {
    console.log(`  Replaced an overlapping entry (${Vac.formatRange(res.replaced)}).`);
  }
  if (dropped) console.log(`  Pruned ${dropped} entr${dropped === 1 ? "y" : "ies"} older than six months.`);
  console.log(`  vacations.js updated — ${list.length} on file.\n`);

  return {
    changed: true,
    commit: `Vacation: ${p.coach} ${range} ${verb} (via ${p.actor})`,
    summary: `${p.coach} ${verb} — ${range}. Affects ${where}.`,
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
  /* Read the config defensively rather than through loadConfig(), which
     hard-exits on bad JSON. On the runner this file IS the DISCORD_CONFIG
     secret, and a typo in that secret must not fail the advance — same
     rule as a failed post below. A missing or unparseable config just
     means "don't announce", never "lose the advance". */
  const cfg = loadDiscordConfig();
  const url = cfg ? webhookUrl(cfg, L.slug) : "";

  if (!url) {
    /* No usable webhook on the runner — the DISCORD_CONFIG secret isn't
       set, is unreadable, or has no URL for this league. The advance
       itself is fine; only the ping is missing, so say so and move on. */
    console.log(
      `  no Discord webhook for "${L.slug}" on the runner — advanced without announcing. ` +
        `Check the DISCORD_CONFIG repo secret (see worker/ADMIN-SETUP.md).`
    );
    return { note: " — NOT announced (no webhook on runner)" };
  }

  const built = buildMessage(data, p.week, wk, next, cfg, L.siteUrl, L.slug);

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

  /* A vacation has no league to resolve, so it is answered before
     resolveLeague() is reached at all. */
  if (p.action === "vacation") {
    emit(doVacation(p));
    return;
  }

  const L = resolveLeague(p.league);

  const result =
    p.action === "scores"
      ? doScores(p, L)
      : p.action === "rollover"
      ? await doRollover(p, L)
      : await doAdvance(p, L);
  emit(result);
}

if (require.main === module) {
  main().catch((e) => die(e.stack || e.message));
}

module.exports = { validate, ALLOWED_LEAGUES, ROLLOVER_LEAGUES };
