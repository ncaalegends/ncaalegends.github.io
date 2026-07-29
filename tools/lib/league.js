/* ============================================================
   SHARED LEAGUE HELPERS
   ------------------------------------------------------------
   Everything advance.js and scores.js both need: where the data
   files live, how to read them, and how to turn a week number
   into a list of matchups.

   This exists so the two tools can never disagree about which
   team belongs to which coach.

   WHERE THE MATCHUP LOGIC WENT
   The roster-matching, week-building and score-parsing functions
   used to be written out below. They now live in /week-core.js at
   the repo root, because the admin page needs the identical logic
   from a browser and a second copy is exactly the drift this file
   was created to prevent. They're re-exported unchanged at the
   bottom, so advance.js and scores.js see no difference.

   What remains here is everything Node-only: locating the data
   files, reading them off disk, argument parsing, and config.

   Node built-ins only. No dependencies, no network.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

/* The pure half — no fs, no vm, safe in a browser. See the header
   comment in that file for why it sits at the repo root. */
const core = require("../../week-core");

const ROOT = path.resolve(__dirname, "..", "..");
const CONFIG_FILE = path.join(__dirname, "..", "config.json");
const SITE_ROOT = "https://ncaalegends.github.io";

/* Every league is a folder at the repo root holding its own pair of
   data files. Adding a fourth league means adding a folder and one
   line here — nothing else in either tool is league-specific. */
/*
   `gateOnTop25` decides whether an advance is allowed to proceed
   before that week's poll has been transcribed. Only main blocks. See
   top25GateError() below for why the other two deliberately don't. */
const LEAGUES = {
  main: { label: "Main Dynasty", dir: "main", gateOnTop25: true },
  "3star": { label: "3-Star Dynasty", dir: "3star", gateOnTop25: false },
  "1star": { label: "1-Star Dynasty", dir: "1star", gateOnTop25: false },
};

/* ------------------------------------------------------------
   ARGS
   ------------------------------------------------------------
   `--flag` with no value becomes a flag; `--key value` becomes a
   key. A repeated key collects into an array, which is what lets
   scores.js take several --set arguments in one run.
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
      if (key in out) {
        out[key] = Array.isArray(out[key]) ? [...out[key], next] : [out[key], next];
      } else {
        out[key] = next;
      }
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
   PATHS
   ------------------------------------------------------------ */
function resolveLeague(slug = "main") {
  if (!LEAGUES[slug]) {
    die(`unknown --league "${slug}". Options: ${Object.keys(LEAGUES).join(", ")}`);
  }
  const meta = LEAGUES[slug];
  return {
    slug,
    label: meta.label,
    dir: meta.dir,
    siteUrl: `${SITE_ROOT}/${meta.dir}/`,
    paths: {
      league: path.join(ROOT, meta.dir, "league-data.js"),
      schedule: path.join(ROOT, meta.dir, "schedule-data.js"),
      // Optional: the in-game Top 25 poll, present only for leagues
      // that have started transcribing it (main first).
      top25: path.join(ROOT, meta.dir, "top25-data.js"),
      // Optional: conference championships, CFP and bowls. Shape is
      // documented at buildPostseason() in week-core.js.
      postseason: path.join(ROOT, meta.dir, "postseason-data.js"),
    },
    // Completed seasons live here, one folder per in-game year.
    seasonsDir: path.join(ROOT, meta.dir, "seasons"),
  };
}

/* ------------------------------------------------------------
   SEASON ARCHIVE
   ------------------------------------------------------------
   The folder a league sits in always holds the CURRENT season. When
   a season finishes it moves wholesale into seasons/<year>/, keeping
   the same filenames:

     main/                     <- the season being played now
       league-data.js
       schedule-data.js
       top25-data.js
       postseason-data.js
       seasons/
         2026/
           league-data.js      <- exactly the files above, frozen
           schedule-data.js
           top25-data.js
           postseason-data.js

   WHY WHOLE FILES AND NOT A DIFF. A season's roster is part of its
   history: who coached which school in 2026 is the only way to render
   a 2026 meeting correctly once someone has changed teams. Archiving
   the schedule without the roster beside it would leave games whose
   participants can't be resolved. The files are small and the
   redundancy is the point — an archived season is readable on its own
   forever, with no dependency on what the league looks like later.

   THE ARCHIVE IS READ-ONLY. Nothing writes into seasons/ except the
   rollover, and nothing in the live site edits it. A past season is
   history in the same sense a Top 25 week is history: adding is fine,
   editing is not.

   Returns [{ year, data }] oldest first, with the current season
   last — the order computeH2H expects, so its `throughWeek` option
   applies to the season actually being played.
   ------------------------------------------------------------ */
function listArchivedYears(league) {
  if (!fs.existsSync(league.seasonsDir)) return [];
  return fs
    .readdirSync(league.seasonsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}$/.test(d.name))
    .map((d) => Number(d.name))
    .sort((a, b) => a - b);
}

