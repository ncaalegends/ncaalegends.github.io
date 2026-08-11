# tools/

Commissioner tooling. Nothing in here ships to the site — GitHub Pages
serves the root, and this folder is just scripts you run locally.

## preview.cmd / serve.js

Double-click `preview.cmd` to view the site locally at
`http://localhost:8080`.

**Don't open `index.html` directly from the folder.** It looks like it
should work and then fails in two confusing ways:

- `file://` has no directory index, so clicking a league on the landing
  page shows a *folder listing* instead of the page
- `fetch()` is blocked on `file://` origins, so the landing page can't
  read each league's data and every card reads "Unavailable".
  `logo-check.html` breaks identically.

Both are artifacts of opening files off the disk, not site bugs — over
HTTP they behave correctly, which is what this server gives you.

Node's built-ins only. Nothing to install, no network needed.

## advance.js

Does both halves of a week advance in one command: updates the site's
season state and announces the new week in Discord.

```
node tools/advance.js --week 5 --next "Sunday, July 26 · 6:00 PM EDT"
node tools/advance.js --league 3star --week 2 --next "Fri 8PM EDT"
node tools/advance.js --league 1star --week 2 --no-post   # site only, skip Discord
```

### Leagues

`--league` picks which folder to operate on. Defaults to `main`.

| Slug | Folder | Discord |
|---|---|---|
| `main` | `/main/` | posts to the main channel |
| `3star` | `/3star/` | posts to the 3-star channel |
| `1star` | `/1star/` | posts to the 1-star channel |

All three leagues are on the Discord automation — each has its own
webhook in `config.json`, pointing at its own server's channel. If a
webhook is ever blank, the script refuses to post for that league
rather than silently doing nothing; pass `--no-post` to skip the post
deliberately on a given run.

Those two leagues also have a **web admin page** at
`ncaalegends.github.io/admin/`, so their commissioners can record
scores and advance weeks without installing anything. It runs these
same scripts on a GitHub Actions runner — see `apply.js` below and
`worker/ADMIN-SETUP.md`. Nothing about the local tools changes; both
paths write the same files the same way, so you can keep using
`advance.cmd` for any league whenever you prefer.

Discord IDs in `config.json` are shared across all three leagues,
keyed by coach name — a person has one Discord account regardless of
how many dynasties they're in. Name matching is case-insensitive, so a
coach spelled `ronricofsu` in one league's roster and `RonRicoFSU` in
another's still resolves to the same entry. Any coach with no ID on
file shows as bold text instead of a ping, which the script warns
about by name on every run.

What it does:

1. Rewrites `SEASON` in `league-data.js` — `currentWeek`, `statusLine`,
   and `nextAdvance`. Surgical find-and-replace, so all the explanatory
   comments in that file survive untouched.
2. Reads `schedule-data.js`, pulls every team's entry for that week, and
   sorts them into three buckets:
   - **H2H games** — head-to-head, user vs user. Both teams have a
     coach. Deduped, since the game appears in both coaches'
     schedules.
   - **CPU games** — opponent isn't on the roster.
   - **Byes / off weeks** — entries with a `note` instead of an opponent.
3. Posts the formatted announcement to the Discord webhook.

Team classification uses the same alias table and roster-matching logic
as `script.js`, so what Discord says always matches what the site shows.

### Flags

| Flag | Meaning |
|---|---|
| `--week N` | Week now being played, 0–15. Required. |
| `--next "..."` | Next advance deadline, **as a date**: `2026-07-26 18:00`, or `2026-07-26` for a day with no time shown. Eastern. Carries over the existing value if omitted. `--at` is an alias. |
| `--status "..."` | Override the hero status line. Defaults to `WEEK N`. |
| `--dry-run` | Print the message. Change nothing, post nothing. |
| `--no-post` | Update the data file, skip Discord. |
| `--no-write` | Post to Discord, leave the data file alone. |

**Always dry-run first** if you're unsure — it shows the exact matchup
list and flags any coach missing an entry for that week.

### The deadline is a date now, not a sentence

It used to be free text — whatever read best went in the box. That made
it impossible for anything to ask *"is the advance today?"*, which is
the one question `heads-up.js` has to answer every morning.

So `SEASON` carries two fields, and you author one of them:

```js
nextAdvanceAt: "2026-08-11T18:00:00-04:00",   // you set this (via a date)
nextAdvance:   "Tuesday, August 11th - 6:00 PM EDT",   // generated
```

`advance.js` writes both together, every time, from the date you give
it. Don't hand-edit either — and if they ever disagree, the timestamp
is the one that's right.

Typing prose into `--next` is now an error rather than something that
gets stored. That's deliberate: a deadline the tools can't read looks
completely fine on the site while the heads-up quietly never fires
again, with nothing anywhere saying why.

A league that names a **day and no time** stores a bare date
(`"2026-08-12"`) and its badge keeps reading `Wednesday, August 12th`
with no clock time — that's how 1-star and 3-star have always looked.
Internally the day resolves to **10 PM Eastern** so the heads-up still
knows whether the advance is ahead or behind; that never reaches the
site. It's late on purpose — these advances happen at night, and an
earlier default would read as "already passed" while the advance was
still hours away, silencing the heads-up on the exact morning it was
meant to fire.

All the conversion lives in `/deadline.js` at the repo root, shared with
the admin page the same way `week-core.js` is — one copy, so the picker
in the browser and the tool on the command line can't disagree about
what a date means. It computes Eastern's offset per instant rather than
hardcoding one, so the changeover from EDT to EST mid-season takes care
of itself.

### Mentions — the one thing that trips people up

**Discord only sends a notification for mentions in the message body.**
A mention inside an embed renders blue but pings nobody. That's why the
role ping, the H2H matchups and the CPU games live in the plain
`content` field while the bye list sits in the embed — the pings have to
be where they actually fire.

**Mentions need numeric IDs, not usernames.** `@dwayinspired` is inert
text. The real thing is `<@123456789012345678>`. To get an ID: Discord
**Settings → Advanced → Developer Mode**, then right-click a user (or a
role, in Server Settings → Roles) → **Copy ID**.

Fill them into `tools/config.json`. The `username` field beside each one
is only a label to help you match rows — it's never used for pinging.
Coach keys must match the `name` in `league-data.js` exactly.

Any coach without an ID still appears in the message, just as bold text
instead of a ping. The script prints a warning naming exactly who, every
run, so a missing ID can't quietly go unnoticed.

`allowed_mentions` is set to an explicit allowlist of the IDs in the
config, which means nothing else in the message can ever ping — a stray
`@everyone` typed into a deadline string is harmless.

**A channel ID is not a ping.** `<#123...>` renders a clickable link to
the channel and notifies nobody. The script won't accept one as a
mention. Channel-wide pings only come from `@everyone`, `@here`, or a
role.

**The role ping is per league.** Each league has its own Discord server,
and a role snowflake only exists on the server that owns it — main's
role ID pasted into the 3-star server renders as a dead
`@unknown-role` and pings nobody. So each league carries its own
`roleMention` inside its `leagues` entry:

```json
"leagues": {
  "main":  { "roleMention": { "id": "15274...", "everyone": "" }, "webhookUrl": "..." },
  "3star": { "roleMention": { "id": "15269...", "everyone": "" }, "webhookUrl": "..." }
}
```

The top-level `roleMention` is only a fallback for a league that doesn't
set its own. Blank a league's `id` to drop its channel-wide ping.

The advance therefore pings twice over: **the role at the top catches
everyone in the league**, and **every coach with a game that week is
also mentioned individually** — H2H and CPU alike. The individual
mentions still matter because they tell a coach which line is theirs;
the role ping is what covers the people a game list can't reach, namely
anyone on a **BYE**. That's why byes can stay in the embed as reference
material: the deadline still reaches them through the role.

The **nudge** deliberately does *not* use the role ping — it's aimed at
the few coaches who still owe a game, and blasting the whole role every
few days is how a reminder gets muted.

The body has a hard 2000-character ceiling. Every week of the current
season lands between 195 and 1280, so there's comfortable headroom, but
if a future season ever exceeds it the CPU list falls back to the embed
and the script says so loudly rather than silently dropping pings.

### Setup

Create the webhook in Discord: **Server Settings → Integrations →
Webhooks → New Webhook**, pick the channel, **Copy Webhook URL**.

Then either put it in an untracked config file:

```
cp tools/config.example.json tools/config.json
# paste the URL into tools/config.json
```

