#!/usr/bin/env node
/* ============================================================
   RTA — offseason "who hasn't readied up" ping
   ------------------------------------------------------------
   During the OFFSEASON hold, the daily task reads the dynasty's
   Members tab, works out which coaches haven't marked Ready to
   Advance, and asks this tool to tag them in that league's Discord.

   The PC that reads the game can't reach discord.com (its network
   only allows GitHub), so the real post happens on the Actions
   runner: the task fires a repository_dispatch of type "rta-ping"
   and .github/workflows/rta-ping.yml runs this file there, with
   tools/config.json provided from the DISCORD_CONFIG secret. Run it
   locally with --dry-run to check the message before dispatching.

     node tools/rta.js --payload payload.json --dry-run
     node tools/rta.js --payload payload.json          (runner only)

   PAYLOAD (JSON)
     { "league":   "scbthunderdome",
       "stage":    "Offseason Recruiting Week 3 of 4",
       "notReady": ["Cros", "Danny"],
       "ready":    ["Trey"] }

   SAFETY
   Every name must be a coach in that league's COACHES list, so the
   message can only ever contain roster names. Only the not-ready
   coaches are allowed to be pinged: no @everyone, no @here, no
   roles, whatever the config's roleMention says. Any name it can't
   match, or a not-ready coach with no Discord ID, stops the post.
   Writes nothing, commits nothing; at most one webhook POST.
   ============================================================ */

const fs = require("fs");
const { parseArgs, die, resolveLeague, loadData, loadConfig } = require("./lib/league");
const { post, webhookUrl } = require("./advance");

const args = parseArgs(process.argv.slice(2));
const dry = args.flags.has("dry-run");
if (!args.payload) die("usage: node tools/rta.js --payload FILE [--dry-run]");

let p;
try {
  p = JSON.parse(fs.readFileSync(args.payload, "utf8"));
} catch (e) {
  die(`could not read payload: ${e.message}`);
}

const L = resolveLeague(String(p.league || ""));
const stage = String(p.stage || "").replace(/[`*_~|<>@#\[\]()\\]/g, "").replace(/\s+/g, " ").trim();
if (!stage || stage.length > 80) die(`stage must be 1-80 characters, got "${stage}"`);

const list = (v) => (Array.isArray(v) ? v : []).map((s) => String(s).trim()).filter(Boolean);
const notReady = [...new Set(list(p.notReady))];
const ready = [...new Set(list(p.ready))];
if (!notReady.length) die("notReady is empty: nobody to ping, so nothing is posted.");
if (notReady.length + ready.length > 60) die("too many names");

// Roster check: every name must be a coach in THIS league.
const { COACHES } = loadData(L.paths);
const roster = {};
for (const c of COACHES) if (c && c.name) roster[c.name.toLowerCase()] = c.name;
const unknown = [...notReady, ...ready].filter((n) => !roster[n.toLowerCase()]);
if (unknown.length) die(`not coaches in ${L.slug}'s COACHES: ${unknown.join(", ")}. Not posting.`);

// Discord IDs, case-insensitive, from the shared coach map.
const cfg = loadConfig();
const ids = {};
for (const [k, v] of Object.entries(cfg.coaches || {})) ids[k.toLowerCase()] = String((v && v.id) || v || "").trim();
const users = [];
const noId = [];
const tags = notReady.map((n) => {
  const id = ids[n.toLowerCase()];
  if (/^\d{15,25}$/.test(id)) { users.push(id); return `<@${id}>`; }
  noId.push(n);
  return "";
});
if (noId.length) die(`no Discord ID in config for: ${noId.join(", ")}. Not posting.`);

const lines = [
  `We're in **${stage}**. Still waiting on these coaches to ready up:`,
  tags.join(" "),
  "Open the dynasty and mark yourself Ready to Advance when you're set.",
];
if (ready.length) lines.push(`Ready: ${ready.map((n) => roster[n.toLowerCase()]).join(", ")}`);

const payload = {
  content: lines.join("\n"),
  allowed_mentions: { parse: [], users: [...new Set(users)], roles: [] },
};

console.log(`--- ${L.label} ---`);
console.log(payload.content);
console.log(`--- pings allowed: ${payload.allowed_mentions.users.length} user(s); no @everyone, no roles ---`);
if (dry) {
  console.log("(dry run: nothing posted)");
  process.exit(0);
}

const url = webhookUrl(cfg, L.slug);
if (!url) die(`no Discord webhook configured for "${L.slug}".`);
post(url, payload)
  .then(() => console.log("posted"))
  .catch((e) => die(e.message));
