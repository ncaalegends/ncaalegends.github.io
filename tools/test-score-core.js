#!/usr/bin/env node
/* ============================================================
   TEST — score-core is behaviour-preserving
   ------------------------------------------------------------
     node tools/test-score-core.js

   The score writer and the "which game is that?" resolution moved
   out of tools/scores.js into /score-core.js so the Worker can use
   them. That move is only safe if it changed nothing, and "nothing"
   here means two specific things:

     1. Given the same edits, the file text that comes out is byte
        for byte what the old code produced. A stray space in a
        scored line is a diff on every future commit.

     2. Given the same bad input, the message a person reads is the
        same sentence. These messages are the entire error UI of
        the command-line tools.

   So this doesn't test score-core against a description of what it
   should do — it tests it against the code it replaced, pulled out
   of git and run side by side on the league's real data.

   HOW THE OLD CODE GETS HERE
   `git show HEAD:tools/scores.js`, compiled in memory as though it
   were sitting at tools/scores.js so its own `require("./lib/league")`
   resolves normally. Nothing is written to disk — an earlier version
   of this script did write a scratch copy, and a scratch copy of a
   tool that edits data files is exactly the thing you don't want
   left behind when a run dies halfway.

   Point it at a different revision with:
     node tools/test-score-core.js --rev <sha>
     node tools/test-score-core.js --rev HEAD~3

   WHY IT COMPARES AGAINST A COMMIT AND NOT A FIXTURE
   A fixture would have to be written by hand from the same
   understanding that produced the refactor, so it would agree with
   the refactor by construction and prove nothing. The previous
   commit is the only description of the old behaviour that wasn't
   written by someone trying to reproduce it.

   Exits non-zero on the first disagreement, printing both sides.
   ============================================================ */

const fs = require("fs");
const os = require("os");
const path = require("path");
const Module = require("module");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");

/* The old file's identity, not a location. Nothing is written here —
   it's what require() inside the old source resolves against. */
const OLD_PATH = path.join(__dirname, "scores.js");

const revArg = process.argv.indexOf("--rev");
const REV = revArg !== -1 ? process.argv[revArg + 1] : "HEAD";

const { resolveLeague, loadData, buildWeek, scoreableGames } = require("./lib/league");
const { applyScoresToSource, resolveEntry, resolveEntries, ScoreError } = require("../score-core");

/* The current CLI, which is what the old one has to be compared
   against. Comparing the old parseSet directly to score-core's
   resolveEntry would fail on wording and be right to: score-core
   doesn't know what a --set flag is, and parseSet is the wrapper
   that puts that phrasing back. The invariant worth defending is
   "the command line behaves identically", so that's what's checked. */
const neu = require("./scores");

/* ------------------------------------------------------------
   GETTING THE OLD CODE, AND MAKING die() SURVIVABLE
   ------------------------------------------------------------
   The old parseSet calls die(), which is console.error followed by
   process.exit(1). Comparing error messages means catching them, so
   process.exit is stubbed to throw and console.error is captured
   for the duration of each call. Both are restored in a finally —
   leaving process.exit stubbed would make a genuine failure in this
   script exit 0, which is the one bug a test must never have.
   ------------------------------------------------------------ */
