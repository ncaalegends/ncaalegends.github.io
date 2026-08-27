# ncaalegends.github.io — working notes

## Bowl-week CFP bracket screenshots (weeks 16–19)

When a CFP bracket screenshot comes in for **any** dynasty after the field is
final (week 15/16 onward), two files get updated, not one:

1. **`<league>/postseason-data.js`** — via `node tools/cfp.js --league <slug>
   --week N --results results.txt`. This writes the CPU-only results and
   cross-checks the coached games against the schedule. Never hand-edit it.

2. **`<league>/schedule-data.js`** — the **next round's matchups for coached
   teams**, added by hand as unplayed rows (no `teamScore` / `opponentScore`).
   The bracket screenshot names the upcoming pairing, so the row goes in the
   same pass; don't wait for the score. This is the step that gets forgotten.

Row shape, matching the existing bowl-week rows:

```js
{ week: 18, opponent: "Maryland", location: "at", neutral: true,
  title: "Orange Bowl", round: "cfp-sf" },
```

- `week`: 16 = cfp-r1, 17 = cfp-qf, 18 = cfp-sf, 19 = cfp-nc.
- `round`: the matching `cfp-*` id. Load-bearing — the bracket advances on it.
- `location`: `"vs"` if the coached team is the higher seed, `"at"` if lower.
  Always `neutral: true` from the quarterfinals on (first round is on campus,
  so no `neutral` there).
- `title`: the bowl name off the logo, plain form — "Orange Bowl", not
  "Capital One Orange Bowl".
- **Only coached teams get schedule rows.** A CPU-vs-CPU playoff game lives
  solely in `postseason-data.js`; a team whose coach has departed
  (`departedAfterWeek`) counts as CPU. The two places must never hold the same
  game.

Semifinal/championship bowl names can't be added to `cfp-data.js` in a bowl
week — `cfp.js` only takes `--results` from week 16 on, and `bowls` lives on
the bracket block. The `title` on the schedule row is where they land.

As always: the tools edit files and stop. Don't commit or push.
