#!/usr/bin/env node
/* ============================================================
   BRACKET-SYNC — put the next playoff round on the schedule
   ------------------------------------------------------------
   From Bowl Week 1 the bracket stops being a projection and starts
   being a fixture list: once a first-round game is final, the two
   teams' next opponents are no longer a guess. This tool reads that
   fixture list and writes the games a COACHED team is about to play
   into schedule-data.js as unplayed rows.

   WHY IT EXISTS
   Adding those rows by hand is the step that gets forgotten (see
   CLAUDE.md), and it is forgotten in the worst possible place: the
   admin score page can only record a score onto a row that already
   exists, so a missing row means the quarterfinal can't be entered,
   which means the bracket can't advance, which means the NEXT row is
   missing too. One skipped edit stalls the whole postseason.

   NOTHING HERE IS A NEW FACT. The seeds come from the final
   CFP_BRACKET block in cfp-data.js, the results come from the same
   two places the bracket on the site reads (coached teams'
   schedules, and postseason-data.js for CPU-vs-CPU games), and the
   pairings are arithmetic on the seed list — the identical
   arithmetic script.js does to draw the tree. This tool derives
   exactly what the site already derives, and writes down the one
   part the site cannot: a row for a game nobody has played yet.

   USAGE
     node tools/bracket-sync.js --week 16
     node tools/bracket-sync.js --league 3star --week 17 --dry-run

   FLAGS
     --league SLUG      main | 3star | 1star. Defaults to main.
     --week N           the bowl week to fill in, 16-19. Required.
     --dry-run          show what would be written. Write nothing.
     --allow-projected  work off a bracket still marked projected.
                        For looking only — the field can still change.

   WHAT IT WILL NOT DO
   - It never writes a CPU-vs-CPU game. Those have no coach's
     schedule to live on and belong in postseason-data.js, entered
     with `tools/cfp.js --week N --results`. The two files must never
     hold the same game, so this tool reports them and stops there.
   - It never touches a row that already exists, scored or not. A row
     you added by hand wins; re-running is safe and silent.
   - It never invents a result. A round whose feeder games aren't
     final yet produces the matchups it can and names the ones it is
     still waiting on.

   THE FIRST ROUND IS ON CAMPUS, everything after is neutral. The
   host is the better seed, and its stadium is read off its own home
   games this season rather than kept in a table here — one less list
   to go stale when a team moves.

   Node built-ins only. No dependencies, no network.
   ============================================================ */

const fs = require("fs");

const {
  parseArgs,
  die,
  resolveLeague,
  loadData,
  makeResolver,
  weekLabel,
  REGULAR_FINAL_WEEK,
  FINAL_WEEK,
} = require("./lib/league");

/* The bracket's fixed shape, stated exactly as script.js states it:
   [lower seed, higher seed] per first-round game top to bottom, and
   the bye seed each winner goes on to meet. Index-aligned. */
const R1_PAIRS = [[12, 5], [9, 8], [11, 6], [10, 7]];
const BYE_FOR_R1 = [4, 1, 3, 2];

const ROUND_FOR_WEEK = { 16: "cfp-r1", 17: "cfp-qf", 18: "cfp-sf", 19: "cfp-nc" };

/* ------------------------------------------------------------
   THE BRACKET
   ------------------------------------------------------------ */
function finalBracket(data, opts) {
  const list = Array.isArray(data.CFP_BRACKET) ? data.CFP_BRACKET : [];
  if (!list.length) die("no CFP_BRACKET in cfp-data.js — nothing to sync from.");

  const b = list[list.length - 1];
  if (b.projected && !opts.allowProjected) {
    die(
      `the newest bracket (week ${b.week}) is still marked projected.\n` +
        `  The field isn't settled, so the matchups under it aren't either. Enter the\n` +
        `  post-championship bracket first:\n` +
        `    node tools/cfp.js --week 15 --bracket bracket.txt --final\n` +
        `  Or pass --allow-projected to look without writing anything.`
    );
  }
  if (!Array.isArray(b.seeds) || b.seeds.length !== 12) {
    die(`the week ${b.week} bracket has ${(b.seeds || []).length} seeds, expected 12.`);
  }
  return b;
}

/* Bowl names, MERGED FORWARD KEY BY KEY — the same rule cfpBowlsFor()
   uses in script.js, and for the same reason: the quarterfinal bowls
   are named weeks before the semifinal ones, and taking the newest
   bracket's `bowls` wholesale would blank the earlier keys. */
