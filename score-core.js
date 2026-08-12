/* ============================================================
   SCORE CORE — shared score-writing logic
   ------------------------------------------------------------
   The one copy of "given a set of edits, what does schedule-data.js
   become?" and "given a team name and a score, which game is that
   and what does scoring it imply?"

   WHY THIS FILE EXISTS AT THE ROOT

   Same reason as week-core.js next to it, one step further along.
   week-core answers what games exist and what scoring one implies;
   this answers how a score actually gets written into the file.

   That second half used to live only in tools/scores.js, which is
   fine while the only thing writing scores is a Node script. It
   stops being fine the moment anything else needs to write one —
   and the whole point of moving the Worker off the Actions runner
   is that the Worker writes the file itself. Two copies of this
   regex surgery is how you end up with the web path quietly
   formatting a line differently from the command line, which shows
   up as a diff nobody can explain three weeks later.

   So the pure logic lives here — no fs, no path, no process, no
   vm — and every caller consumes it:

     Node     const { applyScoresToSource } = require("../score-core");
     Browser  <script src="../score-core.js"></script>  ->  ScoreCore
     Worker   bundled ahead of the Worker source by tools/build-worker.js

   WHAT STAYED IN tools/scores.js
   Reading and writing the file, the interactive prompts, argument
   parsing, and the --set string format. Those are Node's job or the
   CLI's manners, and neither belongs in a browser.

   ERRORS ARE THROWN, NOT EXITED
   tools/scores.js used to call die() from the middle of this logic,
   which ends the process. That's correct for a CLI and useless
   anywhere else — a Worker cannot exit, and a browser certainly
   cannot. Everything below throws ScoreError instead, carrying a
   `code` so a caller that wants to react to a specific rejection
   can, and a message good enough to show a person unchanged. The
   CLI catches these and hands the message to die(), so the command
   line behaves exactly as it did.
   ============================================================ */

