# Pick'em — Phase 1 setup

Getting a button in Discord to write a row in a database. About
thirty minutes. Nothing on the live site changes at any point.

Phase 1 is deliberately narrow: no admin UI, no public page, no
scoreboard. Those are Phases 2 and 3, and none of them are worth
designing until a click provably lands.

## What's already done

From the developer portal, recorded in `docs/SCOPING-voting-polls.md`:

| | |
|---|---|
| Application ID | `1537473891889315971` |
| Public Key | `ca909ef293293da60ea8eb1e0fb87016c77e8d8ec8b81954bdb5a46a9e38b1d3` |
| Guild | `1241189747276382239` |
| Pick'em channel | `1537451105598836766` |
| 3-star role | `1526933103610695780` |

Only the **bot token** is sensitive. Everything above is visible to
anyone in the server. The public key only *verifies* signatures — it
can't create them — so despite the name it's safe in this repo.

---

## 1. Create the database

```
wrangler d1 create ncaa-legends-pickem
wrangler d1 execute ncaa-legends-pickem --remote --file=worker/pickem-schema.sql
```

Keep the `database_id` that the first command prints.

No Wrangler? The dashboard does both: **Storage & Databases → D1 →
Create**, then the **Console** tab, and paste `pickem-schema.sql`.

## 2. Create the Worker

Same shape as the other two workers here.

1. Cloudflare dashboard → **Workers & Pages** → **Create** →
   **Create Worker**
2. Name it `ncaa-legends-pickem`, deploy the hello-world
3. **Edit code**, delete what's there, paste all of `pickem-api.js`,
   **Deploy**

## 3. Bind the database

Worker → **Settings** → **Bindings** → **Add** → **D1 database**.

| Variable name | Database |
|---|---|
| `DB` | `ncaa-legends-pickem` |

The variable name must be exactly `DB` — that's what the code reads.

## 4. Add the variables

Worker → **Settings** → **Variables and Secrets**:

| Name | Type | Value |
|---|---|---|
| `DISCORD_PUBLIC_KEY` | Text | `ca909ef2…38b1d3` |
| `DISCORD_BOT_TOKEN` | **Secret** | from the Bot page |
| `PICKEM_CHANNEL_ID` | Text | `1537451105598836766` |
| `THREE_STAR_ROLE_ID` | Text | `1526933103610695780` |
| `DEV_SECRET` | **Secret** | any long random string you invent |

`DEV_SECRET` guards the temporary `/dev/poll` endpoint used to create
a test poll from the command line. Phase 2 deletes that endpoint.

Deploy again after adding them.

## 5. Check it's alive

Open in a browser, or:

```
curl https://ncaa-legends-pickem.<sub>.workers.dev/health
```

This doesn't just report that variables are non-empty — it actually
imports the public key, which is the exact step that decides whether
step 6 can succeed. Expected:

```json
{
  "ok": true,
  "ready": true,
  "checks": {
    "public_key_set": true,
    "bot_token_set": true,
    "channel_set": true,
    "role_set": true,
    "db_bound": true,
    "schema_applied": true,
    "key_length_ok": true,
    "ed25519": "Ed25519"
  }
}
```

**`"ready": true` is the thing to look for.** Don't attempt step 6
without it — you'll get "validation failed" and won't learn anything.

| What you see | What it means |
|---|---|
| `"ed25519": "NODE-ED25519"` | Fine. Older runtime, legacy algorithm name, works identically. |
| `"ed25519": "KEY_NOT_HEX"` | The value has a stray space, quote, or newline. Re-paste it. |
| `"key_length_ok": false` | Not the public key. It's exactly 64 hex characters — you may have pasted the Application ID or the token. |
| `"ed25519": "UNSUPPORTED"` | The runtime imported neither variant. Raise the Worker's compatibility date to today under Settings → Runtime. |
| `"schema_applied": false` | Step 1's SQL didn't run against the database that's bound here. |
| `"db_bound": false` | The binding isn't named exactly `DB`. |

## 6. Point Discord at it

**This is the gate.** Discord validates the URL the instant you save it
by sending a signed `PING`, and refuses the save unless the Worker
verifies the signature and answers correctly.

Developer portal → your app → **General Information** →
**Interactions Endpoint URL**:

```
https://ncaa-legends-pickem.<sub>.workers.dev/interactions
```

**Save Changes.**

- **Saves cleanly** — signature verification works. This is the
  milestone; everything after it is ordinary code.
- **"validation failed"** — see below.

### When validation fails

Work through these in order; the first two catch almost everything.

**1. Is `/health` reporting `"ready": true`?** If not, fix that first —
step 5's table says what each failure means. Discord cannot validate an
endpoint whose key won't import.

