#!/usr/bin/env node
/* ============================================================
   CFP — transcribe a week's playoff rankings and bracket
   ------------------------------------------------------------
   From week 10 the game stops showing the AP Top 25 and starts
   showing the CFP Top 25 plus a projected 12-team bracket. This is
   tools/top25.js for that half of the season: it takes the same
   dead-simple transcribed lines and writes the CFP_POLL and
   CFP_BRACKET blocks that cfp-data.js expects.

   WHY A SECOND SCRIPT AND NOT A FLAG ON THE FIRST
   The poll half really is identical, and this file reuses top25.js's
   parser and checks rather than copying them. What isn't identical
   is the bracket: twelve seeds, an automatic-qualifier marker, and a
   projected/final state that has no AP-era equivalent. Bolting that
   onto a script whose entire job is "25 rows" would have made the
   common case harder to read for the sake of not having two files.

   USAGE
     node tools/cfp.js --week 10 --poll poll.txt --bracket bracket.txt
     node tools/cfp.js --week 11 --poll poll.txt            (poll only)
     node tools/cfp.js --week 14 --bracket bracket.txt --final
     node tools/cfp.js --week 10 --poll p.txt --bracket b.txt --dry-run

   POLL INPUT — 25 lines, exactly what top25.js takes

     1 Ohio State 8-0
     2 Oregon 8-0
     3. Michigan 7-1

   BRACKET INPUT — 12 lines, seed / team / record, optional marker

     1 Ohio State 8-0 *
     2 Oregon 8-0
     ...
     12 USF 8-0 *

   A trailing "*" (or "AQ", or "auto") is the in-game asterisk: a
   conference champion holding an automatic bid. It's display-only.

   BOWL NAMES — optional directive lines, anywhere in the same file

     qf: Cotton, Rose, Fiesta, Peach
     sf: Orange, Sugar
     nc: National Championship
     site: Las Vegas, NV

   `qf` is four names TOP TO BOTTOM, matching the bracket you're
   reading; `sf` is two; `r1` is four if the game names the
   first-round sites. `site` is where the title game is played and is
   taken whole, commas and all.

   ENTER EACH ONE ONCE. The site merges bowl names forward key by
   key, so quarterfinal bowls entered in week 10 keep showing when
   semifinal bowls arrive in week 13. They're a fact about the
   season, not about the week, and re-entering them every week is
   just another chance to typo one.

   TWELVE SEEDS AND NOTHING ELSE. Don't transcribe the matchups. The
   bracket's shape is fixed — 1-4 bye, then 5v12 / 6v11 / 7v10 / 8v9
   feeding 4 / 3 / 2 / 1 — so the site draws the lines from the seed
   list. There is deliberately no second copy of the pairings that
   could disagree with the seeds.

   FLAGS
     --league SLUG   main | 3star | 1star. Defaults to main.
     --week N        the week this is for, 10-15. Required.
     --poll PATH     the 25 CFP Top 25 lines.
     --bracket PATH  the 12 seed lines.
     --final         this bracket is settled, not projected. Use it
                     on the bracket entered after the conference
                     championship games.
     --dry-run       show the blocks and every check. Write nothing.
     --allow-new     accept team names the league has never seen.
     --force         overwrite a week that already exists.

   At least one of --poll / --bracket is required. Most weeks you'll
   pass both, because both screenshots come off the same screen.

   THE FROZEN-HISTORY RULE, AGAIN
   A CFP week is history exactly the way an AP week is: the "#N"
   badges on week 12's games read week 12's CFP poll, and the bracket
   is a record of what the field looked like that week. This script
   refuses a week that already exists, and --force is for fixing a
   transcription the same night, before anyone has seen it.

   Node built-ins only. No dependencies, no network.
   ============================================================ */

const fs = require("fs");
const path = require("path");

/* CFP_ERA_WEEK comes from lib/league.js rather than being restated
   here: the gate and the two writers have to agree on where the AP
   poll ends, and Node can share the constant. script.js can't — it's
   a browser file with no module system — so its copy is the one place
   the number appears twice. */
const { parseArgs, die, resolveLeague, loadData, CFP_ERA_WEEK } = require("./lib/league");
const { parseLines, checkStructure, checkNames } = require("./top25");

const POLL_SIZE = 25;
const FIELD_SIZE = 12;
const MAX_WEEK = 15;

