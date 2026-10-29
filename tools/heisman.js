#!/usr/bin/env node
/* ============================================================
   HEISMAN — add a week's in-game Heisman Watch to heisman-data.js
   ------------------------------------------------------------
   The Heisman Watch screen always lists four players. This takes
   that screen as JSON, checks it, and inserts a { week, players }
   block into <league>/heisman-data.js, keeping weeks in order.

   USAGE
     node tools/heisman.js --week 3 --file watch.json
     node tools/heisman.js --week 3 --file watch.json --dry-run
     node tools/heisman.js --league main --week 3 --stdin < watch.json

   INPUT — an array of four players, or { "players": [...] }:
     [
       { "rank": 1, "name": "Malachi Toney", "pos": "WR",
         "team": "Miami", "year": "SR",
         "number": 1, "archetype": "Elusive Route Runner",
         "ovr": 98, "height": "5'11\"", "weight": 190,
         "hometown": "Freeport, FL",
         "stats": [["CATCHES", 21], ["REC YDS", 344], ["REC TD", 4]] },
       ...
     ]
   rank, name, pos, team, year and stats are required (stats may be
   [] when not captured). The card fields are optional. Stats are
   [label, value] pairs in the order the game shows them — the
   labels differ by position and the site prints them as given.

   gameLog is optional: the player's View Player Stats > Game Log
   screen, one entry per game, in the game's own columns:
       "gameLog": [
         { "week": 1, "opponent": "USF", "result": "W 38-17",
           "stats": [["REC", 7], ["YDS", 118], ["TD", 1]] }, ...
       ]
   week and stats are required on each entry; opponent and result
   are whatever the screen shows (leave out if it doesn't).

   FLAGS
     --week N        the week this snapshot is for, 0-19. Required.
     --league SLUG   main (default), 3star, 1star.
     --dry-run       check and print, write nothing.
     --allow-new     accept a team name the league has never seen,
                     after checking its spelling against the screen.
     --force         overwrite a week that's already in the file.
                     That week is public history — only on request.

   Like every tool here it edits the file and stops. Review the diff,
   then commit.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const { parseArgs, die, resolveLeague, loadData } = require("./lib/league");
const { knownTeamNames, checkNames } = require("./top25");

const LIST_SIZE = 4;
const MIN_WEEK = 0;
const MAX_WEEK = 19;
const CARD_FIELDS = ["number", "archetype", "ovr", "height", "weight", "hometown"];

function checkStatPairs(stats, at, problems) {
  stats.forEach((s, j) => {
    if (!Array.isArray(s) || s.length !== 2 || typeof s[0] !== "string" || !s[0].trim()) {
      problems.push(`${at}: stat ${j + 1} must be ["LABEL", value]`);
    } else if (typeof s[1] !== "number" && typeof s[1] !== "string") {
      problems.push(`${at}: stat "${s[0]}" has a value that isn't a number or text`);
    }
  });
}

function readInput(args) {
  let text;
  if (args.file) {
    if (!fs.existsSync(args.file)) die(`no such file: ${args.file}`);
    text = fs.readFileSync(args.file, "utf8");
  } else if (args.flags.has("stdin")) {
    text = fs.readFileSync(0, "utf8");
  } else {
    die(`no input. Pass --file watch.json or pipe it in with --stdin.`);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    die(`input isn't valid JSON — ${e.message}`);
  }
  const players = Array.isArray(parsed) ? parsed : parsed && parsed.players;
  if (!Array.isArray(players)) die(`expected an array of players, or { "players": [...] }`);
  return players;
}

/* Everything that would make a row unreadable on the site. */
function checkPlayers(players) {
  const problems = [];
  if (players.length !== LIST_SIZE) {
    problems.push(`read ${players.length} players, expected ${LIST_SIZE}. The Heisman Watch is always four.`);
  }
  const ranks = new Map();
  players.forEach((p, i) => {
    const at = `player ${i + 1}${p && p.name ? ` (${p.name})` : ""}`;
    if (!p || typeof p !== "object") return problems.push(`${at}: not an object`);
    const r = Number(p.rank);
    if (!Number.isInteger(r) || r < 1 || r > LIST_SIZE) problems.push(`${at}: rank must be 1-${LIST_SIZE}, got ${JSON.stringify(p.rank)}`);
    else if (ranks.has(r)) problems.push(`${at}: rank ${r} is also ${ranks.get(r)}`);
    else ranks.set(r, p.name);
    for (const k of ["name", "pos", "team", "year"]) {
      if (typeof p[k] !== "string" || !p[k].trim()) problems.push(`${at}: missing "${k}"`);
      else if (p[k].includes('"') && k !== "height") problems.push(`${at}: "${k}" contains a quote character`);
    }
    if (!Array.isArray(p.stats)) {
      problems.push(`${at}: "stats" must be an array of [label, value] pairs ([] if not captured)`);
    } else {
      checkStatPairs(p.stats, at, problems);
      const labels = p.stats.map((s) => Array.isArray(s) && String(s[0]).toUpperCase());
      const dup = labels.find((l, j) => l && labels.indexOf(l) !== j);
      if (dup) problems.push(`${at}: stat "${dup}" appears twice`);
    }
    if (p.gameLog !== undefined) {
      if (!Array.isArray(p.gameLog)) problems.push(`${at}: "gameLog" must be an array`);
      else {
        const wks = new Set();
        p.gameLog.forEach((g, j) => {
          const gat = `${at} game log row ${j + 1}`;
          if (!g || typeof g !== "object") return problems.push(`${gat}: not an object`);
          const w = Number(g.week);
          if (!Number.isInteger(w) || w < MIN_WEEK || w > MAX_WEEK) problems.push(`${gat}: week must be ${MIN_WEEK}-${MAX_WEEK}`);
          else if (wks.has(w)) problems.push(`${gat}: week ${w} appears twice`);
          else wks.add(w);
          for (const k of ["opponent", "result"]) {
            if (g[k] !== undefined && (typeof g[k] !== "string" || g[k].includes('"'))) problems.push(`${gat}: "${k}" must be plain text`);
          }
          if (!Array.isArray(g.stats)) problems.push(`${gat}: "stats" must be an array of [label, value] pairs`);
          else checkStatPairs(g.stats, gat, problems);
          const ex = Object.keys(g).filter((k) => !["week", "opponent", "result", "stats"].includes(k));
          if (ex.length) problems.push(`${gat}: unknown field ${ex.join(", ")}`);
        });
      }
    }
    const extra = Object.keys(p).filter(
      (k) => !["rank", "name", "pos", "team", "year", "stats", "gameLog", ...CARD_FIELDS].includes(k)
    );
    if (extra.length) problems.push(`${at}: unknown field${extra.length > 1 ? "s" : ""} ${extra.join(", ")}`);
  });
  const names = players.map((p) => p && String(p.name || "").toLowerCase());
  const twice = names.find((n, i) => n && names.indexOf(n) !== i);
  if (twice) problems.push(`"${twice}" is listed twice`);
  return problems;
}