function bowlsFor(data) {
  const out = {};
  (Array.isArray(data.CFP_BRACKET) ? data.CFP_BRACKET : [])
    .slice()
    .sort((a, b) => Number(a.week) - Number(b.week))
    .forEach((b) => Object.assign(out, b.bowls || {}));
  return out;
}

/* ------------------------------------------------------------
   WHO WON
   ------------------------------------------------------------
   Two sources, and a game is only ever in one of them: a coached
   team's playoff game is a row on that coach's schedule, a CPU-vs-CPU
   game is in postseason-data.js. This is the Node half of
   cfpGameWinner() in script.js — same union, same precedence, and it
   has to stay that way: a disagreement between the two would show up
   as the site drawing one bracket while this tool wrote rows for a
   different one.
   ------------------------------------------------------------ */
function makeWinnerLookup(data, R) {
  const weekOfRound = (roundId) =>
    Number(Object.keys(ROUND_FOR_WEEK).find((w) => ROUND_FOR_WEEK[w] === roundId));

  const decide = (aName, bName, aScore, bScore) => {
    if (aScore == null || bScore == null) return null;
    if (Number(aScore) === Number(bScore)) return null; // no ties in the CFP
    return Number(aScore) > Number(bScore) ? aName : bName;
  };

  return function winnerOf(roundId, a, b) {
    if (!a || !b) return null;
    const ka = R.rosterKeyFor(a);
    const kb = R.rosterKeyFor(b);
    const week = weekOfRound(roundId);

    /* 1. The schedules. A row only counts if it names the round — two
          teams can meet twice in a season, and "they played in week
          17" is not the same claim as "they played the quarterfinal". */
    for (const team of data.TEAM_SCHEDULES || []) {
      const kt = R.rosterKeyFor(team.team);
      if (kt !== ka && kt !== kb) continue;

      for (const w of team.weeks || []) {
        if (Number(w.week) !== week || w.round !== roundId || !w.opponent) continue;
        const ko = R.rosterKeyFor(w.opponent);
        if (!((kt === ka && ko === kb) || (kt === kb && ko === ka))) continue;
        /* Scores are stored from this team's perspective regardless of
           who is home, which is the one thing to get right here. */
        const won = decide(team.team, w.opponent, w.teamScore, w.opponentScore);
        if (won) return won;
      }
    }

    /* 2. postseason-data.js — the CPU-only games. */
    const rounds = (data.POSTSEASON && data.POSTSEASON.rounds) || [];
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return null;
    const g = (round.games || []).find((x) => {
      const kh = R.rosterKeyFor(x.home);
      const kw = R.rosterKeyFor(x.away);
      return (kh === ka && kw === kb) || (kh === kb && kw === ka);
    });
    if (!g) return null;
    return decide(g.home, g.away, g.homeScore, g.awayScore);
  };
}

/* ------------------------------------------------------------
   THE MATCHUPS FOR A ROUND
   ------------------------------------------------------------
   Every round is derived from the one before it, so asking for the
   semifinals asks for the quarterfinals on the way. A slot with no
   result yet comes back null, and the matchup it feeds is reported as
   waiting rather than guessed.
   ------------------------------------------------------------ */
function matchupsFor(roundId, bracket, winnerOf) {
  const bySeed = new Map(bracket.seeds.map((s) => [Number(s.seed), s.team]));

  const r1 = R1_PAIRS.map(([lo, hi], i) => ({
    index: i,
    teams: [bySeed.get(hi), bySeed.get(lo)],
  }));
  if (roundId === "cfp-r1") return r1;

  const qf = r1.map((g, i) => ({
    index: i,
    teams: [bySeed.get(BYE_FOR_R1[i]), winnerOf("cfp-r1", g.teams[0], g.teams[1])],
    waitingOn: g.teams,
  }));
  if (roundId === "cfp-qf") return qf;

  const qfWinner = (i) => winnerOf("cfp-qf", qf[i].teams[0], qf[i].teams[1]);
  const sf = [[0, 1], [2, 3]].map(([a, b], i) => ({
    index: i,
    teams: [qfWinner(a), qfWinner(b)],
    waitingOn: [...qf[a].teams, ...qf[b].teams],
  }));
  if (roundId === "cfp-sf") return sf;

  const sfWinner = (i) => winnerOf("cfp-sf", sf[i].teams[0], sf[i].teams[1]);
  return [
    {
      index: 0,
      teams: [sfWinner(0), sfWinner(1)],
      waitingOn: [...sf[0].teams, ...sf[1].teams],
    },
  ];
}