function loadCareer(league) {
  const out = [];

  for (const year of listArchivedYears(league)) {
    const dir = path.join(league.seasonsDir, String(year));
    const data = loadData({
      league: path.join(dir, "league-data.js"),
      schedule: path.join(dir, "schedule-data.js"),
      top25: path.join(dir, "top25-data.js"),
      postseason: path.join(dir, "postseason-data.js"),
    });
    /* The folder name wins over the file's own SEASON.year. They
       should agree; if they don't, the location on disk is the thing
       a human can see and sort, so it's the tiebreak. */
    data.SEASON = Object.assign({}, data.SEASON, { year });
    out.push({ year, data });
  }

  const current = loadData(league.paths);
  out.push({ year: (current.SEASON || {}).year ?? null, data: current });
  return out;
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
function loadData(paths) {
  const ctx = {};
  vm.createContext(ctx);

  const run = (file) => {
    // `var` so the declarations land on the context object.
    const src = fs.readFileSync(file, "utf8").replace(/^const /gm, "var ");
    try {
      vm.runInContext(src, ctx, { filename: path.basename(file) });
    } catch (e) {
      die(`could not parse ${path.basename(file)} — ${e.message}`);
    }
  };

  for (const file of [paths.league, paths.schedule]) {
    if (!fs.existsSync(file)) die(`missing data file: ${file}`);
    run(file);
  }

  // top25-data.js is optional — only some leagues have a poll yet.
  if (paths.top25 && fs.existsSync(paths.top25)) run(paths.top25);

  /* postseason-data.js is optional too, and absent everywhere today.
     A season with no postseason block is a legitimate state (one
     still being played, or one that ended before the file format
     existed), not an error. */
  if (paths.postseason && fs.existsSync(paths.postseason)) run(paths.postseason);

  return {
    SEASON: ctx.SEASON || {},
    COACHES: ctx.COACHES || [],
    TEAM_SCHEDULES: ctx.TEAM_SCHEDULES || [],
    ALIASES: ctx.SCHEDULE_TEAM_ALIASES || {},
    LEAGUE_INFO: ctx.LEAGUE_INFO || { name: "League" },
    TOP25: ctx.TOP25 || [],
    POSTSEASON: ctx.POSTSEASON || null,
  };
}

/* ------------------------------------------------------------
   TOP 25 GATE
   ------------------------------------------------------------
   The main dynasty shouldn't advance into a week until that week's
   poll has been transcribed — otherwise the site would show the new
   week with stale (or missing) rankings on every schedule. Returns an
   error string to block on, or null to allow.

   WHY ONLY MAIN IS GATED
   Gating couples two people's evenings together: nobody can advance
   until somebody has taken and uploaded a screenshot. In main that
   coupling is worth it — the poll IS part of how the week is
   presented, and the announcement, the badges and the Top 25 tab all
   land in one motion.

   In 3-star and 1-star the poll is a bonus, and the same coupling
   would only ever show up as an advance blocked on a screenshot
   nobody took. So those leagues are `gateOnTop25: false`: uploads are
   welcome any week, in any order, before or after the advance, and a
   week with no poll simply renders unranked. The cost is that their
   Top 25 tab can trail the schedule by a week, which is the right way
   round — a slightly stale tab beats a stalled season.

   Also lenient about WHEN it applies even in main: a league whose
   TOP25 is empty is never gated (that's a league that hasn't started
   the poll, not one that's behind on it), and the preseason / week 0
   is skipped since there's no poll before week 1.
   ------------------------------------------------------------ */
function top25GateError(data, week, league) {
  /* Unknown / omitted league is treated as gated, so a caller that
     forgets to pass it fails safe in the direction of main. */
  const slug = typeof league === "string" ? league : league && league.slug;
  if (slug && LEAGUES[slug] && !LEAGUES[slug].gateOnTop25) return null;

  const polls = (data && data.TOP25) || [];
  if (!polls.length) return null; // league hasn't started running a Top 25
  if (Number(week) < 1) return null; // no preseason poll to require

  const entry = polls.find((p) => Number(p.week) === Number(week));
  if (!entry || !Array.isArray(entry.teams) || entry.teams.length === 0) {
    return (
      `the Week ${week} Top 25 hasn't been entered yet, so the site can't show ` +
      `current rankings for that week.\n` +
      `  Screenshot the in-game Top 25 for Week ${week}, add a ` +
      `{ week: ${week}, teams: [...] } block to top25-data.js, then advance again.`
    );
  }
  return null;
}

function parseWeek(value, example = "--week 4") {
  if (value === undefined) die(`missing --week. Example: ${example}`);
  const week = Number(value);
  if (!Number.isInteger(week) || week < 0 || week > 15) {
    die(`--week must be 0-15, got "${value}"`);
  }
  return week;
}

/* ------------------------------------------------------------
   CONFIG
   ------------------------------------------------------------ */
function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch (e) {
    die(`tools/config.json is not valid JSON — ${e.message}`);
  }
}

module.exports = {
  ROOT,
  SITE_ROOT,
  LEAGUES,
  parseArgs,
  die,
  resolveLeague,
  loadData,
  listArchivedYears,
  loadCareer,
  parseWeek,
  loadConfig,
  top25GateError,

  /* Re-exported from /week-core.js so the existing `require` lines in
     advance.js and scores.js keep working untouched. Importing from
     here or from week-core directly gets the same functions. */
  makeResolver: core.makeResolver,
  buildWeek: core.buildWeek,
  buildPostseason: core.buildPostseason,
  computeAchievements: core.computeAchievements,
  seasonMeetings: core.seasonMeetings,
  computeH2H: core.computeH2H,
  auditScheduleSides: core.auditScheduleSides,
  computeRankings: core.computeRankings,
  weekLabel: core.weekLabel,
  parseScore: core.parseScore,
  scoreableGames: core.scoreableGames,
  editsFor: core.editsFor,
};