(function (root, factory) {
  const WeekCore =
    typeof module === "object" && module.exports
      ? require("./week-core")
      : root.WeekCore;

  if (!WeekCore) {
    throw new Error("score-core.js requires week-core.js to be loaded first");
  }

  const api = factory(WeekCore);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ScoreCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (WeekCore) {
  "use strict";

  const { makeResolver, editsFor, parseScore, weekLabel } = WeekCore;

  /* ------------------------------------------------------------
     THE ERROR TYPE
     ------------------------------------------------------------
     `code` exists so a caller can distinguish rejections it wants
     to handle specially from ones it just reports. The CLI, for
     instance, appends a --set example to a "cpu-opponent" rejection
     because that's the flag the user was typing; a browser has no
     flags and shows the message as-is.

     `detail` carries whatever the caller would otherwise have to
     re-derive to build its own message — the list of matching
     games, the teams playing that week. Nothing in it is required
     to render a sensible error; it's there so a caller *can* do
     better than the default, not so it has to.
     ------------------------------------------------------------ */
  class ScoreError extends Error {
    constructor(message, code, detail) {
      super(message);
      this.name = "ScoreError";
      this.code = code || "invalid";
      this.detail = detail || {};
    }
  }

  const fail = (message, code, detail) => {
    throw new ScoreError(message, code, detail);
  };

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

     Takes and returns text. The caller reads and writes; this
     function has no idea where the text came from, which is the
     entire reason it can run on a Cloudflare Worker.
     ------------------------------------------------------------ */
  function applyScoresToSource(src, edits) {
    const lines = String(src).split("\n");

    // team name -> { week -> {team, opponent, sim} }
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
        fail(
          `${currentTeam} week ${week} has no opponent (it's a bye or note entry) — ` +
            `can't record a score against it`,
          "no-opponent",
          { team: currentTeam, week }
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
      fail(
        `couldn't find a week entry to edit for:\n    ${unmatched.join("\n    ")}\n` +
          `  Check the team name matches schedule-data.js exactly.`,
        "unmatched",
        { unmatched }
      );
    }

    return { applied, text: lines.join("\n") };
  }

  /* ------------------------------------------------------------
     RESOLVING ONE ENTRY
     ------------------------------------------------------------
     "This team, this score" -> which game is that, and what edits
     does recording it imply. This is the half of the CLI's parseSet
     that isn't about parsing a string: every check it makes about
     whether the named team is real, unambiguous, and actually
     playing that week.

     It matters that this is one function and not a checklist each
     caller runs. The rules are subtle — either side of an H2H game
     names it, only the coach's side names a CPU game, and naming
     the far side flips the score — and a caller that reimplements
     them will get the flip wrong long before it gets the lookup
     wrong, which is the kind of bug that reads as "the site swapped
     my score" and takes an evening to find.

       name   team as typed or chosen; alternates and ALIASES both
              resolve, so the in-game spelling is fine
       score  { team, opponent } already parsed, or a string this
              will parse — "27-24", "27 24" and "27:24" all work
       games  scoreableGames(buildWeek(data, week))
       sim    true/false to set the force-sim flag explicitly,
              undefined to leave whatever the file says
     ------------------------------------------------------------ */
  function resolveEntry(name, score, games, week, data, sim) {
    const parsed = typeof score === "string" ? parseScore(score) : score;

    if (!parsed) fail(`couldn't read the score "${score}"`, "bad-score", { score });
    if (parsed.error) fail(parsed.error, "bad-score", { score });

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
      fail(
        `"${name}" matches more than one game this week:\n    ` +
          matches.map((g) => g.label).join("\n    "),
        "ambiguous",
        { name, matches: matches.map((g) => ({ label: g.label, perspective: g.perspective })) }
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
        fail(
          `"${name}" is a CPU opponent this week, not a coach's team.\n` +
            `  Name the coach's team instead:\n    ` +
            asCpuOpponent.map((g) => `${g.perspective}   (${g.label})`).join("\n    "),
          "cpu-opponent",
          {
            name,
            alternatives: asCpuOpponent.map((g) => ({
              perspective: g.perspective,
              label: g.label,
            })),
          }
        );
      }
      fail(
        `"${name}" has no game in ${weekLabel(week).toLowerCase()}.\n` +
          `  Teams playing: ${games.map((g) => g.perspective).join(", ")}`,
        "not-playing",
        { name, week, playing: games.map((g) => g.perspective) }
      );
    }

    /* The name given might be the other side of the matchup, in which
       case the score needs flipping to match that game's perspective. */
    const flipped = R.rosterKeyFor(game.perspective) !== key;
    const oriented = flipped
      ? { team: parsed.opponent, opponent: parsed.team }
      : { team: parsed.team, opponent: parsed.opponent };

    return {
      game,
      edits: editsFor(game, week, oriented, data, sim),
      summary: `${game.perspective} ${oriented.team}-${oriented.opponent} ${game.other}`,
    };
  }

  /* ------------------------------------------------------------
     RESOLVING A WHOLE SUBMISSION
     ------------------------------------------------------------
     What every caller actually wants: a batch of entries in, one
     flat list of edits out, with the already-scored rule applied.

     The already-scored check lives here rather than in each caller
     because it is the one rule that can't be checked from the entry
     alone — it needs the game, which only resolveEntry knows. Left
     to callers it gets forgotten by exactly the caller that most
     needs it: a stale admin page submitting against a week somebody
     else finished scoring two minutes ago.

       entries  [{ team, score, sim? }]
       force    true to overwrite results that are already recorded
     ------------------------------------------------------------ */
  function resolveEntries(entries, games, week, data, force) {
    const edits = [];
    const answered = [];

    for (const entry of entries) {
      const r = resolveEntry(entry.team, entry.score, games, week, data, entry.sim);

      if (r.game.scored && !force) {
        fail(`${r.game.label} is already final (${r.game.scored}).`, "already-scored", {
          label: r.game.label,
          scored: r.game.scored,
        });
      }

      edits.push(...r.edits);
      answered.push(r.summary);
    }

    return { edits, answered };
  }

  return {
    ScoreError,
    applyScoresToSource,
    resolveEntry,
    resolveEntries,
  };
});
