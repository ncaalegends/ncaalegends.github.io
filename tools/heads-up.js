#!/usr/bin/env node
/* ============================================================
   HEADS-UP — on advance day, tell people who they play NEXT
   ------------------------------------------------------------
   The morning of an advance, post the upcoming week's head-to-head
   matchups and tag the coaches in them. The whole point is lead
   time: a coach who finds out at 6 PM that they're playing someone
   has to start the scheduling conversation from zero, at the worst
   possible moment. Told in the morning, they can have a time agreed
   before the week even opens.

   This is meant to run unattended on a schedule — it shares the
   morning cron with the nudge, in .github/workflows/morning-posts.yml.
   Safe to run by hand too.

     node tools/heads-up.js --league main --dry-run
     node tools/heads-up.js --league 3star

   FLAGS
     --league SLUG   main | 3star | 1star. Defaults to main.
     --dry-run       print the message, post nothing.
     --force         post even when the advance isn't today, or has
                     already passed. For testing.
     --now ISO       pretend it is some other moment. Testing only.

   WHEN IT POSTS, AND WHEN IT STAYS QUIET
   Exactly one condition: SEASON.nextAdvanceAt names a deadline that
   falls TODAY in Eastern and hasn't passed yet. Everything else is
   silence, including:

     no nextAdvanceAt        nothing to compare against
     deadline another day    not today's problem
     deadline already past   the advance may have happened; the
                             matchups below would be the ones people
                             are already playing, which is worse
                             than saying nothing
     preseason               no current week, so no next week
     next week past 15       bowl weeks come from the CFP bracket in
                             postseason-data.js, not from a schedule
                             this can read
     no H2H games next week  an all-CPU week needs no coordinating

   WHY THERE'S NO "DID I ALREADY POST TODAY" STATE
   Because the schedule is once a day and the condition is a
   calendar date. A second run on the same day would double-post, so
   don't add a second cron — add nothing, and this stays stateless.
   The alternative (a timestamp committed back to the repo) means
   this job needs write access to say something it can already work
   out from data it already has.

   THE DEADLINE IS A DATE, NOT A SENTENCE
   That's what makes any of this possible, and it's the reason
   SEASON now carries nextAdvanceAt alongside the display string.
   See /deadline.js.

   Reads the same data files, the same roster matching, the same
   webhook resolution and the same mention allowlist as advance.js
   and nudge.js. Writes nothing, commits nothing, touches the
   network only for the single webhook POST.
   ============================================================ */

const {
  parseArgs,
  die,
  resolveLeague,
  loadData,
  buildWeek,
  weekLabel,
  loadConfig,
} = require("./lib/league");

const Deadline = require("../deadline");

/* One implementation of "name -> ping", shared with the advance
   announcement and the nudge. See the note beside its export in
   advance.js. */
const { makeMentioner, post, webhookUrl } = require("./advance");

const CONTENT_LIMIT = 2000;

/* The last week that has schedule rows. Past this the season is the
   CFP bracket, which lives in postseason-data.js and is seeded from
   results rather than laid out in advance — there is no "next week's
   matchups" to preview, so this stops. */
const LAST_SCHEDULED_WEEK = 15;

/* ------------------------------------------------------------
   MESSAGE
   ------------------------------------------------------------
   Deliberately shorter than the advance announcement and the nudge.
   Those two are the week's record; this is a tap on the shoulder,
   and it competes with them for the same channel on the same day.
   So: one line of context, the matchups, done.

   Mentions live in `content` for the reason spelled out at length in
   advance.js — a mention inside an embed renders blue and notifies
   nobody, which would make this decorative.

   NO ROLE PING. Same reasoning as the nudge: this is aimed at the
   people with a game to arrange, not the league. The advance
   announcement a few hours later is what tells everyone the week
   moved, and it does carry the role. Pinging the whole server twice
   in one day is how a bot gets muted.
   ------------------------------------------------------------ */
