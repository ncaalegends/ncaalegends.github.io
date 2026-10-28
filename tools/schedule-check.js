#!/usr/bin/env node
/* ============================================================
   SCHEDULE-CHECK — structural audit of a season's schedule file
   ------------------------------------------------------------
   Read-only. Never writes a file, never touches the network.

   This is the harness for building a PRESEASON schedule: the
   twelve-game custom slates transcribed out of each coach's
   in-game "Custom Schedule" screens. It answers the questions
   that are tedious to check by eye across 20-odd teams and 250-odd
   rows, and that are expensive to get wrong because the slate
   becomes the season.

   It does NOT check results, polls or the postseason — tools/h2h.js
   --check owns those. Run both.

   USAGE
     node tools/schedule-check.js --league main
     node tools/schedule-check.js --league main --team "Notre Dame"
     node tools/schedule-check.js --league main --quiet
     node tools/schedule-check.js --league main --season 2027

   OPTIONS
     --league <main|3star|1star>   default: main
     --season <year>               audit an archived season instead
                                   of the one being played
     --team <name>                 one team's slate, in detail
     --games <n>                   expected games per team (default 12)
     --quiet                       failures only, no summary tables

   Exits non-zero if any check fails, so it can gate a commit.
   ============================================================ */

const path = require("path");
const fs = require("fs");
const { parseArgs, resolveLeague, loadData, makeResolver, die } = require("./lib/league");

/* FCS programs that appear in the game's schedule editor. A user's
   slate is supposed to carry none of these — the commissioner's
   standing rule. Not exhaustive by design: an unknown name is
   reported separately as "unrecognised", which is the prompt to
   check it and, if it is FCS, add it here. */
const FCS = [
  "Alabama A&M","Alabama State","Alcorn State","Austin Peay","Bethune-Cookman",
  "Brown","Bryant","Bucknell","Butler","Cal Poly","Campbell","Central Arkansas",
  "Charleston Southern","Chattanooga","The Citadel","Colgate","Columbia","Cornell",
  "Dartmouth","Davidson","Delaware State","Drake","Duquesne","East Tennessee State",
  "Eastern Illinois","Eastern Kentucky","Eastern Washington","Elon","Florida A&M",
  "Fordham","Furman","Gardner-Webb","Georgetown","Grambling State","Hampton",
  "Harvard","Holy Cross","Houston Christian","Howard","Idaho","Idaho State",
  "Illinois State","Incarnate Word","Indiana State","Jackson State","Lafayette",
  "Lamar","Lehigh","Lindenwood","Long Island","Maine","Marist","McNeese",
  "Mercer","Merrimack","Mississippi Valley State","Monmouth","Montana",
  "Montana State","Morehead State","Morgan State","Murray State","New Hampshire",
  "Nicholls","Norfolk State","North Alabama","North Carolina A&T",
  "North Carolina Central","North Dakota","North Dakota State","Northern Arizona",
  "Northern Colorado","Northern Iowa","Northwestern State","Penn","Portland State",
  "Prairie View A&M","Presbyterian","Princeton","Rhode Island","Richmond",
  "Robert Morris","Sacramento State","Sacred Heart","Saint Francis","Sam Houston",
  "Samford","San Diego","Southeast Missouri State","Southeastern Louisiana",
  "Southern","Southern Illinois","Southern Utah","St. Thomas","Stephen F. Austin",
  "Stetson","Stonehill","Tarleton State","Tennessee State","Tennessee Tech",
  "Texas Southern","Towson","UC Davis","UT Martin","Utah Tech","Valparaiso",
  "Villanova","VMI","Wagner","Weber State","Western Carolina","Western Illinois",
  "William & Mary","Wofford","Yale","Youngstown State",
];
const FCS_SET = new Set(FCS.map((n) => n.toLowerCase()));

const ARMY_NAVY_WEEK = 14;
const CCG_WEEK = 15;
/* Weeks 16-19 are the CFP and the bowls. They are written by
   tools/bracket-sync.js long after a slate is built and are none of
   this tool's business. */
const LAST_REGULAR_WEEK = 13;

const args = parseArgs(process.argv.slice(2));
const league = resolveLeague(args.league || "main");

