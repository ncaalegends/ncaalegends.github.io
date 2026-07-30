#!/usr/bin/env node
/* ============================================================
   NUDGE — every morning, ping whoever still hasn't played
   ------------------------------------------------------------
   Reads the league's current week, finds every game with no score
   recorded, and posts one Discord message tagging exactly the
   coaches in those games. Nobody who has already played gets
   pinged, and if the whole week is in it posts nothing at all.

   This is meant to run unattended on a schedule — see
   .github/workflows/daily-nudge.yml. It is safe to run by hand too.

     node tools/nudge.js --league main --dry-run
     node tools/nudge.js --league 3star

   FLAGS
     --league SLUG     main | 3star | 1star. Defaults to main.
     --dry-run         print the message, post nothing.
     --skip-hours N    stay quiet if the advance was less than N hours
                       ago. Default 12. Pass 0 to disable.
     --force           post even inside the skip window.

   WHY IT NEVER DOUBLE-PINGS THE ADVANCE
   The advance announcement already tags everyone with a game, so a
   nudge a few hours later is noise. Rather than storing a timestamp
   somewhere that could drift out of sync, this asks git when the
   current `currentWeek:` value was committed — a pickaxe search
   scoped to that league's league-data.js, which nothing but an
   advance rewrites. Inside --skip-hours of that commit, it exits
   quietly. So the first nudge of a week lands the morning after the
   advance, and one per morning after that until the next advance
   resets the clock.

   If git history isn't available (a shallow clone, or a tarball),
   the check can't answer and deliberately fails OPEN — it posts.
   A missed nudge is invisible; a duplicate is merely mildly annoying.

   Reads the same data files, uses the same roster matching, the same
   webhook resolution and the same mention allowlist as advance.js.
   Writes nothing, commits nothing, and touches the network only for
   the single webhook POST.
   ============================================================ */

const { execFileSync } = require("child_process");
const path = require("path");

const {
  parseArgs,
  die,
  resolveLeague,
  loadData,
  buildWeek,
  weekLabel,
  loadConfig,
} = require("./lib/league");

/* One implementation of "name -> ping", shared with the advance
   announcement. See the note beside its export in advance.js. */
const { makeMentioner, post, webhookUrl } = require("./advance");

const CONTENT_LIMIT = 2000;

/* ------------------------------------------------------------
   WHO STILL OWES A GAME
   ------------------------------------------------------------
   buildWeek() already sorts the week into H2H, CPU and byes, and
   marks anything with a recorded score as `scored`. Unplayed is the
   complement of that — no separate notion of "final" is invented
   here, so the site, the score prompts and this message can never
   disagree about whether a game has been played.

   Byes are skipped entirely: there is nothing to play.
   ------------------------------------------------------------ */
function outstanding(wk) {
  return {
    h2h: wk.league.filter((m) => !m.scored),
    cpu: wk.cpu.filter((g) => !g.scored),
  };
}

/* ------------------------------------------------------------
   MESSAGE
   ------------------------------------------------------------
   Same shape as the advance announcement on purpose — the channel
   reads it in the same glance — and for the same reason it keeps
   every mention in `content` rather than an embed. A mention inside
   an embed renders blue and notifies nobody, which would make this
   entire tool decorative.
   ------------------------------------------------------------ */
