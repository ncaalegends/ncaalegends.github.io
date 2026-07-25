#!/usr/bin/env node
/* ============================================================
   TOP 25 — transcribe a week's in-game poll into top25-data.js
   ------------------------------------------------------------
   Takes 25 plain lines of transcribed poll and writes the
   { week: N, teams: [...] } block that top25-data.js expects.

   WHY THIS EXISTS
   The poll arrives as a screenshot, so somebody — a person or a
   model — has to read 25 rows off an image. That part can't be
   automated away. Everything AFTER it can: counting to 25, catching
   a duplicated rank, spotting "Ole Mis" where "Ole Miss" was meant,
   and appending a block to a documented data file without mangling
   the comments around it.

   So the division of labour is deliberate. Whoever reads the
   screenshot produces one dead-simple line per team and hands it
   over. This script owns every judgement after that. Nothing that
   reads the image ever edits the file directly — which is the point,
   because the file is frozen history (see below) and a bad edit is
   not obviously wrong at a glance.

   USAGE
     node tools/top25.js --week 2 --file poll.txt
     node tools/top25.js --week 2 --stdin < poll.txt
     node tools/top25.js --week 2 --file poll.txt --dry-run

   INPUT FORMAT
     One team per line, best to worst. Rank, team, record:

       1 Ohio State 2-0
       2 Oregon 2-0
       3. Notre Dame 1-1

     Leading "1." or "1)" is fine, extra whitespace is fine, blank
     lines are ignored. The record is the trailing W-L; the team is
     everything between. Nothing else is accepted — no JSON, no
     commas, no code. The narrower the input, the fewer ways it goes
     wrong.

   FLAGS
     --league SLUG   main | 3star | 1star. Defaults to main.
     --week N        the week this poll is for, 1-15. Required.
     --file PATH     read the lines from a file.
     --stdin         read the lines from standard input.
     --dry-run       show the block and every check. Write nothing.
     --allow-new     accept team names not seen anywhere in the
                     league data (a genuinely new entrant to the
                     poll). Without it, unrecognised names are
                     reported and nothing is written.
     --force         overwrite a week that already exists. Almost
                     always the wrong thing — read on.

   THE FROZEN-HISTORY RULE
   Each week's poll is permanent record, not a snapshot of "now".
   The schedule shows what a team was ranked WHEN a game was played,
   which it reads out of that week's block. Editing week 2 in
   October silently rewrites the badges on every week-2 game. So
   this script refuses to touch a week that already exists, and
   --force exists only for fixing a transcription you caught the
   same night.

   WHAT HAPPENS NEXT
   Nothing, visibly. The site shows the poll for SEASON.currentWeek,
   so a block written here for a week you haven't advanced to sits
   in the repo invisible. It appears the moment you advance — which
   the advance gate won't let you do until this block exists. That
   ordering is on purpose: poll first, silent; advance second,
   everything surfaces together.

   This script never commits and never posts to Discord. It writes
   one file and tells you exactly what it did.

   Node built-ins only. No dependencies, no network.
   ============================================================ */

const fs = require("fs");
const path = require("path");

const { parseArgs, die, resolveLeague, loadData } = require("./lib/league");

const POLL_SIZE = 25;
const MAX_WEEK = 15;

/* ------------------------------------------------------------
   READING THE LINES
   ------------------------------------------------------------
   Each line is rank, team, record. The record is pinned to the END
   of the line and the rank to the START, so the team is whatever
   survives in between — which is what lets team names contain
   digits ("Miami (OH)"), spaces, ampersands and periods without
   any escaping rules for the transcriber to remember.
   ------------------------------------------------------------ */