...or set `DISCORD_WEBHOOK_URL` in your environment. The env var wins if
both are set.

`tools/config.json` is gitignored on purpose. **The webhook URL is a
secret** — anyone who has it can post to that channel as the bot. If it
ever leaks, delete the webhook in Discord and make a new one.

### Publishing

The script edits files but never commits. Once it looks right:

```
git add -A && git commit -m "Advance to Week 5" && git push
```

GitHub Pages picks it up within a minute or so.

### Adding scores

`advance.js` doesn't touch scores — that's `scores.js`, below.

## nudge.js

The daily "you still owe a game" reminder. Reads the current week,
finds every game with no score recorded, and posts one Discord message
tagging exactly those coaches.

```
node tools/nudge.js --league main --dry-run
node tools/nudge.js --league 3star
```

You normally don't run this at all — **`.github/workflows/morning-posts.yml`
runs it for all three leagues every morning at 10:00 AM Eastern.**

That time is kept by a cron trigger on the Cloudflare Worker, not by
GitHub. GitHub's own cron is best-effort and was drifting badly — a
10 AM nudge could land after noon — so the Worker fires a
`repository_dispatch` and the workflow just listens. It also works out
the daylight saving change by itself. Setup is in
`worker/ADMIN-SETUP.md`, step 4b.

### Why it's a GitHub Action and not a local scheduled task

Scores arrive through the admin page, which commits straight to this
repo, so the runner's checkout is always current — a local working copy
usually isn't. And a reminder that only fires when someone's PC happens
to be awake isn't a reminder.

It gets `tools/config.json` from the `DISCORD_CONFIG` repo secret, the
same way `league-update.yml` does. Nothing else to set up.

### The two silences

Both are deliberate, and both exist so the bot stays worth reading:

- **Every game in → posts nothing.** No "all games are in!" each
  morning while the league waits on the advance.
- **Advanced less than 12 hours ago → posts nothing.** The advance
  announcement already pinged everyone with a game, so a nudge the same
  evening is noise. The first nudge of a week lands the next morning.
  Twelve hours and a 10am post means an evening advance is covered and
  anything before ~10pm the night before still gets nudged.

The advance is dated by asking git which commit introduced the current
`currentWeek:` value, scoped to that league's `league-data.js` — nothing
but an advance rewrites it. No stored timestamp, so nothing to drift.

**That check needs full git history.** `fetch-depth: 0` in the workflow
is load-bearing: on a shallow clone the whole file reads as newly added,
the pickaxe matches the clone's tip commit, and the reported age would
be a few hours every single day — suppressing every nudge forever. So
`nudge.js` detects a shallow repo and refuses to answer instead, which
fails *open* (it posts). A duplicate nudge is mildly annoying; a nudge
that silently never fires is invisible.

### Flags

| Flag | Meaning |
|---|---|
| `--league SLUG` | `main` \| `3star` \| `1star`. Defaults to main. |
| `--dry-run` | Print the message. Post nothing. |
| `--skip-hours N` | Post-advance quiet window. Default 12. `0` disables. |
| `--force` | Post even inside that window. |

Mentions work exactly as described under `advance.js` — same
`makeMentioner`, same case-insensitive coach lookup, same
`allowed_mentions` allowlist, same warning naming any coach with no ID
on file. Unplayed games come from `buildWeek()`'s `scored` flag, so
"unplayed" here means precisely what it means on the site and in the
score prompts.

### Testing it

Actions tab → **Morning posts** → **Run workflow**. It defaults to a dry
run: the exact message for each league prints in the job log and Discord
is left alone. Tick **post** to send it for real, **force** to bypass
the 12-hour window.

That one workflow runs both morning posts — the nudge, then
`heads-up.js`. They share a cron because they share a checkout, a copy
of the Discord config and a schedule; a second workflow would have meant
a second of each, including a second cron to remember to shift when
daylight saving ends.

**`force` and `headsup_force` are separate tickboxes**, and that split
exists because sharing one wasn't. Forcing the nudge just skips a quiet
window. Forcing the heads-up makes it post on a day that isn't an
advance day — an assertion about the calendar that the league can check
against reality. Leave `headsup_force` off unless you specifically want
that.

Writes nothing, commits nothing, touches the network only for the
webhook POST.

## heads-up.js