function lit(v) {
  return typeof v === "number" ? String(v) : JSON.stringify(String(v));
}

function renderBlock(week, players) {
  const rows = [...players]
    .sort((a, b) => a.rank - b.rank)
    .map((p) => {
      const head = [
        `rank: ${Number(p.rank)}`,
        `name: ${lit(p.name.trim())}`,
        `pos: ${lit(p.pos.trim())}`,
        `team: ${lit(p.team.trim())}`,
        `year: ${lit(p.year.trim())}`,
        ...CARD_FIELDS.filter((k) => p[k] !== undefined && p[k] !== null && p[k] !== "").map(
          (k) => `${k}: ${lit(p[k])}`
        ),
      ].join(", ");
      const pairs = (arr) => arr.map((s) => `[${lit(s[0].trim())}, ${lit(s[1])}]`).join(", ");
      const log = Array.isArray(p.gameLog) && p.gameLog.length
        ? `,\n        gameLog: [\n${[...p.gameLog]
            .sort((a, b) => a.week - b.week)
            .map((g) => `          { week: ${Number(g.week)}${g.opponent ? `, opponent: ${lit(g.opponent.trim())}` : ""}${g.result ? `, result: ${lit(g.result.trim())}` : ""}, stats: [${pairs(g.stats)}] },`)
            .join("\n")}\n        ]`
        : "";
      return `      { ${head},\n        stats: [${pairs(p.stats)}]${log} },`;
    })
    .join("\n");
  return [`  {`, `    week: ${week},`, `    players: [`, rows, `    ],`, `  },`].join("\n");
}

function openArray(lines, file) {
  const startIdx = lines.findIndex((l) => /^const HEISMAN = \[/.test(l));
  if (startIdx === -1) die(`${path.basename(file)} doesn't contain a "const HEISMAN = [" declaration — refusing to guess`);
  if (/^const HEISMAN = \[\];\s*$/.test(lines[startIdx])) lines.splice(startIdx, 1, "const HEISMAN = [", "];");
  let closeIdx = -1;
  for (let i = lines.length - 1; i > startIdx; i--) {
    if (/^\];\s*$/.test(lines[i])) { closeIdx = i; break; }
  }
  if (closeIdx === -1) die(`couldn't find the end of the HEISMAN array in ${path.basename(file)}`);
  return { startIdx, closeIdx };
}

