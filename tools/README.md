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
| `--next "..."` | Advance deadline, free text. Carries over the existing value if omitted. |
| `--status "..."` | Override the hero status line. Defaults to `WEEK N`. |
| `--dry-run` | Print the message. Change nothing, post nothing. |
| `--no-post` | Update the data file, skip Discord. |
| `--no-write` | Post to Discord, leave the data file alone. |

**Always dry-run first** if you're unsure — it shows the exact matchup
list and flags any coach missing an entry for that week.

### Mentions — the one thing that trips people up

**Discord only sends a notification for mentions in the message body.**
A mention inside an embed renders blue but pings nobody. That's why the
role ping and the H2H matchups live in the plain `content` field
while the CPU list sits in the embed — the pings have to be where they
actually fire.

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
role — set via `roleMention` in the config, both fields blank for none.

Because there's no blanket ping configured, **every coach with a game
that week is mentioned individually in the message body** — H2H games
and CPU games alike. That's deliberate: if CPU games sat in the embed
where they'd look neater, the ~18 coaches playing CPU opponents would
get no notification at all.

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