The advance-day "here's who you play next" post. On the morning of an
advance, it lists **next** week's head-to-head matchups and tags the
coaches in them, so two people have all day to agree a time instead of
starting that conversation at 6 PM.

```
node tools/heads-up.js --league main --dry-run
node tools/heads-up.js --league 3star
```

Like the nudge, you normally don't run this — the same
**`.github/workflows/morning-posts.yml`** runs it for all three leagues
at 10:00 AM Eastern, right after the nudge.

### It posts on exactly one condition

`SEASON.nextAdvanceAt` names a deadline that falls **today** in Eastern
and **hasn't passed yet**. Everything else is silence, and the job log
says which condition wasn't met:

| Situation | Why nothing posts |
|---|---|
| No `nextAdvanceAt` | Nothing to compare against. |
| Deadline another day | Not today's problem. |
| Deadline already passed | The advance may have happened — the matchups would be the ones people are already playing. |
| Preseason | No current week, so no next week. |
| Next week past 15 | Bowl weeks come from the CFP bracket, not from a schedule this can read. |
| No H2H games next week | An all-CPU week needs no coordinating. |

That single condition is also why there's no "did I already post today"
state anywhere. The cron is daily and the test is a calendar date, so it
stays stateless — which matters, because the alternative is giving a
read-only job write access to the repo just to remember something it can
already work out.

### Flags

| Flag | Meaning |
|---|---|
| `--league SLUG` | `main` \| `3star` \| `1star`. Defaults to main. |
| `--dry-run` | Print the message. Post nothing. |
| `--force` | Post even when it isn't advance day. Testing only — and note the message then states the real deadline rather than saying "later today", because on a forced run that isn't true. |
| `--now ISO` | Pretend it's another moment, e.g. `--now "2026-08-11T14:00:00Z"`. Testing only. |

`--now` plus `--dry-run` is how you check an advance day without waiting
for one.

### No role ping

Same reasoning as the nudge: this is aimed at the handful of people with
a game to arrange, not at the league. The advance announcement a few
hours later carries the role and tells everyone the week moved. Pinging
the whole server twice in one day is how a bot gets muted.

Writes nothing, commits nothing, touches the network only for the
webhook POST.

## scores.js

Records final scores into `schedule-data.js`. Double-click
`scores.cmd`, or:

```
node tools/scores.js --week 4                     interactive
node tools/scores.js --week 4 --set "California 27-24"
node tools/scores.js --week 4 --dry-run
```

**Why this exists:** a head-to-head score has to be written twice —
once on each coach's schedule, with the numbers flipped on the second
one. Miss that and the game shows as final on one coach's page and
still upcoming on the other's. This tool writes both sides from one
answer, so they can't disagree.

Interactive mode lists every game that week — H2H and CPU — and asks
for each in turn:

```
  [3/18] Clemson at California
        Temptiger  vs  BlueMiniMeaniee
        Clemson scored: 27-24
```

Blank line skips a game, `q` stops and saves what you've entered. Games
that are already final are skipped unless you pass `--all`.

### Score format

Always from the named team's point of view, home or away:
`--set "California 27-24"` means California scored 27, their opponent
24. The site works out home/away itself. `27-24`, `27 24` and `27:24`
all parse.

For an H2H game either team names it — `"Clemson 24-27"` records the
same result. For a CPU game, name the **coach's** team, not the CPU
opponent; several coaches can draw the same CPU team in a week, so the
CPU name alone doesn't identify a game. The script says so if you try.

### Flags

| Flag | Meaning |
|---|---|
| `--league SLUG` | `main` \| `3star` \| `1star`. Defaults to main. |
| `--week N` | Week whose games are final, 0–15. Required. |
| `--set "T A-B"` | Non-interactive. Repeatable — pass several. |
| `--dry-run` | Show the exact before/after lines. Write nothing. |
| `--force` | Overwrite a score that's already recorded. |
| `--all` | Include already-final games in the prompts. |

### Guardrails

Everything below fails loudly rather than writing something wrong:

- a team name that doesn't match any game that week
- a name matching more than one game
- a tie score (college games can't end tied — it's always a typo)
- a bye or championship-placeholder week, which has no opponent
- a game that's already final, unless `--force`

Editing is line-surgical: it rewrites only the one `{ week: N, ... }`
line per team, so the explanatory comments and hand-formatting in
`schedule-data.js` survive untouched. The worked examples in those
comments look exactly like real entries — they're deliberately skipped.

