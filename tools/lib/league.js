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

/* The pure half of the vacation tracker, at the root for the same
   reason week-core is — the site loads it with a <script> tag. */
const vac = require("../../vacation-core");
const { REGULAR_FINAL_WEEK, FINAL_WEEK, BOWL_ROUND_FOR_WEEK, BOWL_ROUND_LABEL } = core;

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
      /* Optional: the CFP era. From week 10 the in-game poll becomes
         the CFP Top 25 and a projected 12-team bracket appears beside
         it; both live here, one entry per week. Shape is documented
         in the file's own header. */
      cfp: path.join(ROOT, meta.dir, "cfp-data.js"),
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
      cfp: path.join(dir, "cfp-data.js"),
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

  /* cfp-data.js is optional and empty until a season reaches week 10.
     An absent file, or a present-but-empty one, is the normal state
     for most of the year, not an error. */
  if (paths.cfp && fs.existsSync(paths.cfp)) run(paths.cfp);

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
    CFP_POLL: ctx.CFP_POLL || [],
    CFP_BRACKET: ctx.CFP_BRACKET || [],
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
/* The week the in-game poll becomes the CFP Top 25 and the bracket
   appears. Stated once per side of the fence — CFP_ERA_WEEK in
   script.js and tools/cfp.js are the same fact. If the game ever
   moves it, all three move together. */
const CFP_ERA_WEEK = 10;

