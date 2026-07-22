# Commissioner tools — setup

One-time setup, ~20 minutes. Until you finish it the admin page
loads but says it isn't connected to its server yet. Nothing else on
the site is affected at any point.

What you're setting up: a page at `ncaalegends.github.io/admin/`
where the 1-star and 3-star commissioners enter scores and advance
weeks themselves, without installing anything and without a GitHub
account.

## How the pieces fit

```
  admin page  ──►  Cloudflare Worker  ──►  GitHub Actions  ──►  Pages
  (static)         (holds the token)      (runs the tools)     (live site)
```

The page can't commit — it's static, and a token in front-end
JavaScript is a published token. So it asks the Worker, which holds
the token and checks the caller's access code. The Worker doesn't
edit files either; it triggers the **League update** workflow, which
runs `tools/apply.js` → the same `scores.js` and `advance.js` you run
locally. One set of file-editing logic, three ways to reach it.

The practical upshot: **nothing that comes through the web can do
anything the command-line tools can't.** Same guardrails, same
surgical edits, same refusal to touch a bye week.

---

## 1. Create the GitHub token

The Worker needs permission to trigger the workflow.

1. GitHub → **Settings** → **Developer settings** → **Personal access
   tokens** → **Fine-grained tokens** → **Generate new token**
2. Name: `ncaa-legends-admin`
3. **Repository access** → *Only select repositories* →
   `ncaalegends/ncaalegends.github.io`
4. **Permissions** → *Repository permissions* → **Contents: Read and
   write**. That one permission is what allows `repository_dispatch`.
   Leave everything else alone.
5. Set an expiry you'll actually notice — a year is reasonable. Put a
   reminder in your calendar; when it lapses the page starts saying
   "Couldn't reach GitHub" and the cause is not obvious.

Copy the token. It's shown once.

## 2. Generate access codes

**Double-click `tools/make-codes.cmd`.** It asks for a name and which
leagues that person runs, one person at a time, and prints both the
JSON to paste into Cloudflare and each person's individual code.

```
  Name (blank when you're done): Dave
  Which leagues?  [1] 1-Star  [2] 3-Star  [3] Both : 1
  Added Dave — 1-Star only.

  Name (blank when you're done): Marcus
  Which leagues?  [1] 1-Star  [2] 3-Star  [3] Both : 2
  Added Marcus — 3-Star only.

  Name (blank when you're done):
```

Press Enter on a blank name to finish, and it prints:

```json
{"HP864-PZAMD-SGVT3-KWFZN":{"name":"Dave","leagues":["1star"]},"EPK5G-7SZYR-AN2WM-EQ7CR":{"name":"Marcus","leagues":["3star"]}}
```

That whole line is the value for `ACCESS_CODES` in step 4. Underneath
it, the script lists each person with their own code, ready to send.

**Adding someone later?** Run it again and paste your current
`ACCESS_CODES` value when it asks. The new person is merged in and
everyone's existing codes carry over unchanged — nobody gets locked
out and nobody needs a new code.

Nothing is written to disk. Copy what you need before closing the
window; the codes can't be shown again, though re-running with the
existing JSON pasted in is always available.

### What the fields mean

`name` is what appears in the commit message and the Actions log, so
the history reads `1-Star Dynasty: Week 4 scores (via Dave)`. Use
whatever you'd recognise at a glance.

`leagues` is the authorisation. A code listing only `1star` cannot
touch 3-star, and the Worker re-checks this on every request rather
than trusting what the page sends.

**One code per person, not per league** — that's what makes the audit
trail meaningful and what lets you revoke one person without
disrupting anyone else. Someone who runs both leagues gets one code
covering both.

`main` isn't offered. Even a code listing it would be refused —
`tools/apply.js` hardcodes the allowed leagues, so the main dynasty
isn't reachable from the web path at all.

### If you'd rather do it by hand

The format is just an object keyed by code:

```json
{
  "SOME-LONG-RANDOM-CODE": { "name": "Dave", "leagues": ["1star"] }
}
```

The Worker refuses to start if any code is under 16 characters, since
code length is the only thing really standing between the page and a
brute-force attempt. The generated ones are 20 random characters from
an alphabet with no `0`/`O` or `1`/`I`/`L`, because these get typed by
hand on phones.