/* ------------------------------------------------------------
   READING THE BRACKET
   ------------------------------------------------------------
   Same shape of line as the poll — number, team, record — with an
   optional automatic-qualifier marker on the end. The marker is
   stripped before the line is parsed, so the record stays pinned to
   the end of the line and team names can keep containing digits,
   spaces and punctuation without any escaping rules.
   ------------------------------------------------------------ */
/* Which directive keys are lists, and how long each list must be.
   Length is checked here rather than trusted, because a three-name
   `qf` line silently leaves one quarterfinal unlabelled — a missing
   label looks like a design choice, not like a typo. */
const BOWL_LISTS = { r1: 4, qf: 4, sf: 2 };

function parseBracketLines(text) {
  const rows = [];
  const problems = [];
  const bowls = {};

  String(text)
    .split("\n")
    .forEach((raw, i) => {
      const lineNo = i + 1;
      let line = raw.replace(/\s+/g, " ").trim();
      if (!line) return;

      /* Bowl directives. Matched before anything else so a bowl whose
         name starts with a number can't be read as a seed row. */
      const dir = line.match(/^(r1|qf|sf|nc|site)\s*:\s*(.+)$/i);
      if (dir) {
        const key = dir[1].toLowerCase();
        const value = dir[2].trim();
        if (key === "site" || key === "nc") {
          bowls[key] = value; // taken whole — "Las Vegas, NV" has a comma in it
          return;
        }
        const names = value.split(",").map((v) => v.trim()).filter(Boolean);
        if (names.length !== BOWL_LISTS[key]) {
          problems.push(
            `line ${lineNo}: "${key}:" needs ${BOWL_LISTS[key]} names separated by commas, read ${names.length}` +
              (names.length ? ` (${names.join(" / ")})` : "")
          );
          return;
        }
        bowls[key] = names;
        return;
      }

      if (/^(seed|team|record|bracket|playoff|week \d+)\b/i.test(line) && !/^\d/.test(line)) return;

      /* Pull the auto-qualifier marker off first. In-game it's an
         asterisk pinned to the team name; transcribers also write
         "AQ" or "auto", so all three are accepted. */
      let auto = false;
      const marker = line.match(/[\s*]*(\*|\bAQ\b|\bauto(?:matic)?\b)\s*$/i);
      if (marker) {
        auto = true;
        line = line.slice(0, marker.index).trim();
      }
      // "5 Alabama* 7-1" — asterisk glued to the name rather than trailing.
      if (/\*/.test(line)) {
        auto = true;
        line = line.replace(/\*/g, "").replace(/\s+/g, " ").trim();
      }

      const m = line.match(/^(\d{1,2})[.):]?\s+(.+?)\s+(\d{1,2}\s*[-–—:]\s*\d{1,2})$/);
      if (!m) {
        problems.push(
          `line ${lineNo}: couldn't read "${raw.trim()}"\n` +
            `      expected: SEED TEAM W-L [*]   e.g.  12 USF 8-0 *`
        );
        return;
      }

      const [, seedStr, teamRaw, recordRaw] = m;
      const team = teamRaw.trim().replace(/\s*,$/, "");
      const record = recordRaw.replace(/\s*[-–—:]\s*/, "-");

      if (team.includes('"')) {
        problems.push(`line ${lineNo}: team name contains a quote character — "${team}"`);
        return;
      }

      rows.push({ seed: Number(seedStr), rank: Number(seedStr), team, record, auto, lineNo });
    });

  return { rows, bowls, problems };
}

/* Exactly the seeds 1-12, once each, no school twice. Same reasoning
   as the poll's structural check: naming WHICH seed is missing or
   doubled points straight at the row to re-read. `rank` is set equal
   to `seed` above purely so the poll's checker, which speaks in
   ranks, can be reused verbatim here. */
