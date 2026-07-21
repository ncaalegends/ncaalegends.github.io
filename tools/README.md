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
node tools/advance.js --league 3star --week 2 --no-post
```

### Leagues

`--league` picks which folder to operate on. Defaults to `main`.

| Slug | Folder | Discord |
|---|---|---|
| `main` | `/main/` | posts to the main channel |
| `3star` | `/3star/` | no webhook — use `--no-post` |
| `1star` | `/1star/` | no webhook — use `--no-post` |

The 1-star and 3-star dynasties are run by other commissioners who
haven't opted into the automation. Their webhooks are blank in
`config.json`, and the script refuses to post rather than silently
doing nothing. `advance.cmd` passes `--no-post` for them automatically.

Discord IDs in `config.json` are shared across all three leagues,
keyed by coach name — a person has one Discord account regardless of
how many dynasties they're in. Coaches who only play 1-star or 3-star
have no ID yet and will show as bold text instead of a ping, which the
script warns about on every run.

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

## lib/league.js

Shared by `advance.js` and `scores.js`: loading the data files,
resolving team names against the roster and alias table, and turning a
week number into its list of matchups.

It's one copy on purpose. The roster-matching logic here mirrors
`script.js`, and when it lived in two places the risk was Discord and
the site quietly describing the same game differently.
