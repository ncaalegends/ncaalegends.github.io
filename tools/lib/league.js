/* ============================================================
   SHARED LEAGUE HELPERS
   ------------------------------------------------------------
   Everything advance.js and scores.js both need: where the data
   files live, how to read them, and how to turn a week number
   into a list of matchups.

   This exists so the two tools can never disagree about which
   team belongs to which coach. The roster-matching and alias
   logic below mirrors script.js exactly — if it drifts, Discord
   and the site start describing the same game differently.

   Node built-ins only. No dependencies, no network.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

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

  /* Schedule-file team name for a name typed on the command line.
     TEAM_SCHEDULES is keyed by the in-game name, but a commissioner
     typing fast will use whatever the roster calls it, so both have
     to resolve to the same entry. */
  const scheduleTeamFor = (input, TEAM_SCHEDULES) => {
    const key = rosterKeyFor(input);
    const direct = TEAM_SCHEDULES.find((t) => normalize(t.team) === normalize(input));
    if (direct) return direct.team;
    const viaRoster = TEAM_SCHEDULES.find((t) => rosterKeyFor(t.team) === key);
    return viaRoster ? viaRoster.team : null;
  };

  return { normalize, rosterKeyFor, isLeagueTeam, entryFor, coachFor, scheduleTeamFor };
}

/* ------------------------------------------------------------
   BUILD THE WEEK
   ------------------------------------------------------------
   An H2H (user vs user) game lives in BOTH coaches' schedules, so
   it has to be deduped down to one matchup. A CPU game only ever
   appears once, under the coach playing it.
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
      notes.push({
        team: t.team,
        coach: R.coachFor(t.team),
        note: entry.note || "No game listed",
      });
      return;
    }

    const home = entry.location === "at" ? entry.opponent : t.team;
    const away = entry.location === "at" ? t.team : entry.opponent;

    if (R.isLeagueTeam(entry.opponent)) {
      const pairKey = [R.rosterKeyFor(t.team), R.rosterKeyFor(entry.opponent)]
        .sort()
        .join("::");
      if (!league.has(pairKey)) {
        league.set(pairKey, {
          home,
          away,
          homeCoach: R.coachFor(home),
          awayCoach: R.coachFor(away),
          stadium: entry.stadium || "",
          /* Scores are stored per-team, so the writer needs to know
             which schedule entry each half of the game lives in. */
          teams: [t.team, entry.opponent],
          scored:
            entry.teamScore != null && entry.opponentScore != null
              ? entry.location === "at"
                ? { home: entry.opponentScore, away: entry.teamScore }
                : { home: entry.teamScore, away: entry.opponentScore }
              : null,
        });
      }
    } else {
      cpu.push({
        team: t.team,
        coach: R.coachFor(t.team),
        opponent: entry.opponent,
        location: entry.location,
        stadium: entry.stadium || "",
        teams: [t.team],
        scored:
          entry.teamScore != null && entry.opponentScore != null
            ? { team: entry.teamScore, opponent: entry.opponentScore }
            : null,
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
  makeResolver,
  buildWeek,
  weekLabel,
  parseWeek,
  loadConfig,
};