Ctrl-D or a closed input stream mid-run saves what you've already
entered instead of discarding it.

### After

`scores.js` never posts to Discord and never commits. Check it locally
with `preview.cmd`, then:

```
git add -A && git commit -m "Week 4 scores" && git push
```

## top25.js

Writes a week's in-game Top 25 into `top25-data.js`.

```
node tools/top25.js --week 5 --file poll.txt
node tools/top25.js --week 5 --stdin < poll.txt
node tools/top25.js --week 5 --file poll.txt --dry-run
```

**Why this exists:** the poll arrives as a screenshot, so somebody has
to read 25 rows off an image — that part can't be automated. Everything
after it can. Counting to 25, catching a doubled rank, spotting
`Ole Mis` where `Ole Miss` was meant, and appending a block to a
documented data file without disturbing the comments around it are all
mechanical, and all easy to get wrong by hand at 11pm.

So the split is deliberate: whoever reads the screenshot produces plain
lines and hands them over. Nothing that reads an image edits the file.

### Input format

One team per line, best to worst:

```
1 Ohio State 2-0
2 Oregon 2-0
3. Notre Dame 1-1
```

Rank, team, record. A leading `1.` or `1)` is fine, extra whitespace is
fine, blank lines and a `Rank Team Record` header row are ignored. The
record is the trailing W-L and the rank is the leading number, so the
team is whatever's in between — which is why `Texas A&M` and
`Miami (OH)` need no escaping.

### Flags

| Flag | Meaning |
|---|---|
| `--league SLUG` | `main` \| `3star` \| `1star`. Defaults to main. |
| `--week N` | Week this poll is for, 1–15. Required. |
| `--file PATH` | Read the lines from a file. |
| `--stdin` | Read the lines from standard input. |
| `--dry-run` | Print the block and every check. Write nothing. |
| `--allow-new` | Accept a team the league has never referenced, or one that looks like a misread but isn't. |
| `--force` | Overwrite a week that already exists. See below. |

### Guardrails

Everything here fails loudly rather than writing something wrong:

- fewer or more than 25 rows, naming exactly which ranks are missing or
  doubled
- the same school twice
- a line that doesn't parse, quoted by line number
- a record that isn't `W-L`
- a week outside 1–15, or one that already exists

The name check is the one worth explaining, because two situations look
identical in the input and must not be treated the same. `Ole Mis` is a
misread — one edit away from a name that's all over the league data, so
it **blocks** and suggests the correction. `Cincinnati`, a school that
genuinely wasn't in the poll before and isn't on anyone's schedule, is
**legitimate** and will happen most weeks; it warns and asks for
`--allow-new`. Edit distance is what tells them apart. Blocking on the
first and waving through the second is the difference between a check
that gets read and one that gets reflexively `--force`d.

Edit distance can't do it perfectly, though, because some pairs of real
schools are one character apart: `South Carolina` / `North Carolina`,
`Miami` / `Miami (OH)`. So `--allow-new` clears the misread check as
well as the unknown-name one — it already means "I checked these against
the screenshot", which is exactly the claim being made. The suggestion is
still printed after the write so it can be eyeballed. `--force` is not
the flag for this and never was.

It also prints week-over-week movement, and flags any team that moved
12 or more spots as worth a second look at the screenshot. That's
advisory — the site computes the same arrows itself — but a
transcription error usually shows up there first.

### Never re-enter a week

Each week's poll is frozen history. The `#N` badges on every week-5
game read from week 5's block, so editing it in October silently
rewrites what those games say they were at the time. The script refuses
a week that already exists; `--force` is there for fixing a
transcription the same night, before anyone's seen it, and nothing else.

### Order of operations (main)

The site shows the poll for `SEASON.currentWeek`, so a block written
here for a week you haven't advanced to sits in the repo invisible. It
appears the moment you advance — and the advance gate in
`lib/league.js` refuses to advance to week N until week N's poll is in
the file.

That's a deliberate loop, not two separate chores:

```
node tools/top25.js --week 5 --file poll.txt     # silent
git add -A && git commit -m "Week 5 Top 25" && git push
node tools/advance.js --week 5 --next "..."      # poll + week + Discord together
```