/* --season reads a frozen year out of seasons/<year>/ instead of the
   live folder. Useful for checking a slate after the fact, and the
   only way to audit a season that has already been archived. */
let paths = league.paths;
if (args.season) {
  const dir = path.join(league.seasonsDir, String(args.season));
  if (!fs.existsSync(dir)) {
    die(`no archived season ${args.season} for ${league.slug}. Have: ${fs.existsSync(league.seasonsDir) ? fs.readdirSync(league.seasonsDir).join(", ") : "none"}`);
  }
  paths = {};
  for (const [k, v] of Object.entries(league.paths)) paths[k] = path.join(dir, path.basename(v));
}
const data = loadData(paths);
const EXPECT = Number(args.games || 12);
const QUIET = !!args.quiet;

const R = makeResolver(data);

/* ------------------------------------------------------------
   Who is coached. An inactive coach's team is a CPU opponent
   everywhere, so it must not be treated as a head-to-head.
   ------------------------------------------------------------ */
const coached = new Map(); // schedule-spelling team name -> {handle, conference}
const confOf = new Map();
for (const c of data.COACHES) {
  if (c.active === false) continue;
  if (c.departedAfterWeek != null) continue;
  for (const t of String(c.team).split("/").map((s) => s.trim())) {
    coached.set(t, { handle: c.name, conference: c.conference || "?" });
  }
}
/* schedule-data.js spells some teams differently from league-data.js
   (California/Cal, Florida State/FSU). SCHEDULE_TEAM_ALIASES is the
   bridge; walk it so both spellings resolve. */
const scheduleNameFor = new Map();
for (const entry of data.TEAM_SCHEDULES) {
  const aliased = data.ALIASES[entry.team] || entry.team;
  if (coached.has(aliased)) {
    scheduleNameFor.set(entry.team, aliased);
    coached.set(entry.team, coached.get(aliased));
  } else if (coached.has(entry.team)) {
    scheduleNameFor.set(entry.team, entry.team);
  }
}
const isCoached = (name) => scheduleNameFor.has(name) || coached.has(data.ALIASES[name] || name);
const confFor = (name) => (coached.get(name) || coached.get(data.ALIASES[name] || name) || {}).conference || "?";
const handleFor = (name) => (coached.get(name) || coached.get(data.ALIASES[name] || name) || {}).handle || "CPU";

/* Teams the file actually carries a slate for. An entry with an
   empty weeks array is a placeholder for a departed coach and is
   deliberately skipped, not failed. */
const slates = data.TEAM_SCHEDULES.filter((t) => Array.isArray(t.weeks) && t.weeks.length);
const placeholders = data.TEAM_SCHEDULES.filter((t) => !t.weeks || !t.weeks.length);

/* A slate that already carries scores is a season in progress or
   finished, not a preseason build. Every check below still runs, but
   the game-count and CCG checks have to allow for the conference
   championship and the postseason, which did not exist when the
   slate was transcribed. */
const played = slates.some((t) => t.weeks.some((r) => r.teamScore != null));

/* An empty file is the normal state the morning after a rollover:
   every coached team has an entry, nobody has sent a screenshot yet.
   That is the start of the job, not a failure of it. */
if (!slates.length) {
  console.log(`\n  ${league.label} — ${data.SEASON.year || "?"} preseason`);
  console.log(`  no slates transcribed yet (${placeholders.length} team entr${placeholders.length === 1 ? "y" : "ies"} waiting).`);
  console.log(`  Nothing to audit. Re-run as the screenshots come in.\n`);
  process.exit(0);
}

const fails = [];
const warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

/* ------------------------------------------------------------
   1. A slate for every coached team
   ------------------------------------------------------------ */
const haveSlate = new Set();
for (const t of slates) {
  haveSlate.add(t.team);
  haveSlate.add(data.ALIASES[t.team] || t.team);
}
const reportedMissing = new Set();
for (const [team] of coached) {
  if (haveSlate.has(team)) continue;
  /* "Cal" and "California" are the same coach seen through the alias
     table — report the pair once. */
  const canon = data.ALIASES[team] || team;
  if (reportedMissing.has(canon)) continue;
  reportedMissing.add(canon);
  fail(`no slate for coached team "${team}" (${handleFor(team)}) — transcribe their screenshots`);
}

