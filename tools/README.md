# tools/

Commissioner tooling. Nothing in here ships to the site — GitHub Pages
serves the root, and this folder is just scripts you run locally.

## advance.js

Does both halves of a week advance in one command: updates the site's
season state and announces the new week in Discord.

```
node tools/advance.js --week 5 --next "Sunday, July 26 · 6:00 PM EDT"
```

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

`advance.js` doesn't touch scores — add `teamScore` / `opponentScore` to
the week entry on **both** coaches' schedules in `schedule-data.js`, as
described at the top of that file.