function buildHeadsUp(data, nextWeek, wk, deadlineText, isToday, cfg, siteUrl) {
  const M = makeMentioner(cfg);
  const label = weekLabel(nextWeek);

  /* "Later today" is only true on advance day, which is the only day
     this posts on its own. A forced run (testing, or a manual
     workflow dispatch with force ticked) can reach here on any day,
     and saying "later today" then is worse than useless — it tells
     24 people the advance is hours away when it's days away. So the
     forced case states the actual deadline instead. */
  const when = isToday
    ? `later today${deadlineText ? ` — ${deadlineText}` : ""}`
    : deadlineText || "soon";

  const head = [
    `**Advance is scheduled for ${when}.**`,
    `Here's the H2Hs in ${label}, so you can start scheduling now.`,
  ].join("\n");

  const body = wk.league
    .map(
      (m) =>
        `• ${M.forCoach(m.awayCoach) || m.away} *(${m.away})*` +
        `  at  ${M.forCoach(m.homeCoach) || m.home} *(${m.home})*`
    )
    .join("\n");

  let content = head + `\n\n__**${label} H2H (${wk.league.length})**__\n${body}`;

  /* A full week of H2H games fits with room to spare, so this should
     never fire. Trimming rather than moving the tail to an embed
     keeps the failure honest — a coach silently left off the list is
     the one outcome that defeats the purpose. */
  let trimmed = false;
  if (content.length > CONTENT_LIMIT) {
    content =
      content.slice(0, CONTENT_LIMIT - 40).replace(/\n[^\n]*$/, "") + "\n_…list truncated_";
    trimmed = true;
  }

  return {
    payload: {
      username: `${data.LEAGUE_INFO.name || "League"} Commissioner`,
      content,
      allowed_mentions: M.allowed(),
      embeds: [
        {
          title: `${label.toUpperCase()} — COMING UP`,
          url: siteUrl,
          color: 0xc9a227,
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
   MAIN
   ------------------------------------------------------------ */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.flags.has("dry-run") || args.flags.has("no-post");
  const force = args.flags.has("force");

  /* --now exists so the advance-day condition can be tested without
     waiting for an advance day. Anything unparseable is a typo worth
     stopping for, not a reason to silently use the real clock. */
  let now = new Date();
  if (args.now !== undefined) {
    now = new Date(args.now);
    if (isNaN(now.getTime())) die(`--now "${args.now}" isn't a date`);
  }

  const L = resolveLeague(args.league || "main");
  const data = loadData(L.paths);
  const week = data.SEASON.currentWeek;

  console.log(`\n  ${L.label}`);

  /* ---- is the advance today? ---- */
  const at = data.SEASON.nextAdvanceAt ?? "";
  const deadline = Deadline.parseAt(at);

  if (!deadline) {
    console.log(
      at
        ? `  nextAdvanceAt is ${JSON.stringify(at)}, which isn't a date this can read — posting nothing.`
        : "  No nextAdvanceAt set, so there's no advance date to check. Posting nothing."
    );
    return;
  }

  const today = Deadline.isSameZoneDay(deadline, now);
  const ahead = deadline.getTime() > now.getTime();
  const advanceDay = today && ahead;
  const hours = (deadline.getTime() - now.getTime()) / 3600000;

  console.log(
    `  Advance deadline ${Deadline.formatDeadline(at)} — ` +
      `${today ? "today" : `not today (${Deadline.dayKey(deadline)})`}, ` +
      `${ahead ? `${hours.toFixed(1)}h away` : `${Math.abs(hours).toFixed(1)}h ago`}`
  );

  if (!advanceDay) {
    if (!force) {
      console.log("  Not advance day (or the deadline has passed). Posting nothing.\n");
      return;
    }
    console.log("  --force: posting anyway.");
  }

  /* ---- what's next week? ---- */
  if (typeof week !== "number") {
    console.log(`  currentWeek is "${week}" — no next week to preview. Posting nothing.\n`);
    return;
  }

  const nextWeek = week + 1;
  if (nextWeek > LAST_SCHEDULED_WEEK) {
    console.log(
      `  ${weekLabel(nextWeek)} has no schedule rows — the bracket drives the postseason. ` +
        "Posting nothing.\n"
    );
    return;
  }

  const wk = buildWeek(data, nextWeek);
  console.log(
    `  ${weekLabel(nextWeek)} — ${wk.league.length} H2H, ${wk.cpu.length} CPU, ${wk.notes.length} bye/off`
  );
  if (wk.missing.length) {
    console.log(`  WARNING: no week ${nextWeek} entry for: ${wk.missing.join(", ")}`);
  }

  /* An all-CPU week needs no coordinating between two people, which
     is the only thing this message is for. */
  if (!wk.league.length) {
    console.log("  No H2H games next week — nothing to arrange. Posting nothing.\n");
    return;
  }

  const cfg = loadConfig();
  /* On advance day, only quote the deadline when it names a TIME —
     "later today — Wednesday, August 12th" says the same thing twice
     and reads like a mistake, since "today" already established the
     day. Off advance day (only reachable with --force) the day is
     exactly what needs saying, so it's always included. */
  const deadlineText =
    advanceDay && Deadline.isDateOnly(at) ? "" : data.SEASON.nextAdvance || "";
  const built = buildHeadsUp(data, nextWeek, wk, deadlineText, advanceDay, cfg, L.siteUrl);

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

module.exports = { buildHeadsUp, LAST_SCHEDULED_WEEK };