**2. Open Worker → Logs, then press Save Changes again.** The Worker
logs the specific reason on every rejection, and the message tells you
which of these it is:

**First, check the path in the log.** If the log entry shows
`"path": "/"` and `"status": 404`, the URL was saved without
`/interactions` on the end. The Worker now accepts a signed POST at the
root as well, so re-deploying the current file fixes it either way —
but this was the original cause, and it presents as "validation failed"
with nothing in any message mentioning a path.

| Log line | Cause |
|---|---|
| `404` with `"path": "/"` | URL missing `/interactions`. Re-deploy the current file, which accepts both. |
| `missing signature headers` | Something other than Discord hit the URL. |
| `DISCORD_PUBLIC_KEY is not hex` | Stray whitespace or quotes in the variable. |
| `public key is N bytes, expected 32` | Wrong value pasted. |
| `no Ed25519 variant could import the key` | Runtime too old — raise the compatibility date. |
| `signature rejected using Ed25519` | The key imported but doesn't match. **This is a different app's public key**, or it was regenerated after you copied it. |
| *(nothing at all)* | Discord never reached the Worker. Check the URL, and that the last **Deploy** actually went out. |

**3. Confirm you pasted the whole current file.** The dashboard editor
keeps the old version until you press **Deploy**, and a partial paste
fails in exactly this way.

Historical note, in case it resurfaces: the first version of this
Worker passed a `namedCurve` parameter to both Ed25519 import variants.
Modern runtimes reject the extra parameter on the standard variant and
no longer offer the legacy one, so both imports threw, every signature
check returned false, and Discord reported "validation failed" with no
other symptom. Each variant now carries its own parameter shape.

## 7. Post a test poll

`closes_at` is a unix time in **seconds**, not milliseconds.

### PowerShell (Windows — use this one)

Win+X → **Terminal**, or search for PowerShell. Paste the whole block.

```powershell
$base   = "https://ncaa-legends-pickem.<sub>.workers.dev"
$secret = "YOUR_DEV_SECRET"

$body = @{
  a         = "Bl00dVayN3"
  b         = "Temptiger"
  note      = "Test poll"
  closes_at = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + 3600
} | ConvertTo-Json

Invoke-RestMethod -Uri "$base/dev/poll" -Method Post `
  -ContentType "application/json" `
  -Headers @{ "X-Dev-Secret" = $secret } -Body $body
```

`+ 3600` is an hour of voting. Use `+ 300` for a five-minute window
when you want to watch a poll close without editing the database.

Don't use `curl` in PowerShell — it's an alias for
`Invoke-WebRequest`, which takes different arguments, and the error it
produces looks nothing like the real problem.

### bash / macOS / Linux

```bash
curl -X POST https://ncaa-legends-pickem.<sub>.workers.dev/dev/poll \
  -H "Content-Type: application/json" \
  -H "X-Dev-Secret: <your DEV_SECRET>" \
  -d "{\"a\":\"Bl00dVayN3\",\"b\":\"Temptiger\",\"note\":\"Test poll\",\"closes_at\":$(($(date +%s)+3600))}"
```

Expected: `{"ok":true,"poll_id":1,"message_id":"…"}` and a message with
two grey buttons in the channel.

A failed post **rolls the database row back**, so a failure is a no-op
you can just retry once it's fixed. The reply carries a `hint`:

| Discord error | Cause and fix |
|---|---|
| `50001 Missing Access` | The bot can't **see** the channel. Adding a bot to a server does *not* grant it access to private or role-gated channels — that's a separate permission. Right-click the channel → **Edit Channel** → **Permissions** → **+** → add the bot → allow **View Channel**, **Send Messages**, **Embed Links**. |
| `50013 Missing Permissions` | It can see the channel but can't post. Grant **Send Messages** and **Embed Links**. |
| `401 Unauthorized` | `DISCORD_BOT_TOKEN` is wrong, or was reset after you copied it. |
| `404 Not Found` | `PICKEM_CHANNEL_ID` doesn't match a channel the bot can reach. |

If none of it works, check the bot actually appears in the server's
member list. If it doesn't, the install link in Phase 0 never
completed and no permission change will help.

## 8. What to actually test

The four cases that matter:

1. **A first vote.** Click a button → ephemeral "Locked in: X".
   `SELECT * FROM votes` shows one row.
2. **Changing it.** Click the other button → "Changed to Y". Still
   **one** row in `votes`, now two in `vote_history`.
3. **The same button twice.** → "You've already picked X." No new
   history row. It must not toggle the vote off.
4. **A late click.** Set `closes_at` to the past
   (`UPDATE polls SET closes_at = 1 WHERE id = 1`) and click → "Voting
   closed". No write.