function top25GateError(data, week, league) {
  /* Unknown / omitted league is treated as gated, so a caller that
     forgets to pass it fails safe in the direction of main. */
  const slug = typeof league === "string" ? league : league && league.slug;
  if (slug && LEAGUES[slug] && !LEAGUES[slug].gateOnTop25) return null;

  const polls = (data && data.TOP25) || [];
  if (!polls.length) return null; // league hasn't started running a Top 25
  if (Number(week) < 1) return null; // no preseason poll to require

  /* THE CFP ERA. From week 10 the game stops showing the AP poll and
     shows the CFP Top 25 plus a projected bracket, and those go in
     cfp-data.js instead. The gate follows the game: asking for an AP
     block for week 12 would demand something that no longer exists,
     so past the boundary it asks for the two things that do.

     Both are required, not just the poll, because the bracket is the
     headline of the Top 25 tab from week 10 on — advancing with the
     poll but no bracket publishes a week whose main panel is blank.

     Same leniency as the AP side: a league that has never entered a
     CFP week isn't behind on it, it just hasn't started, so an empty
     CFP_POLL waves the first advance through and the gate engages
     from the second week onward. */
  /* BOWL WEEKS 1-4. The poll freezes at the seeding poll — the
     committee's last ranking is the one the bracket was built from,
     and the game stops updating it — so there is nothing to require
     here and asking for a week-17 poll would block on a screenshot
     that will never exist.

     What IS required is a settled field: the bracket has to have
     stopped saying PROJECTED before the first playoff game is
     played. Advancing into Bowl Week 1 on a projection would publish
     a bracket the games are about to contradict.

     Results are NOT gated. They live in postseason-data.js and have
     no writer yet, so gating on them would be a wall with no door.
     The advance warns instead — see bowlWeekWarning(). */
  if (Number(week) > REGULAR_FINAL_WEEK) {
    const brackets = (data && data.CFP_BRACKET) || [];
    if (!brackets.length) return null; // league never ran a bracket

    const settled = brackets.filter((b) => b.projected === false);
    if (!settled.length) {
      const round = BOWL_ROUND_LABEL[BOWL_ROUND_FOR_WEEK[Number(week)]] || "the playoff";
      return (
        `the CFP bracket is still marked PROJECTED, and ${round} is about to be played.\n` +
        `  After the conference championships the field is settled, so enter that bracket with --final:\n` +
        `    node tools/cfp.js --league ${slug || "main"} --week ${REGULAR_FINAL_WEEK} --bracket bracket.txt --final`
      );
    }
    return null;
  }

  if (Number(week) >= CFP_ERA_WEEK) {
    const cfpPolls = (data && data.CFP_POLL) || [];
    const brackets = (data && data.CFP_BRACKET) || [];
    if (!cfpPolls.length && !brackets.length) return null;

    const missing = [];
    const poll = cfpPolls.find((p) => Number(p.week) === Number(week));
    if (!poll || !Array.isArray(poll.teams) || poll.teams.length === 0) missing.push("CFP Top 25");

    const bracket = brackets.find((b) => Number(b.week) === Number(week));
    if (!bracket || !Array.isArray(bracket.seeds) || bracket.seeds.length === 0) {
      missing.push("projected bracket");
    }

    if (!missing.length) return null;
    return (
      `the Week ${week} ${missing.join(" and ")} ${missing.length > 1 ? "haven't" : "hasn't"} been entered yet.\n` +
      `  From Week ${CFP_ERA_WEEK} the site shows the CFP rankings and bracket instead of the AP poll,\n` +
      `  so advancing without ${missing.length > 1 ? "them" : "it"} would publish the week with an empty playoff panel.\n` +
      `  Screenshot the in-game CFP Top 25 and bracket, then:\n` +
      `    node tools/cfp.js --league ${slug || "main"} --week ${week} --poll poll.txt --bracket bracket.txt`
    );
  }

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

/* ------------------------------------------------------------
   BOWL WEEK ADVISORY
   ------------------------------------------------------------
   Not a gate. Advancing to Bowl Week 3 without Bowl Week 2's four
   results means the bracket will show the semifinal slots empty,
   which is a thing worth saying out loud and not a thing worth
   blocking on — postseason-data.js has no writer yet, so a block
   here would be a wall with no door.

   Returns a string to print, or null when there's nothing to say.
   ------------------------------------------------------------ */
function bowlWeekWarning(data, week) {
  const w = Number(week);
  if (w <= REGULAR_FINAL_WEEK + 1) return null; // nothing precedes Bowl Week 1

  const previous = BOWL_ROUND_FOR_WEEK[w - 1];
  if (!previous) return null;

  const round = ((data && data.POSTSEASON && data.POSTSEASON.rounds) || []).find(
    (r) => r.id === previous
  );
  const played = ((round && round.games) || []).filter(
    (g) => g.homeScore != null && g.awayScore != null
  ).length;
  const expected = { "cfp-r1": 4, "cfp-qf": 4, "cfp-sf": 2, "cfp-nc": 1 }[previous];

  if (played >= expected) return null;
  return (
    `${BOWL_ROUND_LABEL[previous]}: ${played} of ${expected} results are in postseason-data.js.\n` +
    `  The bracket will show the next round's slots empty until the rest are entered.`
  );
}

/* The two non-numeric values `currentWeek` can hold — the gaps either
   side of a season. Advancing INTO the offseason is a real advance
   with a real announcement, so --week has to accept the word; nothing
   else does, and "PRESEASON" is deliberately not among them, because
   the preseason is reached by the rollover rather than by advancing.

   Case-insensitive on input, canonical upper-case on the way out, so
   `--week offseason` works and still writes "OFFSEASON". */
const SENTINELS = ["OFFSEASON"];

function parseWeek(value, example = "--week 4") {
  if (value === undefined) die(`missing --week. Example: ${example}`);

  const word = String(value).trim().toUpperCase();
  if (SENTINELS.includes(word)) return word;

  const week = Number(value);
  if (!Number.isInteger(week) || week < 0 || week > FINAL_WEEK) {
    die(
      `--week must be 0-${FINAL_WEEK} or OFFSEASON, got "${value}".\n` +
        `  0-${REGULAR_FINAL_WEEK} is the regular season (${REGULAR_FINAL_WEEK} is the conference championships);\n` +
        `  ${REGULAR_FINAL_WEEK + 1}-${FINAL_WEEK} are Bowl Weeks 1-4, one per playoff round;\n` +
        `  OFFSEASON is the hold after the national championship, run in Discord.`
    );
  }
  return week;
}

/* The week axis position of a `currentWeek` value. Mirrors
   seasonIndex() in script.js and exists for the same reason: the two
   sentinels do NOT coerce alike. PRESEASON is 0 because nothing has
   happened; OFFSEASON is FINAL_WEEK because everything has, and a 0
   there would tell every tool the season hasn't started one advance
   after the title game. */
function seasonIndex(value) {
  if (value === "PRESEASON") return 0;
  if (value === "OFFSEASON") return FINAL_WEEK;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const isSentinel = (value) => SENTINELS.includes(String(value).trim().toUpperCase());

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

/* ------------------------------------------------------------
   VACATIONS
   ------------------------------------------------------------
   /vacations.js is the central vacation tracker — one flat list
   for all three dynasties, because a vacation is a fact about a
   person and not about a league. The pure half of the logic (is
   this range active, is this submission sane, which roster does
   this person appear on) lives in /vacation-core.js, where the
   site can reach it too. What's here is the Node-only half:
   reading the file off disk and writing it back.

   Same vm trick as loadData() and for the same reason — the file
   is a plain top-level `const` meant for a <script> tag, and it
   stays that way so the site can load it without a build step.
   ------------------------------------------------------------ */
const VACATIONS_FILE = path.join(ROOT, "vacations.js");

function loadVacations() {
  if (!fs.existsSync(VACATIONS_FILE)) return [];
  const ctx = {};
  vm.createContext(ctx);
  const src = fs.readFileSync(VACATIONS_FILE, "utf8").replace(/^const /gm, "var ");
  try {
    vm.runInContext(src, ctx, { filename: "vacations.js" });
  } catch (e) {
    die(`could not parse vacations.js — ${e.message}`);
  }
  return ctx.VACATIONS || [];
}

/* Rewrites just the array literal, leaving the file's header
   comment — which is the documentation for the format — exactly
   where it is. Same approach as updateSeason() in advance.js:
   surgical replacement of a known region beats regenerating a
   file whose comments are worth more than its data.

   Values are written through JSON.stringify so nothing submitted
   from the internet can break out of a string literal and become
   code in a file the site loads with a <script> tag. That is the
   single most important line in this function. */
function writeVacations(list) {
  const src = fs.readFileSync(VACATIONS_FILE, "utf8");

  const rows = list.map((v) => {
    const f = (k, val) => `${k}: ${JSON.stringify(String(val))}`;
    return (
      "  { " +
      [f("coach", v.coach), f("start", v.start), f("end", v.end), f("added", v.added || "")].join(", ") +
      " },"
    );
  });

  const body = rows.length ? `\n${rows.join("\n")}\n` : "\n";
  const next = src.replace(/const VACATIONS = \[[\s\S]*?\n\];/, `const VACATIONS = [${body}];`);

  if (next === src) die("could not find the VACATIONS array in vacations.js — was it hand-edited into a different shape?");
  fs.writeFileSync(VACATIONS_FILE, next, "utf8");
}

/* ------------------------------------------------------------
   WHO IS ON A ROSTER ANYWHERE
   ------------------------------------------------------------
   The union of every league's COACHES names, which is what turns
   the vacation form's name field from free text into a closed set.
   The Google Form this replaces accepted anything typed into it,
   and a misspelling was indistinguishable from a real coach right
   up until the nudge failed to mention somebody.

   Reads the live rosters every time rather than caching a list,
   so a coach who joined this morning can submit this afternoon.
   ------------------------------------------------------------ */
function allRosterNames() {
  const out = [];
  for (const slug of Object.keys(LEAGUES)) {
    const data = loadData(resolveLeague(slug).paths);
    for (const name of vac.rosterNames(data.COACHES)) out.push(name);
  }
  return out;
}

/* Which dynasties a person actually plays in — derived, never
   stored. Used for the commit message and the run summary, so an
   Actions log says "affects 1-Star, 3-Star" rather than leaving
   you to work it out. */
function leaguesForCoach(name) {
  const out = [];
  for (const slug of Object.keys(LEAGUES)) {
    const L = resolveLeague(slug);
    const data = loadData(L.paths);
    if (vac.rosterNames(data.COACHES).some((n) => vac.key(n) === vac.key(name))) out.push(L);
  }
  return out;
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
  seasonIndex,
  isSentinel,
  SENTINELS,
  loadConfig,
  VACATIONS_FILE,
  loadVacations,
  writeVacations,
  allRosterNames,
  leaguesForCoach,
  top25GateError,
  bowlWeekWarning,
  CFP_ERA_WEEK,

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
  REGULAR_FINAL_WEEK: core.REGULAR_FINAL_WEEK,
  FINAL_WEEK: core.FINAL_WEEK,
  roundWeek: core.roundWeek,
  roundLabel: core.roundLabel,
  isKnownRound: core.isKnownRound,
  ALL_ROUNDS: core.ALL_ROUNDS,
  ROUND_ORDER: core.ROUND_ORDER,
};