### Order of operations (3-star and 1-star)

There isn't one. Those leagues run the poll but are **not** gated on it
(`gateOnTop25: false` in `lib/league.js`), so the advance never waits on
a screenshot nobody took:

```
node tools/top25.js --league 3star --week 5 --file poll.txt
git add -A && git commit -m "3-star Week 5 Top 25" && git push
```

Upload before the advance, after it, or three weeks late — it surfaces
as soon as it's pushed, and a week that never gets uploaded just renders
its games unranked. The trade is that their Top 25 tab can trail the
schedule by a week, which is the right way round: a stale tab beats a
stalled season. `--league` is the easy thing to forget, and forgetting
it writes to main.

Neither league starts at week 1 — each begins at whatever week it was
first transcribed, and earlier weeks are not backfilled. 1-star's file
exists but is empty, and until it isn't, script.js hides the Top 25 tab
on that site entirely rather than showing an empty one.

Like the other tools, it edits one file and never commits.

### From a screenshot, without typing

There's a Cowork skill — **top25-upload** — that does the reading step:
hand it the screenshot and a week number, it transcribes to the line
format above and runs this script. It's written to be followable by a
cheap model, because transcription is the only thing it does; every
judgement stays here. It won't commit, won't advance, and won't pass
`--force` on its own.

## cfp.js

Writes a week's CFP Top 25 and projected 12-team bracket into
`cfp-data.js`.

```
node tools/cfp.js --week 10 --poll poll.txt --bracket bracket.txt
node tools/cfp.js --week 11 --poll poll.txt
node tools/cfp.js --week 14 --bracket bracket.txt --final
```

**The season has two halves.** Weeks 0–9 the game shows the AP Top 25
and `top25.js` writes it. From week 10 it shows the CFP Top 25 plus a
projected bracket, and this writes both. Same screenshot ritual, same
guardrails, different file — `top25.js` refuses a week ≥ 10 and this
one refuses a week < 10, so there's no way to put a poll in the wrong
era by fumbling a flag.

The two polls stitch into one timeline everywhere downstream: the `#N`
schedule badges, the movement arrows, and strength of schedule all keep
asking "what was the poll in week N" and get the right answer on either
side of the boundary. The only user-facing difference is the name — the
tab and the section retitle themselves to **CFP Top 25** — plus the
bracket, which has no AP-era equivalent.

`CFP_ERA_WEEK` is the boundary and it's stated in three places that must
agree: `script.js`, `tools/lib/league.js`, and this script.

### Poll input

Identical to `top25.js` — 25 lines, rank, team, record.

### Bracket input

Twelve lines, seed, team, record, and an optional automatic-qualifier
marker:

```
1 Ohio State 8-0
4 Duke 8-0 *
12 USF 8-0 *
```

The `*` is the in-game asterisk (a conference champion holding an
automatic bid); `AQ` and `auto` are accepted too, and an asterisk glued
to the team name works. It's display-only — the game has already moved
the seed, and the site shows it only on the box where a team enters the
bracket, not on every box it reaches afterwards.

### Bowl names

Optional directive lines, anywhere in the same bracket file:

```
qf: Cotton Bowl, Rose Bowl, Fiesta Bowl, Peach Bowl
sf: Orange Bowl, Sugar Bowl
nc: National Championship
site: Las Vegas, NV
```

`qf` is four names **top to bottom**, matching the bracket you're
reading; `sf` is two; `r1` is four if the game names the first-round
sites. `site` is taken whole, commas and all. The counts are checked —
a three-name `qf` line would otherwise leave one quarterfinal
unlabelled, which looks like a design choice rather than a typo.

**Enter each one once.** The site merges bowl names forward key by key,
so quarterfinal bowls entered in week 10 keep showing when semifinal
bowls arrive in week 13. They're a fact about the season, not the week,
and re-entering them weekly is just another chance to typo one.

**Don't transcribe the matchups.** The 12-team bracket's shape is
fixed — seeds 1–4 bye, first round is 5v12 / 6v11 / 7v10 / 8v9 feeding
4 / 1 / 3 / 2 — so the site draws the lines from the seed list. There
is deliberately no second copy of the pairings that could disagree with
the seeds. The script prints the derived bracket so it can be checked
against the screenshot, which is the one thing the data can't check for
itself: read a seed wrong and the wrong matchup is what makes it
obvious.