function loadOld() {
  const src = execFileSync("git", ["show", `${REV}:tools/scores.js`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  /* Compile it as a module living at tools/scores.js so its own
     `require("./lib/league")` resolves the way it always did. This is
     the same machinery require() uses, just handed source text
     instead of a path. */
  const m = new Module(OLD_PATH, module);
  m.filename = OLD_PATH;
  m.paths = Module._nodeModulePaths(path.dirname(OLD_PATH));
  m._compile(src, OLD_PATH);
  return m.exports;
}

/* Run fn, returning { value } or { error: "the message die() printed" }. */
function capture(fn) {
  const realExit = process.exit;
  const realError = console.error;
  let printed = "";

  process.exit = () => {
    const e = new Error("exited");
    e.__died = true;
    throw e;
  };
  console.error = (msg) => {
    printed += String(msg);
  };

  try {
    return { value: fn() };
  } catch (e) {
    if (e.__died) {
      /* die() wraps in "\n  ERROR: <msg>\n" — strip that back off so
         the comparison is against the sentence itself. */
      return { error: printed.replace(/^\s*ERROR:\s*/, "").trim() };
    }
    if (e instanceof ScoreError) return { error: e.message.trim(), code: e.code };
    throw e;
  } finally {
    process.exit = realExit;
    console.error = realError;
  }
}

/* ------------------------------------------------------------
   REPORTING
   ------------------------------------------------------------ */
let checks = 0;
const failures = [];

function same(label, oldSide, newSide) {
  checks++;
  const a = JSON.stringify(oldSide, null, 2);
  const b = JSON.stringify(newSide, null, 2);
  if (a !== b) {
    failures.push({ label, old: a, new: b });
    console.log(`  FAIL  ${label}`);
  }
}

/* ------------------------------------------------------------
   THE CASES
   ------------------------------------------------------------
   Built from the league's real data rather than invented, so the
   team names, aliases and CPU opponents are the ones that actually
   occur — including whatever awkward spelling is in schedule-data.js
   this season.
   ------------------------------------------------------------ */
function casesForWeek(games, week) {
  const cases = [];
  const h2h = games.filter((g) => g.kind === "h2h");
  const cpu = games.filter((g) => g.kind === "cpu");

  /* The ordinary path, from both sides of an H2H game. Naming the
     far side has to flip the score; that flip is the single most
     consequential line in resolveEntry. */
  h2h.forEach((g) => {
    cases.push({ what: `h2h near side: ${g.label}`, name: g.perspective, score: "27-24" });
    cases.push({ what: `h2h far side: ${g.label}`, name: g.other, score: "27-24" });
    cases.push({ what: `h2h sim=true: ${g.label}`, name: g.perspective, score: "31-3", sim: true });
    cases.push({ what: `h2h sim=false: ${g.label}`, name: g.perspective, score: "31-3", sim: false });
  });

  cpu.forEach((g) => {
    cases.push({ what: `cpu: ${g.label}`, name: g.perspective, score: "45-10" });
    /* Naming the CPU opponent instead of the coach — the mistake the
       specific error message exists for. */
    cases.push({ what: `cpu opponent named: ${g.label}`, name: g.other, score: "45-10" });
  });

  /* Rejections that don't depend on which games exist. */
  cases.push({ what: "unknown team", name: "Nowhere State", score: "10-7" });
  cases.push({ what: "tie", name: h2h[0] ? h2h[0].perspective : "Nowhere State", score: "21-21" });
  cases.push({
    what: "score out of range",
    name: h2h[0] ? h2h[0].perspective : "Nowhere State",
    score: "999-1",
  });
  cases.push({ what: "alternate score separator", name: h2h[0] ? h2h[0].perspective : "x", score: "27 24" });
  cases.push({ what: "colon separator", name: h2h[0] ? h2h[0].perspective : "x", score: "27:24" });

  return cases.map((c) => ({ ...c, week }));
}

/* ------------------------------------------------------------
   RUN
   ------------------------------------------------------------ */
const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), "score-core-test-"));

