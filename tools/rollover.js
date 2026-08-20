#!/usr/bin/env node
/* ============================================================
   ROLLOVER — archive a finished season and start the next one
   ------------------------------------------------------------
   Runs once per league per year, at the end of the offseason hold.
   It does two things that must happen in this order:

     1. copy this season's five data files into seasons/<year>/
     2. reset the live folder for next season

   THE ORDER IS THE WHOLE SAFETY PROPERTY.

   A season's roster is part of its history — who coached which
   school in 2026 is the only way to render a 2026 meeting correctly
   once someone changes teams. During the offseason hold nothing has
   touched league-data.js, so it is still honestly the 2026 roster
   when it's frozen. Edit first and archive second and you get a 2026
   archive recording coaches at schools they moved to in 2027:
   silently, permanently, and with nothing to notice.

   So this script archives, VERIFIES THE ARCHIVE LOADS, and only then
   touches the live files. Roster edits happen afterwards, by hand,
   against a folder that is already next season.

   IT DELETES NOTHING. The archive is a copy; the live files are
   rewritten in place and every one of them is in git. A rollover you
   didn't mean is a revert, not a recovery.

   USAGE
     node tools/rollover.js --league main --dry-run
     node tools/rollover.js --league main

   FLAGS
     --league SLUG   main | 3star | 1star. Defaults to main.
     --dry-run       report everything, write nothing.
     --force         proceed even if the season looks unfinished.

   WHAT CARRIES FORWARD AND WHAT DOESN'T

     ROSTER          carried whole. This is an online dynasty and
                     coaches stay with their team across seasons; a
                     coach changing schools is an exception handled by
                     hand afterwards, not an annual migration.
     conference      carried, on both the roster and the schedules.
     schedule weeks  CLEARED. Next season's opponents are a fresh
                     in-game draw and get transcribed in the preseason.
     polls, bracket  CLEARED. They are records of a season that is now
     postseason      in the archive.
     departedAfterWeek
                     TRANSLATED to `active: false` — see below.

   DEPARTURES BECOME PERMANENT INACTIVITY.
   league-data.js already documents departedAfterWeek as per-season:
   it belongs to the season the departure happened in, freezes into
   the archive, and is not carried into next year's roster. But the
   coach is still gone. `active: false` is the existing flag for
   exactly that state — "no played games worth keeping", which is true
   by construction in a season they haven't played — so the rollover
   rewrites one into the other. No new vocabulary.

   Node built-ins only. No dependencies, no network.
   ============================================================ */

const fs = require("fs");
const path = require("path");

const {
  parseArgs,
  die,
  resolveLeague,
  loadData,
  loadCareer,
  listArchivedYears,
  seasonIndex,
  FINAL_WEEK,
} = require("./lib/league");

const ARCHIVED_FILES = [
  "league-data.js",
  "schedule-data.js",
  "top25-data.js",
  "cfp-data.js",
  "postseason-data.js",
];

/* ------------------------------------------------------------
   THE BROWSER'S VIEW OF THE ARCHIVE
   ------------------------------------------------------------
   The Node tools read archived seasons through loadCareer(), which
   runs each file in its own vm context. The SITE has no such thing:
   the data files are plain top-level `const` declarations meant for a
   <script> tag, so loading 2026's league-data.js beside 2027's would
   redeclare SEASON, COACHES and TEAM_SCHEDULES and throw before the
   page rendered.

   script.js already expects a global `ARCHIVED_SEASONS` — CAREER is
   `[...ARCHIVED_SEASONS, RANKING_DATA]` — but until now nothing on
   earth defined it, so CAREER was always a one-element list. That
   would have been invisible until the first rollover and then very
   visible: no L5 window spanning seasons, no career H2H on any roster
   card, and every conference title and playoff appearance gone from
   the site the moment the season holding them was archived.

   So the rollover generates ONE more file per season — archive.js —
   that wraps the five data files in a function body. Function scope
   turns those top-level consts into locals, which is the same trick
   loadData() does with vm and admin.js does with new Function, and it
   means any number of seasons can coexist on one page.

   It's generated rather than hand-written because it has to match the
   shape script.js builds for the live season (RANKING_DATA) exactly,
   and because a per-season file nobody remembers to write is a
   per-season file that doesn't exist.
   ------------------------------------------------------------ */
