#!/usr/bin/env node
/* ============================================================
   SCORES — record final scores for a week
   ------------------------------------------------------------
   Writes teamScore / opponentScore into schedule-data.js. For a
   head-to-head game it writes BOTH coaches' entries, mirrored, in
   one step — that pairing is the whole reason this tool exists.
   Doing it by hand means editing two places in a 600-line file and
   remembering to flip the numbers, which is exactly the kind of
   thing that goes wrong at 11pm on advance night.

   USAGE
     node tools/scores.js --week 4                    interactive
     node tools/scores.js --week 4 --set "California 27-24"
     node tools/scores.js --week 4 --dry-run

   FLAGS
     --league SLUG     main | 3star | 1star. Defaults to main.
     --week N          week whose games are final, 0-15. Required.
     --set "T A-B"     non-interactive. Team T scored A, opponent B.
                       Repeatable. Skips the prompts entirely.
     --dry-run         show the diff, write nothing.
     --force           overwrite scores that are already recorded.
                       Without it, finished games are left alone.
     --all             prompt for every game, including ones already
                       final (implies you'll be asked to confirm
                       each overwrite).

   SCORE FORMAT
     Always from the named team's perspective: "California 27-24"
     means California scored 27, their opponent 24 — regardless of
     who was home. The site converts to home/away itself.
     Accepts 27-24, 27 24, or 27:24.

   This script never posts to Discord and never commits. It edits
   one file and tells you what changed.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

/* parseScore, scoreableGames and editsFor now live in
   /week-core.js so the admin page can use the identical rules.
   They come through lib/league.js unchanged. */
const {
  parseArgs,
  die,
  resolveLeague,
  loadData,
  makeResolver,
  buildWeek,
  weekLabel,
  parseWeek,
  parseScore,
  scoreableGames,
  editsFor,
} = require("./lib/league");

/* ------------------------------------------------------------
   THE WRITER
   ------------------------------------------------------------
   Surgical line editing rather than regenerating the file. The
   comments in schedule-data.js are documentation the commissioner
   relies on, and the file's hand-formatting (one week per line)
   is what makes it readable in a diff. Both have to survive.

   Every real week entry is a single line inside a `weeks: [`
   array, under a `team: "..."` line. The prose comments at the top
   of the file also contain `{ week: 4, opponent: ... }` examples,
   which is why matching is scoped to lines that come after a team
   declaration and end in `},` — a comment example never does both.
   ------------------------------------------------------------ */
function applyScores(scheduleFile, edits) {
  const src = fs.readFileSync(scheduleFile, "utf8");
  const lines = src.split("\n");

  // team name -> { week -> {team, opponent} }
  const wanted = new Map();
  for (const e of edits) {
    if (!wanted.has(e.team)) wanted.set(e.team, new Map());
    wanted.get(e.team).set(e.week, { team: e.teamScore, opponent: e.opponentScore, sim: e.sim });
  }

  const applied = [];
  let currentTeam = null;
  let inComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    /* Block comments hold worked examples in the same shape as real
       data. Track them so we never edit documentation. */
    if (!inComment && /\/\*/.test(line) && !/\*\//.test(line)) inComment = true;
    else if (inComment && /\*\//.test(line)) {
      inComment = false;
      continue;
    }
    if (inComment) continue;

    const teamMatch = line.match(/^\s*team:\s*"([^"]+)"\s*,/);
    if (teamMatch) {
      currentTeam = teamMatch[1];
      continue;
    }

    if (!currentTeam || !wanted.has(currentTeam)) continue;

    const entry = line.match(/^(\s*)\{\s*(week:\s*(\d+)\s*,.*?)\s*\}\s*,\s*$/);
    if (!entry) continue;

    const [, indent, body, weekStr] = entry;
    const week = Number(weekStr);
    const target = wanted.get(currentTeam).get(week);
    if (!target) continue;

    /* A bye or a championship placeholder has no opponent to score
       against. Refuse rather than inventing a result. */
    if (!/opponent:/.test(body)) {
      die(
        `${currentTeam} week ${week} has no opponent (it's a bye or note entry) — ` +
          `can't record a score against it`
      );
    }

    /* Whether this game is currently marked as a force-sim. Read
       before stripping, so we can preserve it when the edit itself
       has no opinion (target.sim === undefined, the CLI path). */
    const hadSim = /\bsim:\s*true\b/.test(body);

    const stripped = body
      .replace(/,?\s*teamScore:\s*\d+/g, "")
      .replace(/,?\s*opponentScore:\s*\d+/g, "")
      .replace(/,?\s*sim:\s*(?:true|false)/g, "");

    /* undefined -> keep what's there; true/false -> set it explicitly.
       The flag is written last so a scored line always reads
       teamScore, opponentScore, then sim. */
    const simState = target.sim === undefined ? hadSim : target.sim === true;
    const simPart = simState ? ", sim: true" : "";

    const nextLine =
      `${indent}{ ${stripped}, teamScore: ${target.team}, ` +
      `opponentScore: ${target.opponent}${simPart} },`;

    if (nextLine !== line) {
      applied.push({
        team: currentTeam,
        week,
        before: line.trim(),
        after: nextLine.trim(),
      });
      lines[i] = nextLine;
    }

    wanted.get(currentTeam).delete(week);
  }

  /* Anything left in `wanted` never matched a line. That means the
     team name or week doesn't exist in the file — a silent no-op
     here would look exactly like success. */
  const unmatched = [];
  for (const [team, weeks] of wanted) {
    for (const week of weeks.keys()) unmatched.push(`${team} week ${week}`);
  }
  if (unmatched.length) {
    die(
      `couldn't find a week entry to edit for:\n    ${unmatched.join("\n    ")}\n` +
        `  Check the team name matches schedule-data.js exactly.`
    );
  }

  return { applied, write: () => fs.writeFileSync(scheduleFile, lines.join("\n"), "utf8") };
}