function removeWeek(lines, week) {
  const weekIdx = lines.findIndex((l) => {
    const m = l.match(/^ {4}week:\s*(\d+)\s*,/);
    return m && Number(m[1]) === week;
  });
  if (weekIdx === -1) return;
  const open = /^ {2}\{\s*$/.test(lines[weekIdx - 1] || "") ? weekIdx - 1 : weekIdx;
  let close = -1;
  for (let i = weekIdx; i < lines.length; i++) if (/^ {2}\},\s*$/.test(lines[i])) { close = i; break; }
  if (close === -1) die(`couldn't find the end of the existing week ${week} block`);
  lines.splice(open, close - open + 1);
}

function insertBlock(file, week, block, replace) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  if (replace) removeWeek(lines, week);
  const { startIdx, closeIdx } = openArray(lines, file);
  let insertAt = closeIdx;
  for (let i = startIdx + 1; i < closeIdx; i++) {
    const m = lines[i].match(/^ {4}week:\s*(\d+)\s*,/);
    if (m && Number(m[1]) > week) {
      insertAt = /^ {2}\{\s*$/.test(lines[i - 1] || "") ? i - 1 : i;
      break;
    }
  }
  lines.splice(insertAt, 0, ...block.split("\n"));
  fs.writeFileSync(file, lines.join("\n"));
  return insertAt + 1;
}

function movement(players, data, week) {
  const prior = (data.HEISMAN || []).map((w) => Number(w.week)).filter((w) => w < week).sort((a, b) => a - b);
  const prev = new Map();
  if (prior.length) {
    const blk = data.HEISMAN.find((w) => Number(w.week) === prior[prior.length - 1]);
    (blk.players || []).forEach((p) => prev.set(String(p.name).toLowerCase(), Number(p.rank)));
  }
  return [...players]
    .sort((a, b) => a.rank - b.rank)
    .map((p) => {
      const was = prev.get(String(p.name).toLowerCase());
      const move = !prior.length ? "" : was === undefined ? "NEW" : was === p.rank ? "-" : was > p.rank ? `up ${was - p.rank}` : `dn ${p.rank - was}`;
      const stats = p.stats.length ? p.stats.map((s) => `${s[0]} ${s[1]}`).join(", ") : "(no stats)";
      return `   ${p.rank}  ${p.pos.padEnd(3)} ${p.name.padEnd(22)} ${p.team.padEnd(16)} ${move.padEnd(5)} ${stats}`;
    });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const league = resolveLeague(args.league || "main");
  const dryRun = args.flags.has("dry-run");
  const file = league.paths.heisman;

  if (!fs.existsSync(file)) {
    die(`${league.slug} has no heisman-data.js. To start one, copy the header from main/heisman-data.js and begin with "const HEISMAN = [];".`);
  }
  if (args.week === undefined) die(`missing --week. Example: node tools/heisman.js --week 3 --file watch.json`);
  const week = Number(args.week);
  if (!Number.isInteger(week) || week < MIN_WEEK || week > MAX_WEEK) die(`--week must be a whole number ${MIN_WEEK}-${MAX_WEEK}, got "${args.week}".`);

  const players = readInput(args);
  const problems = checkPlayers(players);
  if (problems.length) die(`Week ${week} Heisman Watch has problems — nothing written.\n\n    - ${problems.join("\n    - ")}\n`);

  const data = loadData(league.paths);
  const existing = (data.HEISMAN || []).some((w) => Number(w.week) === week);
  if (existing && !args.flags.has("force")) {
    die(`week ${week} is already in ${path.basename(file)}. Each week is frozen history.\n  If you really meant to replace it, re-run with --force.`);
  }

  const known = knownTeamNames(data);
  (data.HEISMAN || []).forEach((w) => (w.players || []).forEach((p) => known.add(p.team)));
  const { typos, novel } = checkNames(players.map((p) => ({ team: p.team, rank: p.rank })), known);
  const allowNew = args.flags.has("allow-new");
  if (!allowNew && (typos.length || novel.length)) {
    const lines = [
      ...typos.map((t) => `rank ${t.rank}: "${t.team}" — did you mean "${t.suggestion}"?`),
      ...novel.map((t) => `rank ${t.rank}: "${t.team}" — a team this league has never seen`),
    ];
    die(`Week ${week} Heisman Watch has team names to check — nothing written.\n\n    - ${lines.join("\n    - ")}\n\n  Check the spelling against the screen, then re-run with --allow-new if it's right.`);
  }

  console.log(`\n  ${league.label} — Week ${week} Heisman Watch\n`);
  movement(players, data, week).forEach((l) => console.log(l));
  console.log("");

  if (dryRun) {
    console.log(`  --dry-run: nothing written.\n`);
    return;
  }
  const at = insertBlock(file, week, renderBlock(week, players), existing);
  console.log(`  Written to ${league.dir}/heisman-data.js at line ${at}.\n`);
  console.log(`  It shows on the Top 25 tab once the season is at week ${week} or later.\n`);
}

if (require.main === module) main();
module.exports = { checkPlayers, renderBlock };