/* ------------------------------------------------------------
   THE ROW
   ------------------------------------------------------------ */
/* A team's own stadium, read off its home games this season. Home
   means location "vs" and not neutral; the most-used one wins, so a
   one-off neutral game that forgot the flag can't become the team's
   stadium. */
function homeStadiumFor(data, R, team) {
  const key = R.rosterKeyFor(team);
  const block = (data.TEAM_SCHEDULES || []).find((t) => R.rosterKeyFor(t.team) === key);
  if (!block) return null;

  const counts = new Map();
  (block.weeks || []).forEach((w) => {
    if (w.location !== "vs" || w.neutral || !w.stadium) return;
    counts.set(w.stadium, (counts.get(w.stadium) || 0) + 1);
  });
  let best = null;
  counts.forEach((n, s) => {
    if (!best || n > best.n) best = { s, n };
  });
  return best ? best.s : null;
}

function rowFor({ team, opponent, week, roundId, hosts, stadium, title }) {
  const parts = [`{ week: ${week}`, `opponent: "${opponent}"`, `location: "${hosts ? "vs" : "at"}"`];
  if (roundId !== "cfp-r1") parts.push("neutral: true");
  if (stadium) parts.push(`stadium: "${stadium}"`);
  if (title) parts.push(`title: "${title}"`);
  parts.push(`round: "${roundId}"`);
  return { team, week, text: parts.join(", ") + " }," };
}

/* ------------------------------------------------------------
   WRITING
   ------------------------------------------------------------
   Line surgery on schedule-data.js, the way score-core.js does it:
   the file is hand-formatted and carries comments a
   parse-and-reserialise pass would flatten, and it is the league's
   permanent record, so the only safe edit is the smallest one. Each
   row goes into its own team's `weeks` array, after the last row
   already there — which for a bowl week is the end, but the code
   doesn't assume it.
   ------------------------------------------------------------ */
function insertRows(src, rows) {
  const lines = src.split("\n");
  const out = [];
  const done = [];

  let team = null;
  let lastWeekLine = -1; // index in `out` of the last week row seen
  let indent = "      ";

  const flush = (before) => {
    const mine = rows.filter((r) => r.team === team);
    if (!mine.length) return;
    const at = lastWeekLine >= 0 ? lastWeekLine + 1 : before;
    mine
      .slice()
      .sort((a, b) => b.week - a.week) // reversed: each splice pushes the rest down
      .forEach((r) => {
        out.splice(at, 0, indent + r.text);
        done.push(r);
      });
  };

  for (const line of lines) {
    const t = line.match(/^\s*team:\s*"(.+?)",\s*$/);
    if (t) {
      team = t[1];
      lastWeekLine = -1;
    }

    const w = line.match(/^(\s*)\{\s*week:\s*(\d+)/);
    if (w && team) {
      indent = w[1];
      out.push(line);
      lastWeekLine = out.length - 1;
      continue;
    }

    /* End of a `weeks` array: everything for this team goes in before
       the bracket closes, and the team is finished. */
    if (team && /^\s*\],\s*$/.test(line)) {
      flush(out.length);
      team = null;
      lastWeekLine = -1;
    }

    out.push(line);
  }

  return { text: out.join("\n"), written: done };
}

/* ------------------------------------------------------------
   MAIN
   ------------------------------------------------------------ */