/* ------------------------------------------------------------
   INTERACTIVE PROMPTS
   ------------------------------------------------------------ */
/* Ctrl-D (or a closed pipe) ends the input stream while a question is
   still pending. Left alone, that callback simply never fires and the
   process exits silently with everything typed so far thrown away —
   the worst possible failure for a tool whose whole job is not losing
   scores. Treating close as "q" saves the entered games instead. */
const QUIT = Symbol("quit");

function ask(rl, q) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      rl.removeListener("close", onClose);
      resolve(v);
    };
    const onClose = () => done(QUIT);
    rl.once("close", onClose);
    rl.question(q, (a) => done(a.trim()));
  });
}

async function collectInteractively(games, week, data, opts) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const edits = [];
  const answered = [];

  console.log(
    `\n  Enter each final as "AWAY-HOME" from the named team's view, e.g. 27-24.\n` +
      `  Blank line skips a game. Type q to stop and save what you've entered.\n`
  );

  try {
    for (let i = 0; i < games.length; i++) {
      const g = games[i];

      if (g.scored && !opts.all) continue;

      const n = `[${i + 1}/${games.length}]`;
      const already = g.scored ? `  (already final: ${g.scored})` : "";
      console.log(`\n  ${n} ${g.label}${already}`);
      if (g.subtitle) console.log(`        ${g.subtitle}`);

      let score = null;
      while (!score) {
        const raw = await ask(rl, `        ${g.perspective} scored: `);
        if (raw === "") break;
        if (raw === QUIT || raw.toLowerCase() === "q") {
          console.log("\n  Stopped. Saving what's been entered so far.");
          return { edits, answered };
        }
        const parsed = parseScore(raw);
        if (!parsed) {
          console.log(`        Didn't understand "${raw}" — use 27-24.`);
          continue;
        }
        if (parsed.error) {
          console.log(`        ${parsed.error}.`);
          continue;
        }
        score = parsed;
      }

      if (!score) continue;

      if (g.scored && !opts.force) {
        const ok = await ask(rl, `        Overwrite ${g.scored}? (y/n): `);
        if (ok === QUIT) return { edits, answered };
        if (ok.toLowerCase() !== "y") {
          console.log("        Left as it was.");
          continue;
        }
      }

      edits.push(...editsFor(g, week, score, data));
      answered.push(`${g.perspective} ${score.team}-${score.opponent} ${g.other}`);
    }
  } finally {
    rl.close();
  }

  return { edits, answered };
}

/* ------------------------------------------------------------
   --set PARSING
   ------------------------------------------------------------
   "California 27-24" — team name, then the score from that team's
   perspective. Team names contain spaces, so the score is taken
   from the end and everything before it is the name.
   ------------------------------------------------------------ */
function parseSet(raw, games, week, data, sim) {
  const m = String(raw).trim().match(/^(.*?)\s+(\d{1,3}\s*[-:\s]\s*\d{1,3})$/);
  if (!m) {
    die(`couldn't read --set "${raw}". Expected: --set "California 27-24"`);
  }
  const [, name, scoreText] = m;
  const score = parseScore(scoreText);
  if (!score) die(`couldn't read the score in --set "${raw}"`);
  if (score.error) die(`--set "${raw}" — ${score.error}`);

  const R = makeResolver(data);
  const key = R.rosterKeyFor(name);

  /* Either side of an H2H game identifies it unambiguously — both are
     league teams playing one game that week. A CPU game is only
     addressable by the COACH's team: several coaches can draw the
     same CPU opponent in a week, so "Notre Dame 21-7" wouldn't say
     whose game it was. */
  const matches = games.filter((g) =>
    g.kind === "h2h"
      ? R.rosterKeyFor(g.perspective) === key || R.rosterKeyFor(g.other) === key
      : R.rosterKeyFor(g.perspective) === key
  );

  if (matches.length > 1) {
    die(
      `"${name}" matches more than one game this week:\n    ` +
        matches.map((g) => g.label).join("\n    ")
    );
  }

  const game = matches[0];
  if (!game) {
    /* Naming a CPU opponent is a natural mistake — say so specifically
       rather than claiming the team isn't playing. */
    const asCpuOpponent = games.filter(
      (g) => g.kind === "cpu" && R.rosterKeyFor(g.other) === key
    );
    if (asCpuOpponent.length) {
      die(
        `"${name}" is a CPU opponent this week, not a coach's team.\n` +
          `  Name the coach's team instead:\n    ` +
          asCpuOpponent.map((g) => `--set "${g.perspective} A-B"   (${g.label})`).join("\n    ")
      );
    }
    die(
      `"${name}" has no game in ${weekLabel(week).toLowerCase()}.\n` +
        `  Teams playing: ${games.map((g) => g.perspective).join(", ")}`
    );
  }

  /* The name given might be the other side of the matchup, in which
     case the score needs flipping to match that game's perspective. */
  const flipped = R.rosterKeyFor(game.perspective) !== key;
  const oriented = flipped ? { team: score.opponent, opponent: score.team } : score;

  return {
    game,
    edits: editsFor(game, week, oriented, data, sim),
    summary: `${game.perspective} ${oriented.team}-${oriented.opponent} ${game.other}`,
  };
}