function parseLines(text) {
  const rows = [];
  const problems = [];

  const lines = String(text).split("\n");

  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) return;

    /* A pasted screenshot transcription sometimes carries a header
       row. Drop the obvious ones rather than failing on them. */
    if (/^(rank|team|record|top ?25|week \d+)\b/i.test(line) && !/^\d/.test(line)) return;

    const m = line.match(/^(\d{1,2})[.):]?\s+(.+?)\s+(\d{1,2}\s*[-–—:]\s*\d{1,2})$/);
    if (!m) {
      problems.push(
        `line ${lineNo}: couldn't read "${raw.trim()}"\n` +
          `      expected: RANK TEAM W-L   e.g.  7 Texas A&M 2-1`
      );
      return;
    }

    const [, rankStr, teamRaw, recordRaw] = m;
    const team = teamRaw.trim().replace(/\s*,$/, "");
    const record = recordRaw.replace(/\s*[-–—:]\s*/, "-");

    if (team.includes('"')) {
      problems.push(`line ${lineNo}: team name contains a quote character — "${team}"`);
      return;
    }
    if (team.length > 40) {
      problems.push(`line ${lineNo}: team name is ${team.length} characters, which isn't a school`);
      return;
    }

    rows.push({ rank: Number(rankStr), team, record, lineNo });
  });

  return { rows, problems };
}

/* ------------------------------------------------------------
   STRUCTURAL CHECKS
   ------------------------------------------------------------
   A poll is exactly 25 rows holding exactly the ranks 1-25 once
   each. Anything else means a line was dropped, doubled, or
   misread, and the useful thing to say is WHICH — "missing 14,
   duplicate 13" points straight at the two rows to re-read.
   ------------------------------------------------------------ */
function checkStructure(rows) {
  const problems = [];

  if (rows.length !== POLL_SIZE) {
    problems.push(
      `read ${rows.length} teams, expected ${POLL_SIZE}. ` +
        (rows.length < POLL_SIZE
          ? `Some rows didn't parse or the screenshot was cut off.`
          : `Something was counted twice.`)
    );
  }

  const seen = new Map();
  const dupes = [];
  rows.forEach((r) => {
    if (seen.has(r.rank)) dupes.push(r.rank);
    else seen.set(r.rank, r);
  });
  if (dupes.length) {
    problems.push(`duplicate rank${dupes.length > 1 ? "s" : ""}: ${[...new Set(dupes)].join(", ")}`);
  }

  const missing = [];
  for (let i = 1; i <= POLL_SIZE; i++) if (!seen.has(i)) missing.push(i);
  if (missing.length && rows.length) {
    problems.push(`no team at rank${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
  }

  const outOfRange = rows.filter((r) => r.rank < 1 || r.rank > POLL_SIZE);
  outOfRange.forEach((r) => {
    problems.push(`line ${r.lineNo}: rank ${r.rank} is outside 1-${POLL_SIZE}`);
  });

  /* The same school twice is always a misread — usually two rows
     of a screenshot blurring into each other. */
  const byTeam = new Map();
  rows.forEach((r) => {
    const k = r.team.toLowerCase();
    if (!byTeam.has(k)) byTeam.set(k, []);
    byTeam.get(k).push(r.rank);
  });
  byTeam.forEach((ranks, k) => {
    if (ranks.length > 1) {
      problems.push(`"${k}" appears at ranks ${ranks.join(" and ")} — a team can't be in the poll twice`);
    }
  });

  return problems;
}

/* ------------------------------------------------------------
   NAME CHECKING
   ------------------------------------------------------------
   Two different situations look identical in the input and must not
   be treated the same:

     "Ole Mis"   — a transcription error. One edit away from a name
                   that's all over the league data. Blocks.
     "Cincinnati" — a school that genuinely wasn't in the poll last
                   week and isn't on anyone's schedule. Legitimate,
                   and it will happen most weeks. Warns.

   Distinguishing them is what edit distance is for. A name within
   two edits of something known is a typo with near-certainty; a
   name unlike anything known is new. Blocking on the first and
   waving through the second is the difference between a check that
   gets read and a check that gets reflexively --forced.
   ------------------------------------------------------------ */
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3; // caller only cares about <= 2
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

/* Every team name the league has ever referred to: coaches' teams,
   both sides of the alias table, every scheduled opponent, and
   everyone in a previous poll. A CPU school a coach played in week
   1 is in here, which is most of the poll most weeks. */