function checkBracketStructure(rows) {
  const problems = [];

  if (rows.length !== FIELD_SIZE) {
    problems.push(
      `read ${rows.length} teams, expected ${FIELD_SIZE}. ` +
        (rows.length < FIELD_SIZE
          ? `Some rows didn't parse or the screenshot was cut off.`
          : `Something was counted twice.`)
    );
  }

  const seen = new Set();
  const dupes = [];
  rows.forEach((r) => (seen.has(r.seed) ? dupes.push(r.seed) : seen.add(r.seed)));
  if (dupes.length) {
    problems.push(`duplicate seed${dupes.length > 1 ? "s" : ""}: ${[...new Set(dupes)].join(", ")}`);
  }

  const missing = [];
  for (let i = 1; i <= FIELD_SIZE; i++) if (!seen.has(i)) missing.push(i);
  if (missing.length && rows.length) {
    problems.push(`no team at seed${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
  }

  rows
    .filter((r) => r.seed < 1 || r.seed > FIELD_SIZE)
    .forEach((r) => problems.push(`line ${r.lineNo}: seed ${r.seed} is outside 1-${FIELD_SIZE}`));

  const byTeam = new Map();
  rows.forEach((r) => {
    const k = r.team.toLowerCase();
    byTeam.set(k, [...(byTeam.get(k) || []), r.seed]);
  });
  byTeam.forEach((seeds, k) => {
    if (seeds.length > 1) {
      problems.push(`"${k}" appears at seeds ${seeds.join(" and ")} — a team can't be in the field twice`);
    }
  });

  return problems;
}

/* ------------------------------------------------------------
   THE BRACKET IS ARITHMETIC — this only prints it
   ------------------------------------------------------------
   Same table the site derives from. Printed so the transcriber can
   compare the matchups against the screenshot's own lines, which is
   the one check the data itself can't do: if the seeds are read off
   correctly the bracket is right by construction, and if a seed was
   swapped the wrong matchup is what makes it obvious.
   ------------------------------------------------------------ */
const R1_PAIRS = [[12, 5], [9, 8], [11, 6], [10, 7]];
const BYE_FOR_R1 = [4, 1, 3, 2];

function bracketDiagram(rows) {
  const bySeed = new Map(rows.map((r) => [r.seed, r]));
  const nm = (s) => {
    const t = bySeed.get(s);
    return t ? `${String(s).padStart(2)} ${t.team}${t.auto ? "*" : ""}` : `${s} ?`;
  };

  const out = [];
  out.push(`   First round                         Quarterfinal`);
  R1_PAIRS.forEach(([lo, hi], i) => {
    out.push(`   ${nm(lo).padEnd(20)} vs ${nm(hi).padEnd(14)} -> vs ${nm(BYE_FOR_R1[i])}`);
  });
  out.push("");
  out.push(`   Semifinals: [4/5/12] v [1/8/9]   and   [3/6/11] v [2/7/10]`);
  return out;
}

/* ------------------------------------------------------------
   NAME CHECKING
   ------------------------------------------------------------
   Wider than top25.js's version: a CFP-era name should also be
   recognised if it only ever appeared in an earlier CFP poll or
   bracket. Otherwise week 11 would re-flag every school week 10
   already established.
   ------------------------------------------------------------ */
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
  (data.CFP_POLL || []).forEach((p) => (p.teams || []).forEach((t) => add(t.team)));
  (data.CFP_BRACKET || []).forEach((b) => (b.seeds || []).forEach((s) => add(s.team)));

  return names;
}

/* ------------------------------------------------------------
   MOVEMENT
   ------------------------------------------------------------
   Against the previous week's poll of EITHER kind. Week 10 is the
   changeover, so its only comparison is the week 9 AP poll — which
   is the right one to make: it's the movement the game itself shows
   when the committee's first rankings land.
   ------------------------------------------------------------ */
const BIG_MOVE = 12;

function weeklyPolls(data) {
  const byWeek = new Map();
  (data.TOP25 || []).forEach((p) => p && p.week != null && byWeek.set(Number(p.week), { ...p, kind: "AP" }));
  (data.CFP_POLL || []).forEach((p) => p && p.week != null && byWeek.set(Number(p.week), { ...p, kind: "CFP" }));
  return byWeek;
}

function movementReport(rows, data, week) {
  const byWeek = weeklyPolls(data);
  const priors = [...byWeek.keys()].filter((w) => w < week).sort((a, b) => a - b);
  if (!priors.length) return { lines: [], suspicious: [] };

  const prevWeek = priors[priors.length - 1];
  const prevBlock = byWeek.get(prevWeek);
  const prev = new Map();
  (prevBlock.teams || []).forEach((t) => prev.set(String(t.team).toLowerCase(), Number(t.rank)));

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
      if (Math.abs(diff) >= BIG_MOVE) suspicious.push(`${r.team}: ${was} -> ${r.rank} (${Math.abs(diff)} spots)`);
    });

  return { lines, suspicious, prevWeek, prevKind: prevBlock.kind };
}