/* ------------------------------------------------------------
   MAIN
   ------------------------------------------------------------ */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.flags.has("dry-run");
  const opts = { force: args.flags.has("force"), all: args.flags.has("all") };

  const L = resolveLeague(args.league || "main");
  const week = parseWeek(args.week);
  const data = loadData(L.paths);

  if (!data.TEAM_SCHEDULES.length) {
    die(
      `${L.dir}/schedule-data.js has no schedules yet, so there's nothing to score.\n` +
        `  Transcribe the schedule first — see the comment at the top of that file.`
    );
  }

  const wk = buildWeek(data, week);
  const games = scoreableGames(wk);
  const label = weekLabel(week);

  console.log(
    `\n  ${L.label} · ${label} — ${wk.league.length} H2H, ${wk.cpu.length} CPU, ` +
      `${wk.notes.length} bye/off`
  );
  if (wk.missing.length) {
    console.log(`  WARNING: no week ${week} entry for: ${wk.missing.join(", ")}`);
  }

  const done = games.filter((g) => g.scored).length;
  if (done) console.log(`  ${done} of ${games.length} already final.`);

  if (!games.length) {
    console.log(`\n  No games to score in ${label.toLowerCase()}.\n`);
    return;
  }

  /* ---- gather the results ---- */
  let edits = [];
  let answered = [];

  if (args.set !== undefined) {
    const sets = Array.isArray(args.set) ? args.set : [args.set];
    for (const raw of sets) {
      const r = parseSet(raw, games, week, data);
      if (r.game.scored && !opts.force) {
        die(
          `${r.game.label} is already final (${r.game.scored}).\n` +
            `  Re-run with --force to overwrite it.`
        );
      }
      edits.push(...r.edits);
      answered.push(r.summary);
    }
  } else {
    if (done === games.length && !opts.all) {
      console.log(
        `\n  Every game this week is already final. ` +
          `Re-run with --all to revisit them.\n`
      );
      return;
    }
    const collected = await collectInteractively(games, week, data, opts);
    edits = collected.edits;
    answered = collected.answered;
  }

  if (!edits.length) {
    console.log("\n  Nothing entered. File untouched.\n");
    return;
  }

  /* ---- apply ---- */
  const result = applyScores(L.paths.schedule, edits);

  console.log(`\n  ${answered.length} game(s), ${result.applied.length} entr(ies) to write:\n`);
  answered.forEach((a) => console.log(`    ${a}`));

  if (dryRun) {
    console.log("\n--- DRY RUN: lines that would change ---\n");
    result.applied.forEach((a) => {
      console.log(`  ${a.team} · week ${a.week}`);
      console.log(`    - ${a.before}`);
      console.log(`    + ${a.after}\n`);
    });
    console.log("--- nothing written ---\n");
    return;
  }

  result.write();
  console.log(
    `\n  ${L.dir}/schedule-data.js updated — ${result.applied.length} entries.\n` +
      `\n  Check it at http://localhost:8080 (tools/preview.cmd), then publish:\n` +
      `    git add -A && git commit -m "${L.label}: ${label} scores" && git push\n`
  );
}

/* ------------------------------------------------------------
   ENTRY POINT
   ------------------------------------------------------------
   Only runs the CLI when invoked directly. Required as a module —
   which is what tools/apply.js does to serve the admin page — it
   just hands back the pieces below and prompts nobody.

   apply.js reuses parseSet and applyScores specifically so a score
   submitted from the web goes through the exact same name
   resolution and the exact same guardrails as one typed at the
   prompt. A second, more permissive path to the data file is the
   thing worth not having.
   ------------------------------------------------------------ */
if (require.main === module) {
  main().catch((e) => die(e.stack || e.message));
}

module.exports = { applyScores, parseSet, scoreableGames, parseScore, editsFor };
