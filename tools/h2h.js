#!/usr/bin/env node
/* ============================================================
   H2H — career head-to-head, printed to the terminal
   ------------------------------------------------------------
   A probe for WeekCore.computeH2H. It renders, in text, exactly
   what the roster-card modal will render in HTML — so the numbers
   can be checked against the data files by eye before any markup
   exists, and re-checked from the CLI whenever the aggregation
   changes.

   This tool is READ-ONLY. It never writes a file, never touches
   the network, and never advances anything.

   USAGE
     node tools/h2h.js --league main
         Every coach, with their record against each opponent.

     node tools/h2h.js --league main --coach Projekt
         One coach in detail, every meeting listed.

     node tools/h2h.js --league main --summary
         One line per coach. Good for spotting a name that failed
         to resolve.

     node tools/h2h.js --league main --check
         Consistency checks against computeRankings, plus the
         structural checks listed at runChecks() below. Exits
         non-zero on failure, so it can gate a commit.

   OPTIONS
     --league <main|3star|1star>   default: main
     --coach <handle>              case-insensitive
     --through <week>              cap the current season's regular
                                   weeks, for previewing mid-week
     --summary                     one line per coach
     --check                       run the assertions and exit
   ============================================================ */

const {
  parseArgs,
  die,
  resolveLeague,
  loadCareer,
  listArchivedYears,
  computeH2H,
  computeRankings,
  auditScheduleSides,
} = require("./lib/league");

const args = parseArgs(process.argv);
const league = resolveLeague(args.league || "main");
const career = loadCareer(league);
const years = career.map((s) => s.year);
const archived = listArchivedYears(league);

const opts = {};
if (args.through != null) {
  const w = Number(args.through);
  if (!Number.isInteger(w) || w < 0 || w > 15) die(`--through must be 0-15, got "${args.through}"`);
  opts.throughWeek = w;
}

const H2H = computeH2H(career.map((s) => s.data), opts);

/* ------------------------------------------------------------
   FORMATTING
   ------------------------------------------------------------ */
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

function meetingLine(m) {
  const when = m.phase === "postseason" ? m.label : `${m.year} W${m.week}`;
  const site = m.neutral ? "vs*" : m.home ? "vs " : "at ";
  if (!m.played) {
    return `${pad(when, 22)} ${site} ${pad(m.oppTeam, 20)} ${"—  upcoming"}`;
  }
  const wl = m.win ? "W" : "L";
  const margin = m.margin > 0 ? `+${m.margin}` : String(m.margin);
  return `${pad(when, 22)} ${site} ${pad(m.oppTeam, 20)} ${wl} ${padL(m.pf, 3)}-${padL(
    m.pa,
    3
  )}  ${padL(margin, 4)}${m.sim ? "  [SIM]" : ""}`;
}

function header() {
  console.log(`\n  ${league.label} — career head-to-head`);
  const span = archived.length
    ? `${years.length} season(s): ${years.join(", ")}`
    : `1 season: ${years[0] ?? "unknown year"} (no archived seasons yet)`;
  console.log(`  ${span}`);
  if (opts.throughWeek != null) console.log(`  current season capped at week ${opts.throughWeek}`);
  console.log("");
}

function printSummary() {
  header();
  const rows = [...H2H.values()].sort(
    (a, b) => b.wins - a.wins || a.name.localeCompare(b.name)
  );
  console.log(`  ${pad("COACH", 20)} ${pad("RECORD", 9)} ${pad("OPPONENTS", 10)} MEETINGS`);
  console.log(`  ${"-".repeat(56)}`);
  rows.forEach((c) => {
    const meetings = c.opponents.reduce((s, o) => s + o.meetings.length, 0);
    console.log(
      `  ${pad(c.name, 20)} ${pad(`${c.wins}-${c.losses}`, 9)} ${pad(
        c.opponents.length,
        10
      )} ${meetings}`
    );
  });
  console.log("");
}

function printCoach(c) {
  const teams = c.teams.map((t) => `${t.team} (${t.year})`).join(", ");
  console.log(`\n  ${c.name}   ${c.wins}-${c.losses} vs coaches`);
  console.log(`  ${teams}`);
  console.log(`  ${"-".repeat(66)}`);

  if (!c.opponents.length) {
    console.log("  No head-to-head matchups, played or scheduled.\n");
    return;
  }

  c.opponents.forEach((o) => {
    const rec = o.played ? `${o.wins}-${o.losses}` : "—";
    const up = o.upcoming ? `  (${o.upcoming} upcoming)` : "";
    console.log(`\n  vs ${o.name}   ${rec}${up}`);
    o.meetings.forEach((m) => console.log(`      ${meetingLine(m)}`));
  });
  console.log("");
}