/* ------------------------------------------------------------
   2. Per-team structure: game count, week coverage, note rows
   ------------------------------------------------------------ */
const perTeam = new Map();
for (const t of slates) {
  const regular = t.weeks.filter((r) => r.week <= CCG_WEEK && !r.round);
  const games = regular.filter((r) => !r.note && r.week <= LAST_REGULAR_WEEK);
  const notes = regular.filter((r) => r.note);
  const weeks = regular.map((r) => r.week);
  perTeam.set(t.team, { games, notes, entry: t });

  if (games.length !== EXPECT) {
    fail(`${t.team}: ${games.length} games, expected ${EXPECT}`);
  }

  const dupes = weeks.filter((w, i) => weeks.indexOf(w) !== i);
  if (dupes.length) fail(`${t.team}: two rows for week ${[...new Set(dupes)].join(", ")}`);

  /* Gaps in the week column are what make a slate read half-finished
     on the site. Checked against every row the team has, including a
     conference-championship row written after the fact. */
  const have = new Set(t.weeks.map((r) => r.week));
  const missing = [];
  for (let w = 0; w <= CCG_WEEK; w++) if (!have.has(w)) missing.push(w);
  if (missing.length) fail(`${t.team}: no row for week ${missing.join(", ")} — the slate reads incomplete on the site`);

  const sorted = weeks.every((w, i) => i === 0 || weeks[i - 1] <= w);
  if (!sorted) warn(`${t.team}: rows are not in week order`);

  const an = regular.find((r) => r.week === ARMY_NAVY_WEEK);
  if (an && !an.note) warn(`${t.team}: week ${ARMY_NAVY_WEEK} carries a game, not the Army-Navy note`);
  if (an && an.note && !/army-navy/i.test(an.note)) {
    warn(`${t.team}: week ${ARMY_NAVY_WEEK} note is "${an.note}", expected "Army-Navy Week"`);
  }
  const ccg = t.weeks.find((r) => r.week === CCG_WEEK);
  if (ccg && !ccg.note && !played) {
    warn(`${t.team}: week ${CCG_WEEK} carries a game — a preseason file shouldn't know the CCG yet`);
  }

  const byes = regular.filter((r) => r.note && /^bye$/i.test(r.note) && r.week < ARMY_NAVY_WEEK);
  const expectedByes = ARMY_NAVY_WEEK - EXPECT;
  if (byes.length !== expectedByes) {
    fail(`${t.team}: ${byes.length} in-season BYE rows, expected ${expectedByes}`);
  }

  for (const r of games) {
    if (!r.opponent) fail(`${t.team} wk${r.week}: row has no opponent`);
    if (r.location !== "vs" && r.location !== "at") {
      fail(`${t.team} wk${r.week}: location is "${r.location}", must be "vs" or "at"`);
    }
    if (!r.stadium) fail(`${t.team} wk${r.week} vs ${r.opponent}: no stadium`);
    if (FCS_SET.has(String(r.opponent).toLowerCase())) {
      fail(`${t.team} wk${r.week}: ${r.opponent} is FCS — not allowed on a user's slate`);
    }
  }
}

/* ------------------------------------------------------------
   3. Head-to-head mirroring
   ------------------------------------------------------------
   Both halves of a coach-vs-coach game live in two files' worth of
   rows. They have to agree on week, site, stadium and neutrality,
   or the site renders the same game twice with different facts.
   ------------------------------------------------------------ */