## 3. Create the Worker

1. Cloudflare dashboard → **Workers & Pages** → **Create** →
   **Create Worker**
2. Name it `ncaa-legends-admin`, deploy the default hello-world
3. **Edit code**, delete what's there, paste all of `admin-api.js`,
   **Deploy**

## 4. Add the secrets

Worker → **Settings** → **Variables and Secrets**:

| Name | Type | Value |
|---|---|---|
| `GITHUB_TOKEN` | Secret | the token from step 1 |
| `ACCESS_CODES` | Secret | the JSON from step 2, all on one line |
| `GITHUB_REPO` | Text | `ncaalegends/ncaalegends.github.io` |
| `ALLOWED_ORIGINS` | Text | `https://ncaalegends.github.io,http://localhost:8080` |

Deploy again after adding these.

`ALLOWED_ORIGINS` is what stops someone else's website from putting a
form in front of your Worker. Unlike the Twitch worker, where it only
protects a rate limit, here it's worth setting properly.

## 5. Point the page at the Worker

Copy the Worker URL and paste it into `admin/admin.js`:

```js
const ADMIN_API = "https://ncaa-legends-admin.your-subdomain.workers.dev";
```

Commit and push. Done.

## 6. Check it works

Test the Worker directly first — this needs no browser:

```
curl -X POST https://ncaa-legends-admin.<sub>.workers.dev/whoami \
  -H "Content-Type: application/json" \
  -d '{"code":"k3Jx9Qm2vLpR8tNwYc4hZA"}'
```

Expected: `{"name":"Dave","leagues":["1star"]}`

- `{"error":"That code wasn't recognised."}` — code doesn't match
  `ACCESS_CODES`, or the JSON didn't save as one line
- `{"error":"Server is misconfigured. Tell Josh."}` — `ACCESS_CODES`
  isn't valid JSON, or a code is under 16 characters. The Worker's
  live log (Cloudflare → your Worker → **Logs**) says which.

Then open `/admin/`, sign in, and record one real score. Watch it in
the repo's **Actions** tab — you'll see the run, what was submitted,
and what it wrote.

---

## What the commissioners need to know

Send them the URL and their code. That's the whole briefing. The page
explains itself, but worth saying out loud:

- **Blank means "not played yet", not 0–0.** They fill in the games
  they've played and leave the rest alone.
- **Changes take about a minute** to appear on the site. The page
  says so after each save.
- **A finished game is locked** until they click Edit and confirm.
- **Advancing asks twice.** The second screen spells out what's about
  to happen, including a warning if the week goes backwards or skips
  ahead.

## When something is rejected

`apply.js` refuses rather than writing something wrong — a tie score,
a team name that matches two games, a bye week with no opponent. The
page catches most of these before sending, but when one gets through,
the workflow run fails and **GitHub emails you**, not the person who
submitted it. They'll just see the site not updating.

That asymmetry is the one rough edge in this design. If it happens
more than rarely, the fix is a status endpoint the page can poll —
worth doing then, not worth building on spec.

## Revoking access

Remove the person's entry from `ACCESS_CODES` and redeploy. Takes
about thirty seconds and affects nobody else. (`make-codes.cmd` adds
people; removing one is a matter of deleting its `"CODE": {...}` pair
from the value in Cloudflare.) If you think the
**token** leaked rather than a code, delete it on GitHub and issue a
new one — that's the credential that actually matters.

## Adding Discord announcements later

Neither of these leagues has a webhook configured, so an advance
through the admin page updates the site and posts nothing. When one
wants announcements:

1. Add the webhook URL as a Worker secret (not to `tools/config.json`
   — that file is gitignored and the workflow runner never sees it)
2. Pass it into the workflow as a repository secret instead, and have
   `doAdvance()` in `tools/apply.js` call `advance.js`'s
   `buildMessage()` and post it

`advance.js` already exports `buildMessage` for this. The mention
logic, the 2000-character ceiling and the allowlist all come along
with it — see the mentions section of `tools/README.md`, which is
still the authoritative explanation of why pings live in the message
body rather than the embed.

## Turning it off

Blank the `ADMIN_API` value in `admin/admin.js` and push. The page
then explains it isn't connected and can't send anything. To disable
it completely, delete the Worker — the workflow can only be triggered
by something holding the token.