Then, if you can, have someone without the 3-star role click: they
should get "Pick'em is for the 3-star dynasty" and write nothing.

```
wrangler d1 execute ncaa-legends-pickem --remote \
  --command "SELECT * FROM votes; SELECT * FROM vote_history;"
```

## Once all four pass

Phase 1 is done and the risky part is behind you.

---

# Phase 2 — Blood creates polls

## 9. Give the Worker the access codes

Pick'em is a **separate grant** from running a league. Take the current
`ACCESS_CODES` value from the `ncaa-legends-admin` Worker and add
`"pickem": true` to the people who should run the pick'em:

```json
{
  "HP864-PZAMD-SGVT3-KWFZN": { "name": "Bl00dVayN3", "leagues": ["3star"], "pickem": true },
  "EPK5G-7SZYR-AN2WM-EQ7CR": { "name": "RekenCrew",  "leagues": ["1star","3star","main"], "pickem": true },
  "K2M9X-4PLQW-7BNVR-3TZHD": { "name": "Dave",       "leagues": ["1star"] }
}
```

Dave has no `pickem` key, so his code scores 1-star and is refused by
every endpoint here. Nobody gets a second code.

Save that same value as `ACCESS_CODES` on **both** Workers:

| Worker | Variables to add |
|---|---|
| `ncaa-legends-admin` | `ACCESS_CODES` — updated with the `pickem` flags |
| `ncaa-legends-pickem` | `ACCESS_CODES` (**Secret**), `ALLOWED_ORIGINS` (Text) |

`ALLOWED_ORIGINS` on the pick'em Worker:

```
https://ncaalegends.github.io,http://localhost:8080
```

**Yes, that's the same JSON in two places, and it's the one wart in
this setup.** Adding a commissioner means pasting it twice. It buys one
code and one sign-in for someone who both scores a league and runs the
pick'em, which is what lets pick'em be a tab on the existing admin page
rather than a second site with a second password. If the two ever
actually drift, the fix is to have this Worker call the admin Worker's
`/whoami` instead — one network hop, no duplication.

Re-deploy both.

## 10. Check the admin endpoints

```powershell
$base = "https://ncaa-legends-pickem.<sub>.workers.dev"
$code = "YOUR ACCESS CODE"

Invoke-RestMethod -Uri "$base/whoami" -Method Post `
  -ContentType "application/json" `
  -Headers @{ Origin = "https://ncaalegends.github.io" } `
  -Body (@{ code = $code } | ConvertTo-Json)
```

Expected: `{"name":"Bl00dVayN3","pickem":true}`

- `That code wasn't recognised` — not in `ACCESS_CODES` on **this**
  Worker, or the JSON didn't save on one line.
- `That code doesn't have pick'em access` — the code is valid but has
  no `"pickem": true`. This is the check working.
- `Not allowed from there` — `ALLOWED_ORIGINS` doesn't include the
  origin you sent.
- `Server is misconfigured` — `ACCESS_CODES` isn't valid JSON, or one
  code is under 16 characters. Worker → Logs says which.

Then list and create:

```powershell
Invoke-RestMethod -Uri "$base/polls/list" -Method Post `
  -ContentType "application/json" `
  -Headers @{ Origin = "https://ncaalegends.github.io" } `
  -Body (@{ code = $code } | ConvertTo-Json)

Invoke-RestMethod -Uri "$base/polls/create" -Method Post `
  -ContentType "application/json" `
  -Headers @{ Origin = "https://ncaalegends.github.io" } `
  -Body (@{
    code      = $code
    kind      = "dynasty"
    a         = "Bl00dVayN3"
    b         = "Temptiger"
    note      = "Week 10"
    closes_at = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + 3600
  } | ConvertTo-Json)
```

Three behaviours worth confirming, because each encodes a decision:

1. **`/polls/list` shows no split for an open poll** — only a vote
   count. Closed and settled polls carry `a_votes` and `b_votes`. Blood
   is in the drawing too, so a running tally visible anywhere before
   the deadline lets someone match the crowd.
2. **`/polls/outcome` on an open poll returns 409.** A result can't be
   set while votes are still being taken, or picks made after the
   answer was known would score.
3. **A failed Discord post creates nothing.** The row is rolled back,
   so a failure is a no-op you retry.

## 11. Delete the dev endpoint

`/polls/create` supersedes `/dev/poll`. Remove the `handleDevPoll`
function and its route, and delete the `DEV_SECRET` variable. It was
scaffolding for testing before any UI existed.

## Turning it off

Blank the **Interactions Endpoint URL** in the developer portal. Every
button goes dead immediately and nothing else on the site notices. To
disable it completely, delete the Worker; the buttons can only reach
something that holds the bot token.