### Flags

| Flag | Meaning |
|---|---|
| `--league SLUG` | `main` \| `3star` \| `1star`. Defaults to main. |
| `--week N` | Week this is for, 10–15. Required. |
| `--poll PATH` | The 25 CFP Top 25 lines. |
| `--bracket PATH` | The 12 seed lines. |
| `--final` | This bracket is settled, not projected. |
| `--dry-run` | Print the blocks and every check. Write nothing. |
| `--allow-new` | Accept a team the league has never referenced. |
| `--force` | Overwrite a week that already exists. |

At least one of `--poll` / `--bracket` is required. Most weeks you pass
both, because both screenshots come off the same screen.

### Projected vs final

`projected: true` is the honest label from week 10 through the
conference championships — this is the field *if the season ended
today*, and it moves every week. Run the bracket entered after the CCGs
with `--final` and the panel stops saying PROJECTED.

### Extra checks this one has

Beyond everything `top25.js` does:

- **Poll and bracket cross-check.** Every seed must appear in that
  week's CFP Top 25, with the same record. A team in the bracket but
  not the poll, or a record that disagrees between the two, means one
  of the two screenshots was misread — and since they're the same
  screen, that's a real catch.
- **Movement is labelled by poll kind.** Week 10's only comparison is
  the week 9 AP poll, so the report says so and suppresses the
  big-move warnings: the committee's first ranking isn't the same
  measurement as the AP's, and 15-spot swings there are normal rather
  than suspicious.

### The advance gate follows the game

From week 10 the main dynasty's advance requires that week's CFP poll
**and** bracket instead of the AP poll — the bracket is the headline of
the tab by then, so advancing without it would publish a week with an
empty playoff panel. A league that has never entered a CFP week isn't
behind on it, so the first advance into the era is waved through and
the gate engages from the following week.

3-star and 1-star are not gated, same as the AP poll.

### Bowl weeks 16-19

The season doesn't end at the conference championships. The game plays
four more weeks, one per playoff round, and calls them Bowl Week 1
through 4 — so weeks 16, 17, 18 and 19 are the CFP first round,
quarterfinals, semifinals and national championship.

**Nothing gets transcribed in a bowl week.** The committee stops
publishing, so the poll freezes at the week-15 seeding poll and the site
tags it `FINAL SEEDING`; the bracket is already final by then. This
script refuses a week above 15 and says so. What changes is results, and
those go in `postseason-data.js` — the bracket fills itself in from
them, round by round.

The advance gate for weeks 16-19 asks for one thing: a **settled**
bracket, meaning one entered with `--final`. Advancing into the first
round on a projection would publish a field the games are about to
contradict. It does **not** gate on results — `postseason-data.js` has
no writer yet, so that would be a wall with no door — and warns instead:

```
NOTE: CFP First Round: 3 of 4 results are in postseason-data.js.
      The bracket will show the next round's slots empty until the rest are entered.
```

### How the bracket fills in

It doesn't, from here. Results come from `postseason-data.js`: the
bracket advances a slot by looking for a played game between two known
teams in the `cfp-r1`, `cfp-qf`, `cfp-sf` and `cfp-nc` rounds. Those
four ids are load-bearing — rename one and the bracket quietly stops
filling past that round. A winner carries its seed, record and star
forward, so a team looks the same in the title game as it did in the
first round.

Same renderer draws the week-10 projection and the finished bracket;
there is no separate "results" mode to keep in sync.

## find-tools.cmd

Not something you run. `advance.cmd`, `scores.cmd` and `preview.cmd`
all `call` it to locate `node.exe` and `git.exe` before doing anything
else, so the search logic lives in one file instead of three.

It exists because two situations look exactly like "not installed"
but aren't:

- **Node was just installed.** Windows doesn't hand the updated PATH
  to Explorer until you sign out and back in, so `where node` fails
  even though `node.exe` is sitting in Program Files.
- **git came from GitHub Desktop.** Desktop bundles its own private
  copy of git and never adds it to PATH. If that's the only git on
  the machine, `where git` will never find it — restarting doesn't
  help, because there's nothing to pick up.