function main() {
  const old = loadOld();

  for (const slug of ["main", "3star", "1star"]) {
    const L = resolveLeague(slug);
    const data = loadData(L.paths);
    if (!data.TEAM_SCHEDULES.length) {
      console.log(`\n  ${L.label} — no schedules, skipped`);
      continue;
    }

    const scheduleSrc = fs.readFileSync(L.paths.schedule, "utf8");
    console.log(`\n  ${L.label}`);

    for (let week = 0; week <= 15; week++) {
      const games = scoreableGames(buildWeek(data, week));
      if (!games.length) continue;

      let weekChecks = 0;

      for (const c of casesForWeek(games, week)) {
        const label = `${slug} w${week} · ${c.what}`;

        /* ---- the CLI: same game, same edits, same sentence ----
           Old parseSet against new parseSet. Messages included,
           because these are the tool's entire error UI. */
        const raw = `${c.name} ${c.score}`;
        const oldR = capture(() => old.parseSet(raw, games, week, data, c.sim));
        const newR = capture(() => neu.parseSet(raw, games, week, data, c.sim));

        const shape = (r) =>
          r.error ? { error: r.error } : { edits: r.value.edits, summary: r.value.summary };

        same(`${label} — parseSet`, shape(oldR), shape(newR));
        weekChecks++;

        /* ---- the core: same edits, wording aside ----
           resolveEntry is what the Worker will call, with no CLI
           wrapper to re-phrase anything. It has to reach the same
           decision; only the sentence may differ. */
        const coreR = capture(() => resolveEntry(c.name, c.score, games, week, data, c.sim));
        same(
          `${label} — resolveEntry decision`,
          oldR.error ? { rejected: true } : { rejected: false, edits: oldR.value.edits },
          coreR.error ? { rejected: true } : { rejected: false, edits: coreR.value.edits }
        );
        weekChecks++;

        if (oldR.error || newR.error) continue;

        /* ---- writing: same text out, byte for byte ---- */
        const oldW = capture(() => {
          /* The old applyScores read from disk and returned a write()
             closure, so it needs a real file. It gets a copy in the
             OS temp dir — never anywhere inside the repo, where a
             half-written schedule-data.js could be committed by
             accident. */
          const tmp = path.join(scratchDir, `${slug}-${week}.js`);
          fs.writeFileSync(tmp, scheduleSrc, "utf8");
          const r = old.applyScores(tmp, oldR.value.edits);
          r.write();
          return { applied: r.applied, text: fs.readFileSync(tmp, "utf8") };
        });

        const newW = capture(() => applyScoresToSource(scheduleSrc, newR.value.edits));

        same(
          `${label} — write`,
          oldW.error ? { error: oldW.error } : { applied: oldW.value.applied, hash: hash(oldW.value.text) },
          newW.error ? { error: newW.error } : { applied: newW.value.applied, hash: hash(newW.value.text) }
        );
        weekChecks++;

        /* The text itself, not just its hash — a hash comparison that
           somehow passed on two different strings would be invisible,
           and this is the output that ends up in a commit. */
        if (!oldW.error && !newW.error && oldW.value.text !== newW.value.text) {
          failures.push({
            label: `${label} — file text differs`,
            old: firstDiff(oldW.value.text, newW.value.text).old,
            new: firstDiff(oldW.value.text, newW.value.text).new,
          });
          console.log(`  FAIL  ${label} — file text differs`);
        }
        checks++;
      }

      console.log(`    week ${String(week).padStart(2)} — ${games.length} games, ${weekChecks} checks`);
    }

    /* ---- resolveEntries: the already-scored rule ----
       apply.js used to make this check itself, after calling
       parseSet. It's inside resolveEntries now, so it needs its own
       comparison: same rejection, and the force flag still gets
       past it. */
    for (let week = 0; week <= 15; week++) {
      const games = scoreableGames(buildWeek(data, week));
      const finished = games.filter((g) => g.scored);
      if (!finished.length) continue;

      const g = finished[0];
      const entries = [{ team: g.perspective, score: "13-10" }];

      const blocked = capture(() => resolveEntries(entries, games, week, data, false));
      same(`${slug} w${week} — already-scored is refused`, { code: "already-scored" }, {
        code: blocked.code,
      });

      const forced = capture(() => resolveEntries(entries, games, week, data, true));
      same(`${slug} w${week} — force gets past it`, { ok: true }, {
        ok: !forced.error && forced.value.edits.length > 0,
      });
      break;
    }
  }

  console.log(`\n  ${checks} checks, ${failures.length} failed\n`);

  if (failures.length) {
    failures.slice(0, 5).forEach((f) => {
      console.log(`  ---- ${f.label}`);
      console.log(`  OLD: ${f.old}`);
      console.log(`  NEW: ${f.new}\n`);
    });
    if (failures.length > 5) console.log(`  ...and ${failures.length - 5} more\n`);
    process.exitCode = 1;
    return;
  }

  console.log("  score-core matches the code it replaced.\n");
}

function hash(text) {
  return require("crypto").createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/* The first line that differs, so a failure report is one line and
   not two copies of a 40KB file. */
function firstDiff(a, b) {
  const la = a.split("\n");
  const lb = b.split("\n");
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) {
      return { old: `line ${i + 1}: ${la[i]}`, new: `line ${i + 1}: ${lb[i]}` };
    }
  }
  return { old: "(no line differs)", new: "(no line differs)" };
}

try {
  main();
} finally {
  fs.rmSync(scratchDir, { recursive: true, force: true });
}