function knownTeamNames(data) {
  const names = new Set();
  const add = (v) => {
    String(v ?? "")
      .split("/")
      .forEach((part) => {
        const s = part.trim();
        if (s) names.add(s);
      });
  };

  (data.COACHES || []).forEach((c) => add(c.team));
  Object.entries(data.ALIASES || {}).forEach(([k, v]) => {
    add(k);
    add(v);
  });
  (data.TEAM_SCHEDULES || []).forEach((t) => {
    add(t.team);
    (t.weeks || []).forEach((w) => w.opponent && add(w.opponent));
  });
  (data.TOP25 || []).forEach((p) => (p.teams || []).forEach((t) => add(t.team)));

  return names;
}

function checkNames(rows, known) {
  const lookup = new Map();
  known.forEach((n) => lookup.set(n.toLowerCase(), n));

  const typos = [];
  const novel = [];

  rows.forEach((r) => {
    const key = r.team.toLowerCase();
    if (lookup.has(key)) return;

    let best = null;
    let bestD = 3;
    lookup.forEach((original, k) => {
      const d = editDistance(key, k);
      if (d < bestD) {
        bestD = d;
        best = original;
      }
    });

    if (best) typos.push({ ...r, suggestion: best, distance: bestD });
    else novel.push(r);
  });

  return { typos, novel };
}

/* ------------------------------------------------------------
   MOVEMENT
   ------------------------------------------------------------
   Printed for eyeballing, not enforced. The site computes the same
   arrows itself. A team that moved 15 spots in a week is possible
   but rare enough to be worth a second look at the screenshot
   before committing, and reading it here costs nothing.
   ------------------------------------------------------------ */
const BIG_MOVE = 12;

function movementReport(rows, data, week) {
  const priors = (data.TOP25 || [])
    .map((p) => Number(p.week))
    .filter((w) => w < week)
    .sort((a, b) => a - b);
  if (!priors.length) return { lines: [], suspicious: [] };

  const prevWeek = priors[priors.length - 1];
  const prev = new Map();
  (data.TOP25.find((p) => Number(p.week) === prevWeek).teams || []).forEach((t) =>
    prev.set(String(t.team).toLowerCase(), Number(t.rank))
  );

  const lines = [];
  const suspicious = [];

  [...rows]
    .sort((a, b) => a.rank - b.rank)
    .forEach((r) => {
      const was = prev.get(r.team.toLowerCase());
      if (was === undefined) {
        lines.push(`   ${String(r.rank).padStart(2)}  ${r.team.padEnd(22)} ${r.record.padEnd(6)} NEW`);
        return;
      }
      const diff = was - r.rank;
      const move = diff === 0 ? "  -" : `${diff > 0 ? "up" : "dn"} ${String(Math.abs(diff)).padStart(2)}`;
      lines.push(`   ${String(r.rank).padStart(2)}  ${r.team.padEnd(22)} ${r.record.padEnd(6)} ${move}`);
      if (Math.abs(diff) >= BIG_MOVE) {
        suspicious.push(`${r.team}: ${was} -> ${r.rank} (${Math.abs(diff)} spots)`);
      }
    });

  return { lines, suspicious, prevWeek };
}

/* ------------------------------------------------------------
   THE WRITER
   ------------------------------------------------------------
   Insertion, not regeneration. The 50-line header comment in
   top25-data.js is documentation the commissioner relies on, and
   rewriting the file from parsed data would quietly discard it.

   The block goes in at the position that keeps weeks ascending, so
   a week backfilled out of order still reads top-to-bottom. Finding
   that position means matching `week: N` lines at the array's own
   indent level — the header comment contains the literal text
   `{ week: N, teams: [...] }`, so matching has to be anchored to
   indentation and structure rather than to the words.
   ------------------------------------------------------------ */
function renderBlock(week, rows) {
  const teams = [...rows]
    .sort((a, b) => a.rank - b.rank)
    .map((t) => `      { rank: ${t.rank}, team: "${t.team}", record: "${t.record}" },`)
    .join("\n");

  return [`  {`, `    week: ${week},`, `    teams: [`, teams, `    ],`, `  },`].join("\n");
}