const h2hCount = new Map();
for (const t of slates) {
  for (const r of perTeam.get(t.team).games) {
    if (!isCoached(r.opponent)) continue;
    h2hCount.set(t.team, (h2hCount.get(t.team) || 0) + 1);

    const other = slates.find((s) => s.team === r.opponent || (data.ALIASES[s.team] || s.team) === (data.ALIASES[r.opponent] || r.opponent));
    if (!other) {
      fail(`${t.team} wk${r.week} ${r.location} ${r.opponent}: opponent is coached but has no slate`);
      continue;
    }
    const mirror = (perTeam.get(other.team) || { games: [] }).games.find(
      (g) => g.week === r.week && (g.opponent === t.team || (data.ALIASES[g.opponent] || g.opponent) === (data.ALIASES[t.team] || t.team))
    );
    if (!mirror) {
      fail(`${t.team} wk${r.week} ${r.location} ${r.opponent}: ${other.team} has no matching week-${r.week} row`);
      continue;
    }
    if (mirror.location === r.location) {
      fail(`${t.team} wk${r.week} vs ${r.opponent}: both sides say "${r.location}" — one of them has to travel`);
    }
    if (mirror.stadium !== r.stadium) {
      fail(`${t.team} wk${r.week} vs ${r.opponent}: stadium disagrees ("${r.stadium}" vs "${mirror.stadium}")`);
    }
    if (!!mirror.neutral !== !!r.neutral) {
      fail(`${t.team} wk${r.week} vs ${r.opponent}: neutral flag set on one side only`);
    }
  }
}

/* ------------------------------------------------------------
   4. Everyone gets enough user games
   ------------------------------------------------------------ */
const MIN_H2H = 3;
for (const t of slates) {
  const n = h2hCount.get(t.team) || 0;
  if (n < MIN_H2H) {
    fail(`${t.team} (${handleFor(t.team)}): only ${n} head-to-head game${n === 1 ? "" : "s"} — minimum is ${MIN_H2H}`);
  }
}

/* ------------------------------------------------------------
   5. A pair meeting twice in the regular season
   ------------------------------------------------------------ */
const pairWeeks = new Map();
for (const t of slates) {
  for (const r of perTeam.get(t.team).games) {
    if (!isCoached(r.opponent)) continue;
    const key = [t.team, r.opponent].sort().join(" / ");
    if (!pairWeeks.has(key)) pairWeeks.set(key, new Set());
    pairWeeks.get(key).add(r.week);
  }
}
for (const [pair, weeks] of pairWeeks) {
  if (weeks.size > 1) {
    warn(`${pair} meet twice (weeks ${[...weeks].sort((a, b) => a - b).join(", ")}) — intended only if one is a conference rematch`);
  }
}

/* ------------------------------------------------------------
   6. A CPU team booked by two coaches in the same week
   ------------------------------------------------------------ */
const cpuWeek = new Map();
for (const t of slates) {
  for (const r of perTeam.get(t.team).games) {
    if (isCoached(r.opponent)) continue;
    const key = `${r.opponent}#${r.week}`;
    if (!cpuWeek.has(key)) cpuWeek.set(key, []);
    cpuWeek.get(key).push(t.team);
  }
}
for (const [key, teams] of cpuWeek) {
  if (teams.length > 1) {
    const [opp, wk] = key.split("#");
    fail(`${opp} is booked in week ${wk} by ${teams.join(" and ")} — a CPU team can only play once`);
  }
}

/* ------------------------------------------------------------
   7. Home/away balance and streaks
   ------------------------------------------------------------ */
const balance = [];
for (const t of slates) {
  const games = perTeam.get(t.team).games.slice().sort((a, b) => a.week - b.week);
  let home = 0, away = 0, neutral = 0;
  for (const g of games) {
    if (g.neutral) neutral++;
    else if (g.location === "vs") home++;
    else away++;
  }
  let runH = 0, runA = 0, maxH = 0, maxA = 0;
  for (const g of games) {
    if (g.neutral) { runH = 0; runA = 0; continue; }
    if (g.location === "vs") { runH++; runA = 0; } else { runA++; runH = 0; }
    maxH = Math.max(maxH, runH); maxA = Math.max(maxA, runA);
  }
  balance.push({ team: t.team, handle: handleFor(t.team), home, away, neutral, maxH, maxA, h2h: h2hCount.get(t.team) || 0 });
  if (home < 5) warn(`${t.team}: only ${home} true home game${home === 1 ? "" : "s"} (${neutral} neutral) — target is 6-7`);
  if (maxH >= 5) warn(`${t.team}: ${maxH} straight home games`);
  if (maxA >= 4) warn(`${t.team}: ${maxA} straight road games`);
}

/* ------------------------------------------------------------
   8. Unrecognised opponents
   ------------------------------------------------------------
   Every opponent the file has never otherwise seen. Usually a
   misread name off a screenshot; occasionally a real program the
   league simply hasn't played yet.
   ------------------------------------------------------------ */
