# ncaalegends.github.io — working notes

## Bowl-week CFP bracket screenshots (weeks 16–19)

When a CFP bracket screenshot comes in for **any** dynasty after the field is
final (week 15/16 onward), two files get updated, not one:

1. **`<league>/postseason-data.js`** — via `node tools/cfp.js --league <slug>
   --week N --results results.txt`. This writes the CPU-only results and
   cross-checks the coached games against the schedule. Never hand-edit it.

2. **`<league>/schedule-data.js`** — the **next round's matchups for coached
   teams**, as unplayed rows (no `teamScore` / `opponentScore`). This used to be
   a hand edit and was the step that got forgotten. It is now a tool:

   ```
   node tools/bracket-sync.js --league <slug> --week N
   ```

   It derives the round from the final `CFP_BRACKET` and the results already
   recorded — the same union the site's own bracket reads — and writes only the
   rows a coached team needs. It never writes a CPU-vs-CPU game, never touches
   a row that already exists, and never guesses a result, so it is safe to run
   every bowl week and safe to re-run. `--dry-run` shows the matchups first;
   check them against the screenshot before writing.

   Run it **after** the results for the previous round are in, in that order —
   a round can't be derived until the one feeding it is final.

Row shape, which is what the tool emits and what a hand-added row should match:

```js
{ week: 18, opponent: "Maryland", location: "at", neutral: true,
  title: "Orange Bowl", round: "cfp-sf" },
```

- `week`: 16 = cfp-r1, 17 = cfp-qf, 18 = cfp-sf, 19 = cfp-nc.
- `round`: the matching `cfp-*` id. Load-bearing — the bracket advances on it.
- `location`: `"vs"` if the coached team is the higher seed, `"at"` if lower.
  Always `neutral: true` from the quarterfinals on (first round is on campus,
  so no `neutral` there, and both rows name the host's stadium).
- `title`: the bowl name off the logo, plain form — "Orange Bowl", not
  "Capital One Orange Bowl".
- **Only coached teams get schedule rows.** A CPU-vs-CPU playoff game lives
  solely in `postseason-data.js`; a team whose coach has departed
  (`departedAfterWeek`) counts as CPU. The two places must never hold the same
  game.

The final bracket itself still goes in `cfp-data.js` at **week 15** with
`--final` — weeks 16–19 take `--results` only, so there is nowhere else for the
settled field to live, and `bracket-sync.js` refuses to write off a bracket
still marked projected.

Semifinal/championship bowl names can't be added to `cfp-data.js` in a bowl
week for the same reason. The `title` on the schedule row is where they land.

As always: the tools edit files and stop. Don't commit or push.