function insertBlock(file, week, block) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");

  const startIdx = lines.findIndex((l) => /^const TOP25 = \[/.test(l));
  if (startIdx === -1) {
    die(`${path.basename(file)} doesn't contain a "const TOP25 = [" declaration — refusing to guess`);
  }

  let closeIdx = -1;
  for (let i = lines.length - 1; i > startIdx; i--) {
    if (/^\];\s*$/.test(lines[i])) {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) die(`couldn't find the end of the TOP25 array in ${path.basename(file)}`);

  /* First existing block for a LATER week — the new one goes above
     it. Its opening brace is the line before its `week:` line. */
  let insertAt = closeIdx;
  for (let i = startIdx + 1; i < closeIdx; i++) {
    const m = lines[i].match(/^ {4}week:\s*(\d+)\s*,/);
    if (!m) continue;
    if (Number(m[1]) > week) {
      insertAt = /^ {2}\{\s*$/.test(lines[i - 1] || "") ? i - 1 : i;
      break;
    }
  }

  lines.splice(insertAt, 0, ...block.split("\n"));
  fs.writeFileSync(file, lines.join("\n"));
  return insertAt + 1; // 1-based line number, for the report
}

function removeWeek(file, week) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");

  const weekIdx = lines.findIndex((l) => {
    const m = l.match(/^ {4}week:\s*(\d+)\s*,/);
    return m && Number(m[1]) === week;
  });
  if (weekIdx === -1) return false;

  const open = /^ {2}\{\s*$/.test(lines[weekIdx - 1] || "") ? weekIdx - 1 : weekIdx;
  let close = -1;
  for (let i = weekIdx; i < lines.length; i++) {
    if (/^ {2}\},\s*$/.test(lines[i])) {
      close = i;
      break;
    }
  }
  if (close === -1) die(`couldn't find the end of the existing week ${week} block`);

  lines.splice(open, close - open + 1);
  fs.writeFileSync(file, lines.join("\n"));
  return true;
}

/* ------------------------------------------------------------
   MAIN
   ------------------------------------------------------------ */