/* ------------------------------------------------------------
   THE WRITER
   ------------------------------------------------------------
   Insertion, not regeneration — cfp-data.js opens with a header
   comment the commissioner relies on, and rewriting the file from
   parsed data would quietly discard it. Blocks go in at the position
   that keeps weeks ascending. The two arrays are found by their own
   `const NAME = [` line and closed at the first `];` after it, so
   they can sit in either order in the file.
   ------------------------------------------------------------ */
function renderPollBlock(week, rows) {
  const teams = [...rows]
    .sort((a, b) => a.rank - b.rank)
    .map((t) => `      { rank: ${t.rank}, team: "${t.team}", record: "${t.record}" },`)
    .join("\n");
  return [`  {`, `    week: ${week},`, `    teams: [`, teams, `    ],`, `  },`].join("\n");
}

const q = (v) => `"${String(v).replace(/"/g, "")}"`;

function renderBracketBlock(week, rows, { projected, bowls }) {
  const seeds = [...rows]
    .sort((a, b) => a.seed - b.seed)
    .map(
      (t) =>
        `      { seed: ${String(t.seed).padStart(2)}, team: "${t.team}", record: "${t.record}"` +
        (t.auto ? `, auto: true` : ``) +
        ` },`
    )
    .join("\n");

  const out = [`  {`, `    week: ${week},`, `    projected: ${projected},`, `    seeds: [`, seeds, `    ],`];

  /* Only the keys actually given. An empty `bowls: {}` in the file
     would read as "this season has no bowl names", which is a
     different claim from "they haven't been entered yet" — and the
     site merges forward, so absent is the honest way to say it. */
  const keys = Object.keys(bowls || {}).filter((k) => bowls[k] && bowls[k].length);
  if (keys.length) {
    out.push(`    bowls: {`);
    keys.forEach((k) => {
      const v = bowls[k];
      out.push(`      ${k}: ${Array.isArray(v) ? `[${v.map(q).join(", ")}]` : q(v)},`);
    });
    out.push(`    },`);
  }

  out.push(`  },`);
  return out.join("\n");
}

function arrayBounds(lines, name) {
  const start = lines.findIndex((l) => new RegExp(`^const ${name} = \\[`).test(l));
  if (start === -1) {
    die(`cfp-data.js doesn't contain a "const ${name} = [" declaration — refusing to guess`);
  }
  // Single-line empty array: `const CFP_POLL = [];`
  if (/^const \w+ = \[\s*\];\s*$/.test(lines[start])) return { start, close: start, empty: true };

  for (let i = start + 1; i < lines.length; i++) {
    if (/^\];\s*$/.test(lines[i])) return { start, close: i, empty: false };
  }
  die(`couldn't find the end of the ${name} array in cfp-data.js`);
}

function insertBlock(file, name, week, block) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");
  const { start, close, empty } = arrayBounds(lines, name);

  /* An empty `const X = [];` has to become a multi-line array before
     anything can be inserted into it. */
  if (empty) {
    lines.splice(start, 1, `const ${name} = [`, ...block.split("\n"), `];`);
    fs.writeFileSync(file, lines.join("\n"));
    return start + 2;
  }

  let insertAt = close;
  for (let i = start + 1; i < close; i++) {
    const m = lines[i].match(/^ {4}week:\s*(\d+)\s*,/);
    if (!m) continue;
    if (Number(m[1]) > week) {
      insertAt = /^ {2}\{\s*$/.test(lines[i - 1] || "") ? i - 1 : i;
      break;
    }
  }

  lines.splice(insertAt, 0, ...block.split("\n"));
  fs.writeFileSync(file, lines.join("\n"));
  return insertAt + 1;
}