function renderArchiveLoader(year, sources) {
  const body = sources
    .map((s) => `/* ---- ${s.name} ---- */\n${s.text}`)
    .join("\n\n");

  return `/* ============================================================
   ${year} — ARCHIVED SEASON, loaded by the site
   ------------------------------------------------------------
   GENERATED by tools/rollover.js. Don't hand-edit: it is the five
   data files beside it, wrapped so their top-level declarations
   become function-locals instead of page globals. Without that,
   this season's SEASON/COACHES/TEAM_SCHEDULES would collide with
   the live season's and the page would fail to start.

   Edit the files next to this one if a fact about ${year} is wrong,
   then regenerate. Better still: don't. This is history.
   ============================================================ */
(function () {
  "use strict";

  var season = (function () {
${body
  .split("\n")
  .map((l) => (l.trim() ? "    " + l : l))
  .join("\n")}

    /* The same shape script.js assembles for the live season, so
       computeRankings / computeH2H / computeAchievements can't tell
       an archived season from the current one. */
    return {
      SEASON: typeof SEASON !== "undefined" ? SEASON : {},
      COACHES: typeof COACHES !== "undefined" ? COACHES : [],
      ALIASES: typeof SCHEDULE_TEAM_ALIASES !== "undefined" ? SCHEDULE_TEAM_ALIASES : {},
      TEAM_SCHEDULES: typeof TEAM_SCHEDULES !== "undefined" ? TEAM_SCHEDULES : [],
      TOP25: typeof TOP25 !== "undefined" ? TOP25 : [],
      POSTSEASON: typeof POSTSEASON !== "undefined" ? POSTSEASON : null,
      CFP_POLL: typeof CFP_POLL !== "undefined" ? CFP_POLL : null,
    };
  })();

  /* THE FOLDER NAME WINS over the file's own SEASON.year — the same
     tiebreak loadCareer() applies, for the same reason: the folder is
     the thing a human can see and sort. */
  season.SEASON = Object.assign({}, season.SEASON, { year: ${year} });

  /* Oldest first. Script tags run in document order and each archive
     pushes as it loads, so index.html listing the years in order is
     what keeps CAREER sorted — computeRankings applies throughWeek to
     the LAST entry only, so a reversed list would cap the wrong
     season. */
  var all = (window.ARCHIVED_SEASONS = window.ARCHIVED_SEASONS || []);
  all.push(season);
})();
`;
}

/* Add <script> tags for every archived season to a league's
   index.html, in year order, immediately before the live season's
   league-data.js.

   BEFORE, not after, and this is load-bearing twice over: the archives
   have to be on the page before script.js reads ARCHIVED_SEASONS, and
   they have to be in ascending year order because each one pushes
   itself onto the list as it runs. */
function wireIndexHtml(file, years) {
  if (!fs.existsSync(file)) return { changed: false, reason: "no index.html" };
  const src = fs.readFileSync(file, "utf8");

  const wanted = years.map(
    (y) => `<script src="seasons/${y}/archive.js" defer></script>`
  );
  const missing = wanted.filter((tag) => !src.includes(tag));
  if (!missing.length) return { changed: false, reason: "already wired" };

  const anchor = '<script src="league-data.js" defer></script>';
  if (!src.includes(anchor)) {
    return { changed: false, reason: `couldn't find ${anchor} to insert before` };
  }

  /* Rebuild the whole run of archive tags rather than appending, so
     the order is right no matter what was there before. */
  const stripped = src.replace(
    /^[ \t]*<script src="seasons\/\d{4}\/archive\.js" defer><\/script>\r?\n/gm,
    ""
  );
  const block = wanted.join("\n") + "\n";
  return {
    changed: true,
    text: stripped.replace(anchor, block + anchor),
    added: missing.length,
  };
}

/* ------------------------------------------------------------
   READINESS
   ------------------------------------------------------------
   Warnings, not gates, with one exception. The commissioner knows
   things this script can't — a league that never reached the CFP has
   no bracket to be missing, and a season can legitimately end with
   games nobody bothered to score. What it can do is say what it sees
   before doing something that only makes sense once.

   The exception is an existing archive: that IS refused, because
   overwriting one silently replaces a finished season's permanent
   record with whatever the live folder happens to hold.
   ------------------------------------------------------------ */
function readiness(data, league) {
  const notes = [];
  const week = (data.SEASON || {}).currentWeek;

  if (week !== "OFFSEASON") {
    notes.push(
      week === "PRESEASON"
        ? `currentWeek is "PRESEASON" — this league looks like it has already rolled over.`
        : `currentWeek is ${JSON.stringify(week)}, not "OFFSEASON". The rollover is meant to run ` +
          `at the end of the offseason hold, once the national championship has been played.`
    );
  }

  if (seasonIndex(week) < FINAL_WEEK && week !== "OFFSEASON") {
    notes.push(`the season hasn't reached Bowl Week 4 — the playoff may be unfinished.`);
  }

  const post = (data.POSTSEASON || {}).rounds || [];
  const nc = post.find((r) => r.id === "cfp-nc");
  const ncPlayed = (nc?.games || []).some((g) => g.homeScore != null && g.awayScore != null);
  const ncInSchedule = (data.TEAM_SCHEDULES || []).some((t) =>
    (t.weeks || []).some(
      (w) => w.round === "cfp-nc" && w.teamScore != null && w.opponentScore != null
    )
  );
  if (!ncPlayed && !ncInSchedule) {
    notes.push(
      `no national championship result found in postseason-data.js or the schedules — ` +
        `the season may not be over.`
    );
  }

  return notes;
}

