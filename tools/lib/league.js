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
const LEAGUES = {
  main: { label: "Main Dynasty", dir: "main" },
  "3star": { label: "3-Star Dynasty", dir: "3star" },
  "1star": { label: "1-Star Dynasty", dir: "1star" },
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
    },
  };
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
  for (const file of [paths.league, paths.schedule]) {
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
  parseWeek,
  loadConfig,

  /* Re-exported from /week-core.js so the existing `require` lines in
     advance.js and scores.js keep working untouched. Importing from
     here or from week-core directly gets the same functions. */
  makeResolver: core.makeResolver,
  buildWeek: core.buildWeek,
  weekLabel: core.weekLabel,
  parseScore: core.parseScore,
  scoreableGames: core.scoreableGames,
  editsFor: core.editsFor,
};