function printAll() {
  header();
  [...H2H.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(printCoach);
}

/* ------------------------------------------------------------
   CHECKS
   ------------------------------------------------------------
   These are the invariants that would otherwise only be caught by
   someone noticing a wrong number on a card months from now.
   ------------------------------------------------------------ */
function runChecks() {
  header();
  let failed = 0;
  const ok = (name, pass, detail) => {
    console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
    if (!pass) failed++;
  };

  const all = [...H2H.values()];

  /* 1. Symmetry. If A has a meeting with B, B has the mirror of it.
        This is the check that catches a one-sided score in the
        schedule file, which is the single most likely data error. */
  let asym = [];
  all.forEach((c) => {
    c.opponents.forEach((o) => {
      const other = H2H.get(o.coachKey);
      const back = other && other.opponents.find((x) => x.coachKey === c.coachKey);
      if (!back) return asym.push(`${c.name} -> ${o.name} has no reverse`);
      if (back.meetings.length !== o.meetings.length)
        asym.push(`${c.name}/${o.name} meeting counts differ (${o.meetings.length} vs ${back.meetings.length})`);
      if (back.wins !== o.losses || back.losses !== o.wins)
        asym.push(`${c.name}/${o.name} records don't mirror (${o.wins}-${o.losses} vs ${back.wins}-${back.losses})`);
    });
  });
  ok("every meeting is symmetric", asym.length === 0, asym.slice(0, 3).join("; "));

  /* 2. The two hand-written halves of each league game agree.
        This reads the RAW week entries, not the built matchups, and
        that distinction is the whole point. buildWeek keeps whichever
        side it reaches first and discards the other, so comparing two
        values it produced would compare one entry with itself and
        could never fail. A disagreement between Michigan's copy of a
        game and Oklahoma's copy is invisible everywhere else on the
        site — it silently resolves to whoever is listed first in
        schedule-data.js. See auditScheduleSides() in week-core.js. */
  let sideProblems = [];
  career.forEach((s) => {
    auditScheduleSides(s.data).forEach((p) =>
      sideProblems.push(`${s.year ?? "?"} wk${p.week} ${p.teams.join("/")} [${p.kind}] ${p.detail}`)
    );
  });
  ok("both halves of every league game agree", sideProblems.length === 0,
    sideProblems.slice(0, 4).join("; "));

  /* 3. Totals add up. A coach's own W-L equals the sum over opponents. */
  let badTotal = all.filter((c) => {
    const w = c.opponents.reduce((s, o) => s + o.wins, 0);
    const l = c.opponents.reduce((s, o) => s + o.losses, 0);
    return w !== c.wins || l !== c.losses;
  });
  ok("per-coach totals match the opponent breakdown", badTotal.length === 0,
    badTotal.map((c) => c.name).join(", "));

  /* 4. No ties. EA College Football plays overtime; a drawn result
        means a mistyped score, and every W/L split downstream
        silently treats a tie as a loss. */
  let ties = [];
  all.forEach((c) => c.opponents.forEach((o) => o.meetings.forEach((m) => {
    if (m.played && m.pf === m.pa) ties.push(`${c.name} ${m.pf}-${m.pa} vs ${o.name} (${m.year} ${m.label})`);
  })));
  ok("no tied results", ties.length === 0, ties.slice(0, 3).join("; "));

  /* 5. Nobody plays themselves. Catches a coachAliases table that
        has merged two handles that are actually different people. */
  let self = all.filter((c) => c.opponents.some((o) => o.coachKey === c.coachKey));
  ok("no coach faces themselves", self.length === 0, self.map((c) => c.name).join(", "));

  /* 6. Agreement with computeRankings on the CURRENT season. The two
        traversals are deliberately separate (see the note above
        computeH2H in week-core.js); this is what stops them drifting.
        computeRankings counts sims and played games but not unplayed
        ones, and is keyed by team, so the comparison is per-coach
        W-L over the current season only. */
  const current = career[career.length - 1].data;
  const currentOnly = computeH2H([current], opts);
  const ranked = computeRankings(current, {
    throughWeek: opts.throughWeek == null ? 15 : opts.throughWeek,
  });
  let mismatch = [];
  ranked.forEach((r) => {
    const c = [...currentOnly.values()].find(
      (x) => x.name.trim().toLowerCase() === String(r.coach).trim().toLowerCase()
    );
    if (!c) return mismatch.push(`${r.coach} ranked but absent from H2H`);
    if (`${c.wins}-${c.losses}` !== r.record)
      mismatch.push(`${r.coach}: H2H ${c.wins}-${c.losses} vs rankings ${r.record}`);
  });
  ok("agrees with computeRankings on this season's records", mismatch.length === 0,
    mismatch.slice(0, 3).join("; "));

  /* 7. Postseason wiring. Absent is fine; malformed is not. */
  const post = current.POSTSEASON;
  ok("postseason block is absent or well-formed",
    !post || Array.isArray(post.rounds),
    post && !Array.isArray(post.rounds) ? "POSTSEASON.rounds is not an array" : "none present");

  console.log(
    failed ? `\n  ${failed} check(s) FAILED\n` : `\n  all checks passed\n`
  );
  process.exit(failed ? 1 : 0);
}

/* ------------------------------------------------------------
   DISPATCH
   ------------------------------------------------------------ */
if (args.flags.has("check")) runChecks();
else if (args.flags.has("summary")) printSummary();
else if (args.coach) {
  const want = String(args.coach).trim().toLowerCase();
  const c = [...H2H.values()].find((x) => x.name.trim().toLowerCase() === want);
  if (!c) {
    const names = [...H2H.values()].map((x) => x.name).sort().join(", ");
    die(`no coach "${args.coach}" in ${league.label}.\n  Known: ${names}`);
  }
  header();
  printCoach(c);
} else printAll();