function main() {
  const args = parseArgs(process.argv.slice(2));
  const league = resolveLeague(args.league || "main");
  const dryRun = args.flags.has("dry-run");

  if (!fs.existsSync(league.paths.top25)) {
    die(
      `${league.slug} has no top25-data.js — that league doesn't run the poll.\n` +
        `  If it should, copy the header comment from main/top25-data.js and start it with an empty TOP25 array.`
    );
  }

  /* --- week --- */
  if (args.week === undefined) die(`missing --week. Example: node tools/top25.js --week 2 --file poll.txt`);
  const week = Number(args.week);
  if (!Number.isInteger(week) || week < 1 || week > MAX_WEEK) {
    die(`--week must be a whole number 1-${MAX_WEEK}, got "${args.week}". There's no preseason poll.`);
  }

  /* --- input --- */
  let text;
  if (args.file) {
    if (!fs.existsSync(args.file)) die(`no such file: ${args.file}`);
    text = fs.readFileSync(args.file, "utf8");
  } else if (args.flags.has("stdin")) {
    try {
      text = fs.readFileSync(0, "utf8");
    } catch (e) {
      die(`--stdin was given but nothing arrived on standard input`);
    }
  } else {
    die(`no input. Pass --file poll.txt or pipe the lines in with --stdin.`);
  }

  const data = loadData(league.paths);

  /* --- does this week already exist? --- */
  const existing = (data.TOP25 || []).find((p) => Number(p.week) === week);
  if (existing && !args.flags.has("force")) {
    die(
      `week ${week} is already in ${league.slug}/top25-data.js (${(existing.teams || []).length} teams, ` +
        `#1 ${existing.teams?.[0]?.team ?? "?"}).\n` +
        `  Each week's poll is frozen history — the "#N" badges on every week ${week} game read from it,\n` +
        `  so rewriting it changes what those games say they were. If this is a transcription you're\n` +
        `  fixing before anyone saw it, re-run with --force. Otherwise add the week you meant instead.`
    );
  }

  /* --- parse --- */
  const { rows, problems: parseProblems } = parseLines(text);
  const problems = [...parseProblems, ...checkStructure(rows)];

  if (problems.length) {
    console.error(`\n  Week ${week} poll didn't check out — nothing written.\n`);
    problems.forEach((p) => console.error(`    - ${p}`));
    console.error(
      `\n  Re-read the screenshot for the rows named above. Every line must be\n` +
        `  RANK TEAM W-L, one per team, ranks 1-${POLL_SIZE} exactly once each.\n`
    );
    process.exit(1);
  }

  /* --- names --- */
  const { typos, novel } = checkNames(rows, knownTeamNames(data));

  if (typos.length) {
    console.error(`\n  Week ${week} poll has team names that look misread — nothing written.\n`);
    typos.forEach((t) =>
      console.error(`    - rank ${t.rank}: "${t.team}" — did you mean "${t.suggestion}"?`)
    );
    console.error(
      `\n  These are each within a couple of characters of a name already in the league data,\n` +
        `  which is what a misread looks like. Fix the spelling and run again. If one really is\n` +
        `  a different school, spell it the way the roster and schedules spell it.\n`
    );
    process.exit(1);
  }

  if (novel.length && !args.flags.has("allow-new")) {
    console.error(`\n  Week ${week} poll has team names the league has never seen — nothing written.\n`);
    novel.forEach((t) => console.error(`    - rank ${t.rank}: "${t.team}"`));
    console.error(
      `\n  That's normal when a school enters the poll for the first time. Check the spelling\n` +
        `  against the screenshot, then re-run with --allow-new to accept them.\n`
    );
    process.exit(1);
  }

  /* --- report --- */
  const block = renderBlock(week, rows);
  const { lines: moveLines, suspicious, prevWeek } = movementReport(rows, data, week);

  console.log(`\n  ${league.label} — Week ${week} Top 25`);
  console.log(`  ${POLL_SIZE} teams read, ranks 1-${POLL_SIZE} complete, all records well-formed.\n`);

  if (moveLines.length) {
    console.log(`  Movement vs week ${prevWeek}:\n`);
    moveLines.forEach((l) => console.log(l));
    console.log("");
  } else {
    [...rows]
      .sort((a, b) => a.rank - b.rank)
      .forEach((r) => console.log(`   ${String(r.rank).padStart(2)}  ${r.team.padEnd(22)} ${r.record}`));
    console.log("");
  }

  if (novel.length) {
    console.log(`  New to the league data (accepted via --allow-new):`);
    novel.forEach((t) => console.log(`    - ${t.team}`));
    console.log("");
  }

  if (suspicious.length) {
    console.log(`  Big moves — worth a second look at the screenshot:`);
    suspicious.forEach((s) => console.log(`    - ${s}`));
    console.log("");
  }

  const currentWeek = Number(data.SEASON?.currentWeek);
  if (Number.isInteger(currentWeek)) {
    if (week < currentWeek) {
      console.log(
        `  NOTE: the season is on week ${currentWeek}, so this is a backfill of an earlier week.\n` +
          `        It will change the "#N" badges on week ${week} games that are already public.\n`
      );
    } else if (week > currentWeek) {
      console.log(
        `  The season is on week ${currentWeek}, so this poll stays invisible on the site until\n` +
          `  you advance to week ${week}. That's the intended order — the advance gate was\n` +
          `  waiting on exactly this.\n`
      );
    }
  }

  if (dryRun) {
    console.log(`  --dry-run: nothing written. The block would be:\n`);
    console.log(block.replace(/^/gm, "  "));
    console.log("");
    return;
  }

  /* --- write --- */
  if (existing) {
    removeWeek(league.paths.top25, week);
    console.log(`  --force: removed the existing week ${week} block.`);
  }
  const at = insertBlock(league.paths.top25, week, block);

  console.log(`  Written to ${league.dir}/top25-data.js at line ${at}.\n`);
  console.log(`  Next:`);
  console.log(`    1. Check it — node tools/serve.js, or just read the diff.`);
  console.log(`    2. git add -A && git commit -m "Week ${week} Top 25" && git push`);
  console.log(`    3. Advance when you're ready — node tools/advance.js --week ${week} --next "..."\n`);
}

if (require.main === module) main();

module.exports = { parseLines, checkStructure, checkNames, knownTeamNames, renderBlock, insertBlock };