const known = new Set();
for (const t of data.TEAM_SCHEDULES) known.add(t.team);
for (const c of data.COACHES) for (const n of String(c.team).split("/")) known.add(n.trim());
const oppCount = new Map();
for (const t of slates) {
  for (const r of perTeam.get(t.team).games) {
    oppCount.set(r.opponent, (oppCount.get(r.opponent) || 0) + 1);
  }
}

/* ------------------------------------------------------------
   One team in detail
   ------------------------------------------------------------ */
if (args.team) {
  const t = slates.find((s) => s.team.toLowerCase() === String(args.team).toLowerCase());
  if (!t) {
    console.log(`\n  no slate for "${args.team}". Teams: ${slates.map((s) => s.team).join(", ")}\n`);
    process.exit(1);
  }
  const b = balance.find((x) => x.team === t.team);
  console.log(`\n  ${t.team} — ${handleFor(t.team)} · ${confFor(t.team)}`);
  console.log(`  ${b.home}H / ${b.away}A${b.neutral ? ` / ${b.neutral}N` : ""} · ${b.h2h} head-to-head\n`);
  const rows = t.weeks.filter((r) => r.week <= CCG_WEEK && !r.round);
  for (const r of rows.slice().sort((a, b2) => a.week - b2.week)) {
    const wk = `wk${String(r.week).padStart(2)}`;
    if (r.note) { console.log(`  ${wk}  — ${r.note}`); continue; }
    const site = r.neutral ? "vs" : r.location;
    const tag = isCoached(r.opponent) ? `  [${handleFor(r.opponent)}]` : "";
    console.log(`  ${wk}  ${site} ${r.opponent}${r.neutral ? " (neutral)" : ""} — ${r.stadium}${tag}`);
  }
  console.log("");
}

/* ------------------------------------------------------------
   Report
   ------------------------------------------------------------ */
console.log(`\n  ${league.label} — ${data.SEASON.year || "?"} schedule audit`);
console.log(`  ${slates.length} slate(s), ${slates.reduce((n, t) => n + perTeam.get(t.team).games.length, 0)} regular-season game rows`);
if (played) {
  console.log(`  NOTE  this season has scores in it — it is being audited after the fact.`);
  console.log(`        Weeks ${CCG_WEEK + 1}-19 and the conference championship are excluded.`);
}
if (placeholders.length) {
  console.log(`  ${placeholders.length} empty placeholder entr${placeholders.length === 1 ? "y" : "ies"}: ${placeholders.map((p) => p.team).join(", ")}`);
}
console.log("");

if (!QUIET && !args.team) {
  console.log("  TEAM                 COACH              H/A/N    H2H   LONGEST RUN");
  for (const b of balance.slice().sort((x, y) => x.home - y.home || x.team.localeCompare(y.team))) {
    const run = `${b.maxH}H / ${b.maxA}A`;
    console.log(
      `  ${b.team.padEnd(20)} ${b.handle.padEnd(18)} ${String(b.home).padStart(2)}/${String(b.away).padStart(2)}/${b.neutral}    ${String(b.h2h).padStart(2)}    ${run}`
    );
  }
  console.log("");

  const unknown = [...oppCount.entries()].filter(([n]) => !known.has(n)).sort((a, b2) => b2[1] - a[1]);
  if (unknown.length) {
    console.log(`  opponents this league has not otherwise seen (${unknown.length}) — check the spelling against the screenshots:`);
    console.log(`    ${unknown.map(([n, c]) => `${n}${c > 1 ? ` x${c}` : ""}`).join(", ")}`);
    console.log("");
  }
}

for (const w of warns) console.log(`  WARN  ${w}`);
if (warns.length) console.log("");
for (const f of fails) console.log(`  FAIL  ${f}`);

if (!fails.length) {
  console.log(`  PASS  ${warns.length ? `all checks passed (${warns.length} warning${warns.length === 1 ? "" : "s"} above)` : "all checks passed"}\n`);
  process.exit(0);
}
console.log(`\n  ${fails.length} failure${fails.length === 1 ? "" : "s"}\n`);
process.exit(1);
