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
  buildWeek,
  weekLabel,
  parseWeek,
  parseScore,
  scoreableGames,
  editsFor,
} = require("./lib/league");

/* The score writer and the "which game is that?" resolution now live
   in /score-core.js, for the same reason week-core.js exists: the
   Worker is going to need to write a score itself, and two copies of
   this logic is how the web path and the command line start
   disagreeing about what a scored line looks like. */
const { applyScoresToSource, resolveEntry, ScoreError } = require("../score-core");

/* ------------------------------------------------------------
   THE WRITER
   ------------------------------------------------------------
   The surgical line editing moved to /score-core.js — see the
   header there for why, and for the rules about surviving the
   file's comments and hand-formatting. What's left here is the
   Node half: read the file, hand the text over, hand back a
   write() the caller can decide not to call (that's what --dry-run
   is), and turn a ScoreError into the CLI's own die().
   ------------------------------------------------------------ */
function applyScores(scheduleFile, edits) {
  const src = fs.readFileSync(scheduleFile, "utf8");

  let result;
  try {
    result = applyScoresToSource(src, edits);
  } catch (e) {
    if (e instanceof ScoreError) die(e.message);
    throw e;
  }

  return {
    applied: result.applied,
    write: () => fs.writeFileSync(scheduleFile, result.text, "utf8"),
  };
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

  /* Everything past this point — is the name real, is it ambiguous,
     is that team even playing, does the score need flipping because
     the far side was named — is score-core's resolveEntry, shared
     with apply.js and the Worker. What stays here is the --set
     phrasing: the same rejection reads differently at a prompt than
     it does in a browser, and only the CLI knows to suggest a flag. */
  try {
    return resolveEntry(name, scoreText, games, week, data, sim);
  } catch (e) {
    if (!(e instanceof ScoreError)) throw e;

    if (e.code === "bad-score") die(`--set "${raw}" — ${e.message}`);

    /* Re-render the CPU-opponent hint as the --set line the user was
       actually typing. score-core can't do this: it doesn't know it's
       being called by something with flags. */
    if (e.code === "cpu-opponent") {
      die(
        `"${name}" is a CPU opponent this week, not a coach's team.\n` +
          `  Name the coach's team instead:\n    ` +
          e.detail.alternatives
            .map((a) => `--set "${a.perspective} A-B"   (${a.label})`)
            .join("\n    ")
      );
    }

    die(e.message);
  }
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