function buildNudge(data, week, out, cfg, siteUrl) {
  const label = weekLabel(week);
  const M = makeMentioner(cfg);
  const nextAdvance = data.SEASON.nextAdvance;
  const total = out.h2h.length + out.cpu.length;

  const head = [
    M.role,
    `**${label} is still active — ${total} game${total === 1 ? "" : "s"} still to play.**`,
    nextAdvance ? `Deadline is **${nextAdvance}**.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const h2hBody = out.h2h
    .map(
      (m) =>
        `• ${M.forCoach(m.awayCoach) || m.away} *(${m.away})*` +
        `  at  ${M.forCoach(m.homeCoach) || m.home} *(${m.home})*`
    )
    .join("\n");

  const cpuBody = out.cpu
    .map(
      (g) =>
        `• ${M.forCoach(g.coach) || g.team} *(${g.team})* ` +
        `${g.location === "at" ? "at" : "vs"} ${g.opponent}`
    )
    .join("\n");

  const section = (title, body) => (body ? `\n\n__**${title}**__\n${body}` : "");

  let content =
    head +
    section(`H2H Still To Play (${out.h2h.length})`, h2hBody) +
    section(`CPU Still To Play (${out.cpu.length})`, cpuBody);

  /* The outstanding list is by definition a subset of the week, and a
     full week fits comfortably, so this ceiling should never be hit.
     Trimming the CPU tail rather than moving it to an embed keeps the
     failure honest: an unpinged coach would defeat the point. */
  let trimmed = false;
  if (content.length > CONTENT_LIMIT) {
    content = content.slice(0, CONTENT_LIMIT - 40).replace(/\n[^\n]*$/, "") + "\n_…list truncated_";
    trimmed = true;
  }

  return {
    payload: {
      username: `${data.LEAGUE_INFO.name || "League"} Commissioner`,
      content,
      allowed_mentions: M.allowed(),
      embeds: [
        {
          title: `${label.toUpperCase()} — STILL TO PLAY`,
          url: siteUrl,
          color: 0xb3261e,
          description: `Full schedule and results at ${siteUrl}`,
          footer: { text: `${data.LEAGUE_INFO.name} · ${data.LEAGUE_INFO.tag || ""}`.trim() },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    missingMentions: [...M.missing],
    trimmed,
  };
}

/* ------------------------------------------------------------
   HOW LONG AGO WAS THE ADVANCE
   ------------------------------------------------------------
   `git log -S"currentWeek: N"` finds the commit that introduced the
   week the league is on right now, scoped to that one file. Returns
   hours since, or null when git can't tell us — see the fail-open
   note in the header.
   ------------------------------------------------------------ */
function hoursSinceAdvance(leagueFile, week) {
  const repoRoot = path.resolve(__dirname, ".."); // tools/ -> repo root
  const git = (argv) =>
    execFileSync("git", argv, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

  /* A shallow clone is the dangerous case, and it does NOT look like a
     failure: with one commit in history the whole file reads as newly
     added, so the pickaxe matches that commit and reports the *clone's*
     tip date instead of the advance's. That is usually a few hours ago,
     which would suppress every nudge forever. So refuse to answer
     rather than answer wrongly — checkout must use fetch-depth: 0. */
  try {
    if (git(["rev-parse", "--is-shallow-repository"]) === "true") return null;
  } catch {
    return null;
  }

  try {
    const stamp = execFileSync(
      "git",
      [
        "log",
        "-1",
        "--format=%ct",
        `-S`,
        `currentWeek: ${week}`,
        "--",
        path.relative(repoRoot, leagueFile).split(path.sep).join("/"),
      ],
      { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
    if (!/^\d+$/.test(stamp)) return null;
    return (Date.now() / 1000 - Number(stamp)) / 3600;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------
   MAIN
   ------------------------------------------------------------ */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.flags.has("dry-run") || args.flags.has("no-post");
  const force = args.flags.has("force");
  const skipHours = args["skip-hours"] === undefined ? 12 : Number(args["skip-hours"]);
  if (!Number.isFinite(skipHours) || skipHours < 0) die("--skip-hours must be a number >= 0");

  const L = resolveLeague(args.league || "main");
  const data = loadData(L.paths);
  const week = data.SEASON.currentWeek;

  /* Preseason has no games to be behind on. */
  if (typeof week !== "number") {
    console.log(`  ${L.label}: currentWeek is "${week}" — nothing to nudge.`);
    return;
  }

  const out = outstanding(buildWeek(data, week));
  const total = out.h2h.length + out.cpu.length;

  console.log(`\n  ${L.label} · ${weekLabel(week)} — ${total} unplayed (${out.h2h.length} H2H, ${out.cpu.length} CPU)`);

  /* Silence is the correct output for a finished week. Posting "all
     games are in" every morning until the advance would train the
     channel to ignore this bot. */
  if (total === 0) {
    console.log("  Every game is in. Posting nothing.\n");
    return;
  }

  if (skipHours > 0 && !force && !dryRun) {
    const age = hoursSinceAdvance(L.paths.league, week);
    if (age !== null && age < skipHours) {
      console.log(
        `  Advance was ${age.toFixed(1)}h ago (< ${skipHours}h) — the advance message already ` +
          `pinged these coaches. Posting nothing.\n`
      );
      return;
    }
    if (age === null) console.log("  Could not date the advance from git history — posting anyway.");
  }

  const cfg = loadConfig();
  const built = buildNudge(data, week, out, cfg, L.siteUrl);

  if (built.missingMentions.length) {
    console.log(
      `  WARNING: no Discord ID for ${built.missingMentions.length} coach(es), ` +
        `they will NOT be pinged:\n    ${built.missingMentions.join(", ")}`
    );
  }
  if (built.trimmed) console.log("  WARNING: message hit 2000 chars and was truncated.");
  console.log(`  message body: ${built.payload.content.length}/${CONTENT_LIMIT} chars`);

  if (dryRun) {
    console.log("\n--- DRY RUN: message that would be posted ---\n");
    console.log(built.payload.content);
    console.log(
      `\n--- pings allowed: ${built.payload.allowed_mentions.users.length} user(s), ` +
        `${built.payload.allowed_mentions.roles.length} role(s) ---`
    );
    console.log("--- nothing posted ---\n");
    return;
  }

  const url = webhookUrl(cfg, L.slug);
  if (!url) {
    die(
      `no Discord webhook configured for "${L.slug}". Put it in tools/config.json ` +
        `under leagues.${L.slug}.webhookUrl, or run with --dry-run.`
    );
  }
  await post(url, built.payload);
  console.log("  posted to Discord\n");
}

if (require.main === module) {
  main().catch((e) => die(e.stack || e.message));
}

module.exports = { outstanding, buildNudge, hoursSinceAdvance };