function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.flags.has("dry-run");
  const L = resolveLeague(args.league || "main");
  const data = loadData(L.paths);
  const R = makeResolver(data);

  const week = Number(args.week);
  if (!Number.isInteger(week) || week <= REGULAR_FINAL_WEEK || week > FINAL_WEEK) {
    die(
      `--week must be a bowl week, ${REGULAR_FINAL_WEEK + 1}-${FINAL_WEEK}.\n` +
        `  Weeks up to ${REGULAR_FINAL_WEEK} are the regular season; their schedules are already written.`
    );
  }

  const roundId = ROUND_FOR_WEEK[week];
  const bracket = finalBracket(data, { allowProjected: args.flags.has("allow-projected") });
  const winnerOf = makeWinnerLookup(data, R);
  const bowls = bowlsFor(data);

  const seedOf = (team) => {
    const hit = bracket.seeds.find((s) => R.rosterKeyFor(s.team) === R.rosterKeyFor(team));
    return hit ? Number(hit.seed) : null;
  };

  const titleFor = (i) => {
    if (roundId === "cfp-r1") return (bowls.r1 || [])[i] || null;
    if (roundId === "cfp-qf") return (bowls.qf || [])[i] || null;
    if (roundId === "cfp-sf") return (bowls.sf || [])[i] || null;
    return bowls.nc || "National Championship";
  };

  console.log("");
  console.log(`  ${L.label} — ${weekLabel(week)}`);
  console.log(`  Field: the week ${bracket.week} bracket${bracket.projected ? "  (PROJECTED — NOT FINAL)" : ""}.`);
  console.log("");

  const games = matchupsFor(roundId, bracket, winnerOf);
  const rows = [];
  const waiting = [];
  const cpuOnly = [];
  const already = [];

  const hasRow = (team) => {
    const block = (data.TEAM_SCHEDULES || []).find(
      (t) => R.rosterKeyFor(t.team) === R.rosterKeyFor(team)
    );
    return !!(block && (block.weeks || []).some((w) => Number(w.week) === week && w.round === roundId));
  };

  const label = (t) => {
    if (!t) return "—";
    const s = seedOf(t);
    const c = R.coachFor(t, week);
    return `${s != null ? s + " " : ""}${t}${c ? ` (${c})` : ""}`;
  };

  games.forEach((g) => {
    const [a, b] = g.teams;
    const t = titleFor(g.index);
    console.log(`   ${label(a).padEnd(32)} vs  ${label(b).padEnd(32)}${t ? "  " + t : ""}`);

    if (!a || !b) {
      waiting.push(g);
      return;
    }

    const coached = [a, b].filter((x) => R.isLeagueTeam(x, week));
    if (!coached.length) {
      cpuOnly.push([a, b]);
      return;
    }

    coached.forEach((x) => {
      const opp = x === a ? b : a;
      if (hasRow(x)) {
        already.push(`${x} vs ${opp}`);
        return;
      }
      const sx = seedOf(x);
      const so = seedOf(opp);
      const hosts = sx != null && so != null ? sx < so : true;
      rows.push(
        rowFor({
          team: x,
          opponent: opp,
          week,
          roundId,
          hosts,
          /* First round is on campus, so BOTH rows name the host's
             own stadium — an away row carries the venue too, like
             every other away game in the file. From the quarterfinals
             the game is at a bowl site this repo has no address for;
             there the bowl NAME is the fact we hold, and it goes on
             `title`. */
          stadium: roundId === "cfp-r1" ? homeStadiumFor(data, R, hosts ? x : opp) : null,
          title: titleFor(g.index),
        })
      );
    });
  });

  console.log("");

  waiting.forEach((g) => {
    const pending = (g.waitingOn || []).filter(Boolean).join(" / ");
    console.log(`  Waiting on a result${pending ? `: ${pending}` : ""}.`);
  });

  cpuOnly.forEach(([a, b]) => {
    console.log(`  CPU vs CPU — ${a} vs ${b}. Not written here; that one goes in`);
    console.log(`    postseason-data.js:  node tools/cfp.js --week ${week} --results results.txt`);
  });

  already.forEach((s) => console.log(`  Already on the schedule — ${s}. Left alone.`));

  if (!rows.length) {
    console.log("\n  Nothing to write.\n");
    return;
  }

  console.log(`\n  ${rows.length} row${rows.length === 1 ? "" : "s"} to add:\n`);
  rows.forEach((r) => console.log(`    ${r.team.padEnd(16)} ${r.text}`));

  const file = L.paths.schedule;
  const result = insertRows(fs.readFileSync(file, "utf8"), rows);

  if (result.written.length !== rows.length) {
    const missed = rows.filter((r) => !result.written.includes(r));
    die(
      `couldn't find the schedule block for: ${missed.map((r) => r.team).join(", ")}.\n` +
        `  Nothing was written. Check the team name matches schedule-data.js exactly.`
    );
  }

  if (dryRun) {
    console.log("\n  --dry-run: nothing written.\n");
    return;
  }

  fs.writeFileSync(file, result.text, "utf8");
  console.log(`\n  Written to ${L.dir}/schedule-data.js.`);
  console.log("  Scores go in the normal way once the games are played:");
  console.log(`    node tools/scores.js --week ${week}\n`);
}

main();