So it checks PATH first, then the standard install locations, then
`%LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git` (newest
version first, since upgrades leave the old folder behind). When git
turns up somewhere off-PATH, its `mingw64\bin` goes on PATH for that
window only — otherwise git can't find its credential helper and
`git push` prompts for a password that a modern GitHub account
doesn't have.

Missing git isn't fatal. The advance and scores scripts still write
their files and still post to Discord; you just get told to publish
from GitHub Desktop instead.

## make-codes.js

Generates the access codes for the web admin page. Double-click
`make-codes.cmd`, or:

```
node tools/make-codes.js
```

Asks for a name and which leagues that person runs, one at a time,
then prints the `ACCESS_CODES` JSON to paste into the Cloudflare
Worker plus each person's own code to send them.

Run it again later and paste your existing JSON when it asks to add
someone — everyone's current codes carry over, so nobody gets locked
out.

**It never writes to disk.** The output is a secret: anyone holding a
code can record scores as that person. Saving it into this repo would
be one `git add -A` away from publishing it.

Codes are 20 characters from an alphabet with no `0`/`O` or `1`/`I`/`L`.
The admin page deliberately doesn't remember a code between refreshes,
so they get typed by hand, often on a phone — legibility is worth more
there than the handful of bits it costs.

Full context in `worker/ADMIN-SETUP.md`.

## apply.js

Not something you run by hand, though you can. It takes a JSON file
describing one submission and performs it:

```
node tools/apply.js payload.json
```

This is what the web admin page ends up calling. The page sends to a
Cloudflare Worker, the Worker triggers the **League update** workflow,
and the workflow runs this. Setup is in `worker/ADMIN-SETUP.md`.

It reimplements nothing. Scores go through `scores.js`'s own
`parseSet()` and `applyScores()`; an advance goes through
`advance.js`'s `updateSeason()`. So a score entered on a phone hits
the same tie check, the same ambiguous-name check and the same bye
check as one typed at the prompt, and the file is edited by the same
line-surgical writer.

What it adds is validation, because its input arrives from the
internet rather than from you:

- **Per-action league allow-lists, hardcoded.** `SCORE_LEAGUES` and
  `ADVANCE_LEAGUES` (both `1star`, `3star`, `main`) are checked against
  the action. All three leagues can be scored and advanced from the
  web; a web advance posts the Discord announcement itself, through the
  same `buildMessage`/`post` the local tool uses, with the webhooks and
  coach IDs supplied to the runner by the `DISCORD_CONFIG` repo secret.
  The two lists are kept separate so a league can be made scores-only
  again by dropping it from `ADVANCE_LEAGUES` alone.
- Week must be a whole number 0–15, at most 40 entries per
  submission, team names capped in length.
- Deadline and status text is checked against a character allowlist.
  `updateSeason()` already runs it through `JSON.stringify()` and
  `script.js` escapes it before rendering, so this is a third layer
  rather than the only one.
- An advance requires an explicit confirmation flag — the server-side
  half of the admin page's two-step confirm.

Handy for testing the web path without a browser:

```
echo '{"action":"scores","league":"1star","week":4,"actor":"you",
       "entries":[{"team":"Baldwin Wallace","score":"27-24"}]}' > /tmp/p.json
node tools/apply.js /tmp/p.json
```

Like the other tools, it edits files and never commits.

## lib/league.js

Shared by `advance.js`, `scores.js` and `apply.js`: locating the data
files, loading them off disk, argument parsing and config.

It's one copy on purpose. When this logic lived in two places the risk
was Discord and the site quietly describing the same game differently.

### Where the matchup logic actually lives

The roster matching, week building and score parsing are no longer
written out in this file — they're in **`/week-core.js` at the repo
root**, and re-exported here so `require("./lib/league")` still hands
back everything it always did.

They moved because the admin page needs to ask the identical question
("what games are in week 4, and which are already final?") from a
browser, and `lib/league.js` can't run there — it uses `fs`, `path`
and `vm`. Reimplementing the matching in page JavaScript would have
put it in a third place, which is the exact drift this file exists to
prevent.

So `week-core.js` is the pure half — no Node built-ins, works in both
— and `lib/league.js` is the Node-only half. The rule for deciding
where something goes: if it touches the disk or the process, it stays
here; if it's a question about the data, it goes to `week-core.js`.

The upshot is that the game list rendered on the admin page is
produced by the same function that produces the Discord announcement
and the interactive score prompts.