function removeWeek(file, name, week) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");
  const { start, close, empty } = arrayBounds(lines, name);
  if (empty) return false;

  let weekIdx = -1;
  for (let i = start + 1; i < close; i++) {
    const m = lines[i].match(/^ {4}week:\s*(\d+)\s*,/);
    if (m && Number(m[1]) === week) {
      weekIdx = i;
      break;
    }
  }
  if (weekIdx === -1) return false;

  const open = /^ {2}\{\s*$/.test(lines[weekIdx - 1] || "") ? weekIdx - 1 : weekIdx;
  let end = -1;
  for (let i = weekIdx; i < close; i++) {
    if (/^ {2}\},\s*$/.test(lines[i])) {
      end = i;
      break;
    }
  }
  if (end === -1) die(`couldn't find the end of the existing week ${week} block in ${name}`);

  lines.splice(open, end - open + 1);
  fs.writeFileSync(file, lines.join("\n"));
  return true;
}

function readInput(file, what) {
  if (!fs.existsSync(file)) die(`no such ${what} file: ${file}`);
  return fs.readFileSync(file, "utf8");
}

function reportProblems(week, what, problems, tail) {
  console.error(`\n  Week ${week} ${what} didn't check out — nothing written.\n`);
  problems.forEach((p) => console.error(`    - ${p}`));
  console.error(`\n${tail}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------
   MAIN
   ------------------------------------------------------------ */
function main() {
  const args = parseArgs(process.argv.slice(2));
  const league = resolveLeague(args.league || "main");
  const dryRun = args.flags.has("dry-run");
  const allowNew = args.flags.has("allow-new");
  const force = args.flags.has("force");
  const projected = !args.flags.has("final");

  const file = league.paths.cfp;
  if (!fs.existsSync(file)) {
    die(
      `${league.slug} has no cfp-data.js.\n` +
        `  Copy main/cfp-data.js (header and two empty arrays) into ${league.dir}/ to start that league's CFP era.`
    );
  }

  /* --- week --- */
  if (args.week === undefined) {
    die(`missing --week. Example: node tools/cfp.js --week 10 --poll poll.txt --bracket bracket.txt`);
  }
  const week = Number(args.week);
  if (!Number.isInteger(week) || week < CFP_ERA_WEEK || week > MAX_WEEK) {
    /* Two different mistakes, two different answers. Below 10 is the
       AP era and there's another script for it. Above 15 is a bowl
       week, where there is nothing to transcribe at all: the poll
       freezes at the seeding poll and the bracket is already final,
       so the only thing that changes is results. */
    die(
      week > MAX_WEEK && Number.isInteger(week)
        ? `week ${week} is a bowl week — there is no poll or bracket to enter.\n` +
            `  The CFP Top 25 freezes at the Week ${MAX_WEEK} seeding poll and the bracket is\n` +
            `  already final by then. Playoff RESULTS go in ${league.dir}/postseason-data.js,\n` +
            `  and the bracket fills itself in from those.`
        : `--week must be ${CFP_ERA_WEEK}-${MAX_WEEK}, got "${args.week}".\n` +
            `  Weeks 0-${CFP_ERA_WEEK - 1} are the AP poll — use tools/top25.js for those.`
    );
  }

  if (!args.poll && !args.bracket) {
    die(`nothing to do. Pass --poll poll.txt, --bracket bracket.txt, or both.`);
  }

  const data = loadData(league.paths);
  const known = knownTeamNames(data);

  /* --- already-entered check, before anything is parsed --- */
  const existingPoll = (data.CFP_POLL || []).find((p) => Number(p.week) === week);
  const existingBracket = (data.CFP_BRACKET || []).find((b) => Number(b.week) === week);
  const clashes = [];
  if (args.poll && existingPoll) clashes.push(`the week ${week} CFP poll`);
  if (args.bracket && existingBracket) clashes.push(`the week ${week} bracket`);
  if (clashes.length && !force) {
    die(
      `${clashes.join(" and ")} ${clashes.length > 1 ? "are" : "is"} already in ${league.dir}/cfp-data.js.\n` +
        `  A CFP week is frozen history the same way an AP week is — the "#N" badges on every\n` +
        `  week ${week} game read that poll, and the bracket records what the field looked like then.\n` +
        `  If this is a transcription you're fixing before anyone saw it, re-run with --force.\n` +
        `  Otherwise you probably meant a different week.`
    );
  }

  const out = { poll: null, bracket: null };

  /* --- poll --- */
  let pollRows = null;
  if (args.poll) {
    const { rows, problems: parseProblems } = parseLines(readInput(args.poll, "poll"));
    const problems = [...parseProblems, ...checkStructure(rows)];
    if (problems.length) {
      reportProblems(
        week,
        "CFP Top 25",
        problems,
        `  Re-read the screenshot for the rows named above. Every line must be\n` +
          `  RANK TEAM W-L, one per team, ranks 1-${POLL_SIZE} exactly once each.`
      );
    }
    const { typos, novel } = checkNames(rows, known);
    if ((typos.length || novel.length) && !allowNew) {
      reportProblems(
        week,
        "CFP Top 25",
        [
          ...typos.map((t) => `rank ${t.rank}: "${t.team}" — did you mean "${t.suggestion}"?`),
          ...novel.map((t) => `rank ${t.rank}: "${t.team}" — never seen in this league`),
        ],
        `  Fix any misspellings and run again. If a name really is right as written,\n` +
          `  re-run with --allow-new to accept it.`
      );
    }
    pollRows = rows;
    out.poll = { block: renderPollBlock(week, rows), typos, novel };
  }

  /* --- bracket --- */
  let bracketRows = null;
  let bracketBowls = {};
  if (args.bracket) {
    const { rows, bowls, problems: parseProblems } = parseBracketLines(
      readInput(args.bracket, "bracket")
    );
    bracketBowls = bowls;
    const problems = [...parseProblems, ...checkBracketStructure(rows)];
    if (problems.length) {
      reportProblems(
        week,
        "bracket",
        problems,
        `  Re-read the bracket screenshot. Every line must be SEED TEAM W-L, optionally\n` +
          `  followed by * for an automatic qualifier — twelve lines, seeds 1-${FIELD_SIZE} once each.`
      );
    }
    const { typos, novel } = checkNames(rows, known);
    if ((typos.length || novel.length) && !allowNew) {
      reportProblems(
        week,
        "bracket",
        [
          ...typos.map((t) => `seed ${t.seed}: "${t.team}" — did you mean "${t.suggestion}"?`),
          ...novel.map((t) => `seed ${t.seed}: "${t.team}" — never seen in this league`),
        ],
        `  Fix any misspellings and run again. If a name really is right as written,\n` +
          `  re-run with --allow-new to accept it.`
      );
    }
    bracketRows = rows;
    out.bracket = {
      block: renderBracketBlock(week, rows, { projected, bowls }),
      typos,
      novel,
    };
  }

  /* --- cross-check: the field should come out of the poll --- */
  const crossWarnings = [];
  if (pollRows && bracketRows) {
    const pollByName = new Map(pollRows.map((r) => [r.team.toLowerCase(), r]));
    bracketRows.forEach((b) => {
      const p = pollByName.get(b.team.toLowerCase());
      if (!p) {
        crossWarnings.push(`seed ${b.seed} ${b.team} isn't in this week's CFP Top 25 at all`);
      } else if (p.record !== b.record) {
        crossWarnings.push(
          `${b.team}: bracket says ${b.record}, poll says ${p.record} — one of them was misread`
        );
      }
    });
  }

  /* --- report --- */
  console.log(`\n  ${league.label} — Week ${week} CFP`);

  if (pollRows) {
    console.log(`\n  CFP Top 25: ${POLL_SIZE} teams read, ranks 1-${POLL_SIZE} complete.\n`);
    const { lines, suspicious, prevWeek, prevKind } = movementReport(pollRows, data, week);
    if (lines.length) {
      console.log(`  Movement vs week ${prevWeek} (${prevKind}):\n`);
      lines.forEach((l) => console.log(l));
      if (prevKind === "AP") {
        console.log(
          `\n  Week ${prevWeek} was the AP poll and this is the committee's first look, so\n` +
            `  large moves here are normal — the two polls are not the same measurement.`
        );
      }
      if (suspicious.length && prevKind === "CFP") {
        console.log(`\n  Big moves — worth a second look at the screenshot:`);
        suspicious.forEach((s) => console.log(`    - ${s}`));
      }
    } else {
      [...pollRows]
        .sort((a, b) => a.rank - b.rank)
        .forEach((r) => console.log(`   ${String(r.rank).padStart(2)}  ${r.team.padEnd(22)} ${r.record}`));
    }
    console.log("");
  }

  if (bracketRows) {
    console.log(`  Bracket: ${FIELD_SIZE} seeds read${projected ? " (projected)" : " (FINAL — not projected)"}.`);
    const autos = bracketRows.filter((r) => r.auto).length;
    console.log(`  ${autos} automatic qualifier${autos === 1 ? "" : "s"} marked.\n`);
    bracketDiagram(bracketRows).forEach((l) => console.log(l));
    console.log("");

    const named = Object.keys(bracketBowls);
    if (named.length) {
      console.log(`  Bowl names recorded: ${named.join(", ")}`);
      console.log(`  They merge forward — you won't need to enter these again this season.\n`);
    } else {
      console.log(
        `  No bowl names in this bracket. Add "qf: Cotton, Rose, Fiesta, Peach" (and\n` +
          `  "sf:" / "nc:" / "site:" once the game names them) to the bracket file — once\n` +
          `  per season, not per week.\n`
      );
    }
  }

  if (crossWarnings.length) {
    console.log(`  Poll and bracket disagree — check both screenshots:`);
    crossWarnings.forEach((w) => console.log(`    - ${w}`));
    console.log("");
  }

  /* Poll and bracket overlap by twelve teams, so an unfamiliar name
     lands in both lists. Reported once, against whichever was read
     first — saying "USF is new" twice reads like two problems. */
  const seenName = new Set();
  const dedupe = (list) =>
    list.filter((t) => {
      const k = t.team.toLowerCase();
      if (seenName.has(k)) return false;
      seenName.add(k);
      return true;
    });

  const novelAll = dedupe([...(out.poll?.novel || []), ...(out.bracket?.novel || [])]);
  const typosAll = dedupe([...(out.poll?.typos || []), ...(out.bracket?.typos || [])]);

  if (novelAll.length) {
    console.log(`  New to the league data (accepted via --allow-new):`);
    novelAll.forEach((t) => console.log(`    - ${t.team}`));
    console.log("");
  }
  if (typosAll.length) {
    console.log(`  Accepted via --allow-new, but close to a name the league already uses.`);
    console.log(`  Check these against the screenshot before pushing:`);
    typosAll.forEach((t) => console.log(`    - "${t.team}"  (close to "${t.suggestion}")`));
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
        `  The season is on week ${currentWeek}, so none of this shows on the site until you\n` +
          `  advance to week ${week}. That's the intended order — the advance gate is waiting on it.\n`
      );
    }
  }

  if (dryRun) {
    console.log(`  --dry-run: nothing written. The blocks would be:\n`);
    if (out.poll) console.log(`  CFP_POLL:\n${out.poll.block.replace(/^/gm, "  ")}\n`);
    if (out.bracket) console.log(`  CFP_BRACKET:\n${out.bracket.block.replace(/^/gm, "  ")}\n`);
    return;
  }

  /* --- write --- */
  const written = [];
  if (out.poll) {
    if (existingPoll) {
      removeWeek(file, "CFP_POLL", week);
      console.log(`  --force: removed the existing week ${week} CFP_POLL block.`);
    }
    written.push(`CFP_POLL at line ${insertBlock(file, "CFP_POLL", week, out.poll.block)}`);
  }
  if (out.bracket) {
    if (existingBracket) {
      removeWeek(file, "CFP_BRACKET", week);
      console.log(`  --force: removed the existing week ${week} CFP_BRACKET block.`);
    }
    written.push(`CFP_BRACKET at line ${insertBlock(file, "CFP_BRACKET", week, out.bracket.block)}`);
  }

  console.log(`  Written to ${league.dir}/cfp-data.js — ${written.join(", ")}.\n`);
  console.log(`  Next:`);
  console.log(`    1. Check it — node tools/serve.js, or just read the diff.`);
  console.log(`    2. git add -A && git commit -m "Week ${week} CFP poll + bracket" && git push`);
  if (league.slug === "main") {
    console.log(`    3. Advance when you're ready — node tools/advance.js --week ${week} --next "..."\n`);
  } else {
    console.log("");
  }
}

if (require.main === module) main();

module.exports = {
  parseBracketLines,
  checkBracketStructure,
  knownTeamNames,
  renderPollBlock,
  renderBracketBlock,
  insertBlock,
  removeWeek,
  R1_PAIRS,
  BYE_FOR_R1,
  CFP_ERA_WEEK,
};