/* ------------------------------------------------------------
   REWRITING THE LIVE FILES
   ------------------------------------------------------------
   Every rewrite below is a targeted regex over the file's own text
   rather than a regeneration, for the reason every writer in tools/
   works that way: the comments in these files are documentation the
   commissioner relies on, and the hand-formatting is what makes a
   diff readable. A rollover that reformatted schedule-data.js would
   produce a diff nobody could review on the one commit where review
   matters most.
   ------------------------------------------------------------ */
function replaceOne(src, re, to, what, file) {
  const hits = src.match(new RegExp(re.source, re.flags.replace("g", "") + "g"));
  if (!hits) die(`couldn't find ${what} in ${file} — refusing to guess.`);
  if (hits.length > 1) die(`found ${hits.length} matches for ${what} in ${file} — refusing to guess.`);
  return src.replace(re, to);
}

function resetLeagueData(file, nextYear) {
  let src = fs.readFileSync(file, "utf8");

  src = replaceOne(src, /^(\s*year:\s*)\d+(,)/m, `$1${nextYear}$2`, "SEASON.year", file);
  src = replaceOne(
    src,
    /^(\s*currentWeek:\s*)(?:"PRESEASON"|"OFFSEASON"|\d+)(,)/m,
    `$1"PRESEASON"$2`,
    "SEASON.currentWeek",
    file
  );
  src = replaceOne(src, /^(\s*statusLine:\s*)"[^"]*"(,)/m, `$1"PRESEASON"$2`, "SEASON.statusLine", file);

  /* The deadline is cleared rather than carried: a date from last
     season would sit in the hero counting down to a day that has
     already passed. Both fields together, as everything else that
     touches them does. */
  if (/^\s*nextAdvanceAt:/m.test(src)) {
    src = replaceOne(src, /^(\s*nextAdvanceAt:\s*)"[^"]*"(,)/m, `$1""$2`, "SEASON.nextAdvanceAt", file);
  }
  if (/^\s*nextAdvance:/m.test(src)) {
    src = replaceOne(src, /^(\s*nextAdvance:\s*)"[^"]*"(,)/m, `$1""$2`, "SEASON.nextAdvance", file);
  }

  /* DEPARTURES BECOME PERMANENT INACTIVITY. `departedAfterWeek: N`
     described a season that is now frozen in the archive; the coach
     being gone is a fact about the league, and `active: false` is the
     existing flag for it. Rewritten in place so the surrounding
     comment — which usually explains who left and when — survives
     next to it. */
  const departed = [];
  src = src.replace(/departedAfterWeek:\s*\d+/g, (m) => {
    departed.push(m);
    return "active: false";
  });

  return { text: src, departed: departed.length };
}

/* Clear every team's week list, keeping the team and conference. The
   `weeks: [` ... `],` span is replaced with an empty array; nothing
   else in the file is touched, so the header, the per-team comments
   and the file's shape all survive for next season's transcription. */
function clearSchedules(file) {
  const src = fs.readFileSync(file, "utf8");
  let cleared = 0;
  const text = src.replace(/(\n\s*weeks:\s*\[)[\s\S]*?(\n\s*\],)/g, (m, open, close) => {
    cleared++;
    return open + close;
  });
  if (!cleared) die(`found no "weeks: [" blocks in ${path.basename(file)} — refusing to guess.`);
  return { text, cleared };
}

/* Empty a top-level array declaration, leaving the header comment
   above it untouched. Anchored to column zero: these files carry
   worked examples inside their headers that also read
   "const TOP25 = [", and matching one of those would truncate the
   file mid-comment. */
function emptyArray(file, name) {
  const src = fs.readFileSync(file, "utf8");
  const re = new RegExp(`^const ${name} = \\[[\\s\\S]*?^\\];`, "m");
  if (!re.test(src)) return null;
  return src.replace(re, `const ${name} = [];`);
}

