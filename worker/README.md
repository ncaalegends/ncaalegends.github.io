# Twitch live status — setup

One-time setup, ~10 minutes. Until you finish it the site behaves
exactly as it does today: no badges, no errors, nothing broken.

The Worker is the only place the Twitch client secret exists. It never
goes in this repo.

## 1. Register a Twitch application

1. Go to https://dev.twitch.tv/console/apps and click **Register Your Application**
2. Name: anything (`NCAA Legends Live`)
3. OAuth Redirect URL: `http://localhost` — required by the form, never used
4. Category: **Website Integration**
5. Click **Manage** on the new app, then **New Secret**

Copy the **Client ID** and **Client Secret**. The secret is shown once.

## 2. Create the Worker

1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker**
2. Name it `ncaa-legends-live`, deploy the default hello-world
3. Click **Edit code**, delete what's there, paste all of `live-status.js`, **Deploy**

## 3. Add the secrets

In the Worker → **Settings** → **Variables and Secrets**:

| Name | Type | Value |
|---|---|---|
| `TWITCH_CLIENT_ID` | Secret | from step 1 |
| `TWITCH_CLIENT_SECRET` | Secret | from step 1 |
| `ALLOWED_ORIGINS` | Text | `https://ncaalegends.github.io,http://localhost:8080` |

`ALLOWED_ORIGINS` is optional but recommended — without it, anyone can
point their own site at your Worker and spend your rate limit.

Deploy again after adding these.

## 4. Point the site at it

Copy the Worker URL (`https://ncaa-legends-live.<your-subdomain>.workers.dev`)
into `people.js`:

```js
const LIVE_STATUS = {
  endpoint: "https://ncaa-legends-live.your-subdomain.workers.dev",
  refreshSeconds: 120,
};
```

Commit and push. Done.

## Checking it works

Open the Worker URL directly with a channel you know is live:

```
https://ncaa-legends-live.<sub>.workers.dev/?logins=alexgators1,kyrvach
```

Expected: `{"live":["kyrvach"],"checked":2,"ts":1753142400}`

- `{"live":[]}` with no `error` — worked fine, nobody is streaming
- `{"live":[],"error":"token 401"}` — client ID or secret is wrong
- `{"live":[],"error":"token 400"}` — secret missing entirely

The site derives logins from the `twitch:` URLs in `league-data.js`,
so a coach with no link is simply never asked about.

## Cost and limits

Free tier is 100,000 Worker requests/day. With a 60-second edge cache,
the site generates at most ~1,440 Helix calls/day no matter how much
traffic it gets. Twitch's limit is 800 points/minute; one call for the
whole roster costs 1 point.

## Turning it off

Blank the `endpoint` in `people.js`. The fetch never fires and the
badges disappear. No need to touch the Worker.
