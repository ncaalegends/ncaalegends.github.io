/* ============================================================
   TOP 25 — the in-game AP poll, transcribed from screenshots
   ------------------------------------------------------------
   The 1-Star Dynasty's copy of the EA College Football 27 Top 25,
   one entry per week. It is NOT the site's own computed Power
   Rankings (that's the Rankings tab, built from head-to-head
   results). This poll is mostly CPU teams with a handful of coaches
   mixed in, and it drives two things on the site:

     1. The Top 25 tab.
     2. The "#N" rank badges on schedules. A game played in week N
        shows each team's rank from THAT week's poll, so a schedule
        always shows what a team was ranked WHEN the game was played,
        even after they rise or fall later.

   Because of (2), each week's poll is frozen history: once a week is
   entered, never edit it to reflect a later poll — add a new week
   instead.

   EMPTY ON PURPOSE
   Nobody has transcribed a 1-star poll yet. This file exists so that
   the day someone starts, the only thing needed is a screenshot —
   the data file, the tab, and the tooling are already in place and
   the first upload just works.

   An empty array is a supported state everywhere, not a half-finished
   one. script.js drops the Top 25 tab entirely when there are no
   polls, so the site shows no trace of this until the first week
   lands; schedules render every game unranked, which is correct;
   and the advance is not gated on the poll (see below), so nothing
   about the league's weekly routine changes while this sits empty.

   NO ADVANCE GATE HERE (this is the difference from main)
   The main dynasty REFUSES to advance to week N until week N's poll is
   in its file, so the poll and the new week always surface together.
   1-star is deliberately not gated: advancing never waits on a
   screenshot. Uploads are welcome any time, including weeks after the
   fact, and they appear as soon as they're pushed. See
   top25GateError() in tools/lib/league.js for where that lives.

   HOW TO START
   Screenshot the in-game Top 25 for the week, then run:

     node tools/top25.js --league 1star --week N --file poll.txt

   The --league flag is the part that's easy to forget; without it the
   script writes to main. The first upload will report every team as
   unrecognised if the poll is full of schools nobody in this league
   has played — that's what --allow-new is for. See tools/README.md.

   Start at whatever week you're on. There's no obligation to backfill
   week 1: a missing week renders as unranked, not as an error.

   Team names should match the roster / schedule spelling (the site
   resolves them the same way, through SCHEDULE_TEAM_ALIASES, so "Cal"
   vs "California" etc. still line up). `record` is whatever the poll
   shows next to the team.

     { rank, team, record }
       rank    1 = best, 1..25
       team    must resolve to a roster or schedule team name
       record  the W-L string shown in the poll (e.g. "1-0")
   ============================================================ */
const TOP25 = [
];
