/* ============================================================
   SCHEDULE DATA — not yet transcribed for this league.
   ------------------------------------------------------------
   TEAM_SCHEDULES is intentionally empty. The site detects this and
   shows a "schedule not posted yet" state on the Schedule tab and
   the Home page instead of rendering blank panels.

   To fill it in, follow the same shape the main dynasty uses (see
   /main/schedule-data.js for a worked example):

     {
       team: "Wisconsin",
       conference: "B1G",
       weeks: [
         { week: 0, note: "BYE" },
         { week: 1, opponent: "Iowa State", location: "vs",
           stadium: "Camp Randall Stadium" },
         ...
       ],
     }

   location is "vs" (home) or "at" (away). Weeks with no fixed
   opponent take { week, note } instead — BYE, Army-Navy Week,
   conference championships.

   Once a game is final, add teamScore / opponentScore from THAT
   team's perspective, on BOTH teams' entries for a head-to-head
   game so it shows correctly on both coaches' schedules.
   ============================================================ */
const TEAM_SCHEDULES = [];

/* Schedule-team-name -> roster-team-name, for cases where the
   in-game team name doesn't match the sign-up sheet verbatim.
   Empty while there's no schedule to reconcile. */
const SCHEDULE_TEAM_ALIASES = {};