function emptyPostseason(file) {
  const src = fs.readFileSync(file, "utf8");
  const m = /^const POSTSEASON\b/m.exec(src);
  if (!m) return null;
  return src.slice(0, m.index) + "const POSTSEASON = {\n  rounds: [],\n};\n";
}

/* ------------------------------------------------------------
   MAIN
   ------------------------------------------------------------ */
function main() {
  const args = parseArgs(process.argv.slice(2));
  const league = resolveLeague(args.league || "main");
  const dryRun = args.flags.has("dry-run");
  const force = args.flags.has("force");

  const data = loadData(league.paths);
  const year = Number((data.SEASON || {}).year);

  if (!Number.isInteger(year)) {
    die(
      `${league.dir}/league-data.js has no SEASON.year, so this season can't be placed on the\n` +
        `  timeline. Set it before archiving — a season archived without a year can't be\n` +
        `  placed afterwards.`
    );
  }

  const dest = path.join(league.seasonsDir, String(year));
  const nextYear = year + 1;

  console.log(`\n  ${league.label} — rollover ${year} -> ${nextYear}\n`);

  /* --- the one hard refusal --- */
  if (fs.existsSync(dest)) {
    die(
      `${path.relative(process.cwd(), dest)} already exists.\n` +
        `  That season is already archived, and overwriting it would replace a finished\n` +
        `  season's permanent record with whatever the live folder holds now. If you are\n` +
        `  genuinely redoing an archive, move the existing folder aside by hand first.`
    );
  }

  /* --- readiness --- */
  const notes = readiness(data, league);
  if (notes.length) {
    console.log(`  Before going further:\n`);
    notes.forEach((n) => console.log(`    - ${n}`));
    console.log("");
    if (!force && !dryRun) {
      die(
        `not rolling over while the season looks unfinished.\n` +
          `  Run with --dry-run to see exactly what would happen, or --force if you know\n` +
          `  these are fine.`
      );
    }
  }

  /* --- what will be archived --- */
  const present = ARCHIVED_FILES.filter((f) => fs.existsSync(path.join(league.dir_abs || "", f)) || true)
    .map((f) => ({ name: f, src: path.join(path.dirname(league.paths.league), f) }))
    .filter((f) => fs.existsSync(f.src));

  console.log(`  Archiving ${present.length} file(s) to ${league.dir}/seasons/${year}/`);
  present.forEach((f) => console.log(`    ${f.name}`));
  console.log("");

  const missing = ARCHIVED_FILES.filter((f) => !present.some((p) => p.name === f));
  if (missing.length) {
    console.log(`  Not present, so not archived: ${missing.join(", ")}`);
    console.log(`  (an absent optional file is a normal state, not an error)\n`);
  }

  if (dryRun) {
    const { departed } = resetLeagueData(league.paths.league, nextYear);
    const { cleared } = clearSchedules(league.paths.schedule);
    console.log(`  Then the live folder would be reset:`);
    console.log(`    league-data.js     year ${year} -> ${nextYear}, currentWeek -> "PRESEASON", deadline cleared`);
    if (departed) console.log(`                       ${departed} departedAfterWeek -> active: false`);
    console.log(`    schedule-data.js   ${cleared} team(s) emptied of weeks, teams and conferences kept`);
    console.log(`    top25-data.js      emptied`);
    console.log(`    cfp-data.js        emptied`);
    console.log(`    postseason-data.js emptied`);

    const wouldWire = wireIndexHtml(
      path.join(path.dirname(league.paths.league), "index.html"),
      [...listArchivedYears(league), year]
    );
    console.log(
      `\n  And the site would be pointed at the archive:` +
        `\n    seasons/${year}/archive.js written (the five files above, scoped for the browser)` +
        `\n    ${league.dir}/index.html ` +
        (wouldWire.changed
          ? `gains ${wouldWire.added} <script> tag(s) before league-data.js`
          : `— ${wouldWire.reason}`)
    );
    console.log(`\n  --dry-run: nothing written.\n`);
    return;
  }

  /* --- 1. ARCHIVE FIRST --- */
  fs.mkdirSync(dest, { recursive: true });
  present.forEach((f) => fs.copyFileSync(f.src, path.join(dest, f.name)));

  /* The site's way in. Without this the archive exists on disk, the
     Node tools can read it, and the SITE shows nothing from it — no
     career H2H, no trophies, no L5 window spanning seasons. */
  fs.writeFileSync(
    path.join(dest, "archive.js"),
    renderArchiveLoader(
      year,
      present.map((f) => ({ name: f.name, text: fs.readFileSync(f.src, "utf8") }))
    ),
    "utf8"
  );
  console.log(`  Archived, plus archive.js for the site to load it.`);

  /* --- 2. VERIFY IT LOADS, before anything live is touched --- */
  let archived;
  try {
    archived = loadData({
      league: path.join(dest, "league-data.js"),
      schedule: path.join(dest, "schedule-data.js"),
      top25: path.join(dest, "top25-data.js"),
      cfp: path.join(dest, "cfp-data.js"),
      postseason: path.join(dest, "postseason-data.js"),
    });
  } catch (e) {
    die(`the archive doesn't load: ${e.message}\n  Nothing live has been changed.`);
  }

  const coaches = (archived.COACHES || []).length;
  const teams = (archived.TEAM_SCHEDULES || []).length;
  if (!coaches || !teams) {
    die(
      `the archive loaded but looks empty (${coaches} coaches, ${teams} schedules).\n` +
        `  Nothing live has been changed. Check ${path.relative(process.cwd(), dest)}.`
    );
  }
  console.log(`  Verified — ${coaches} coaches, ${teams} schedules, readable on its own.`);

  const years = listArchivedYears(league);
  if (!years.includes(year)) {
    die(`the archive isn't visible to listArchivedYears(). Nothing live has been changed.`);
  }

  /* --- 3. ONLY NOW reset the live folder --- */
  const reset = resetLeagueData(league.paths.league, nextYear);
  fs.writeFileSync(league.paths.league, reset.text, "utf8");

  const sched = clearSchedules(league.paths.schedule);
  fs.writeFileSync(league.paths.schedule, sched.text, "utf8");

  const t25 = league.paths.top25 && fs.existsSync(league.paths.top25) ? emptyArray(league.paths.top25, "TOP25") : null;
  if (t25) fs.writeFileSync(league.paths.top25, t25, "utf8");

  if (league.paths.cfp && fs.existsSync(league.paths.cfp)) {
    let cfpSrc = emptyArray(league.paths.cfp, "CFP_POLL");
    if (cfpSrc) fs.writeFileSync(league.paths.cfp, cfpSrc, "utf8");
    cfpSrc = emptyArray(league.paths.cfp, "CFP_BRACKET");
    if (cfpSrc) fs.writeFileSync(league.paths.cfp, cfpSrc, "utf8");
  }

  if (league.paths.postseason && fs.existsSync(league.paths.postseason)) {
    const p = emptyPostseason(league.paths.postseason);
    if (p) fs.writeFileSync(league.paths.postseason, p, "utf8");
  }

  console.log(`\n  Live folder reset for ${nextYear}:`);
  console.log(`    currentWeek "PRESEASON", deadline cleared`);
  if (reset.departed) {
    console.log(`    ${reset.departed} departed coach(es) marked active: false`);
  }
  console.log(`    ${sched.cleared} schedule(s) emptied — teams and conferences kept`);
  console.log(`    polls, bracket and postseason emptied`);

  /* --- 4. point the site at every archived season --- */
  const indexFile = path.join(path.dirname(league.paths.league), "index.html");
  const wired = wireIndexHtml(indexFile, listArchivedYears(league));
  if (wired.changed) {
    fs.writeFileSync(indexFile, wired.text, "utf8");
    console.log(`    ${league.dir}/index.html now loads ${wired.added} archived season(s)`);
  } else if (wired.reason !== "already wired") {
    console.log(
      `\n  WARNING: couldn't wire the archive into ${league.dir}/index.html — ${wired.reason}.\n` +
        `           The season is safely archived, but the site won't show its career\n` +
        `           history until this tag is added by hand, before league-data.js:\n` +
        `             <script src="seasons/${year}/archive.js" defer></script>`
    );
  }

  /* --- 5. the career record still works --- */
  try {
    const career = loadCareer(league);
    console.log(
      `\n  Career record spans ${career.length} season(s): ` +
        career.map((s) => s.year ?? "?").join(", ")
    );
  } catch (e) {
    console.log(`\n  WARNING: loadCareer() failed after the rollover — ${e.message}`);
  }

  console.log(`\n  Next, in this order:`);
  console.log(`    1. Roster changes for ${nextYear} — schools, arrivals, anyone not returning.`);
  console.log(`       The archive is already written, so edits now can't corrupt ${year}.`);
  console.log(`    2. Transcribe ${nextYear} schedules into schedule-data.js.`);
  console.log(`    3. node tools/h2h.js --league ${league.slug} --check`);
  console.log(`    4. git add -A && git commit -m "${league.label}: roll over to ${nextYear}" && git push\n`);
}

if (require.main === module) main();

module.exports = {
  resetLeagueData,
  clearSchedules,
  emptyArray,
  emptyPostseason,
  readiness,
  renderArchiveLoader,
  wireIndexHtml,
};
