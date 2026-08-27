/* ============================================================
   POSTSEASON — conference championships, the CFP, and bowls
   ------------------------------------------------------------
   Everything played after the regular season. Format and rationale
   are documented in full at buildPostseason() in week-core.js and in
   docs/seasons-and-postseason.md; the short version is below.

     const POSTSEASON = {
       rounds: [
         { id: "ccg", label: "Conference Championships", games: [
           { home: "Georgia", away: "Texas", title: "SEC Championship",
             neutral: true, stadium: "Mercedes-Benz Stadium",
             homeScore: 31, awayScore: 24 },
         ]},
         { id: "cfp-r1", label: "CFP First Round",       games: [ ... ] },
         { id: "cfp-qf", label: "CFP Quarterfinal",      games: [ ... ] },
         { id: "cfp-sf", label: "CFP Semifinal",         games: [ ... ] },
         { id: "cfp-nc", label: "National Championship", games: [ ... ] },
         { id: "bowl",   label: "Bowl Games",            games: [ ... ] },
       ],
     };

   ONE ROW PER GAME, unlike the regular season, which stores a game
   twice — once on each team's week list. That redundancy is a
   liability for a handful of one-off neutral-site games: writing a
   game twice is how home/away disagreements and half-entered scores
   get in. One row per game removes the entire class of error.

   Rounds render in array order. There is no `order` field, so
   inserting a round means putting it in the right place.

   Omit both scores for a game that hasn't been played.

   THE FOUR cfp-* IDS ARE LOAD-BEARING. The CFP bracket on the Top 25
   tab advances its slots by looking for a played game between two
   known teams inside `cfp-r1`, `cfp-qf`, `cfp-sf` and `cfp-nc`, in
   that order. Rename one and the bracket quietly stops filling in
   past that round — it won't error, it will just show the rest of
   the field as undecided. The `label` beside each id is free text
   and safe to change.

   Empty is a valid state and the normal one until December.
   ============================================================ */
const POSTSEASON = {
  rounds: [
    /* WEEK 15 CONFERENCE CHAMPIONSHIPS, from the in-game
       Scores/Schedules screen (Fri Dec 11 - Sat Dec 12).

       Three of this league's four title games have at least one
       coached team in them, so they live as ordinary week-15 rows on
       those teams' own schedules in schedule-data.js instead:
         ACC     Pittsburgh at Virginia Tech
         Big Ten Wisconsin at Maryland
         Big 12  BYU at UCF
       The SEC title game is Tennessee-Georgia, and no 3-star coach
       plays either team, so it goes here.

       Neutral site with no confirmed host stadium in the engine;
       home/away follows the in-game listing (left side away). */
    { id: "ccg", label: "Conference Championships", games: [
      { home: "Georgia", away: "Tennessee", title: "SEC Championship",
        neutral: true },
    ]},

    /* CFP FIRST ROUND, off the bowl-week-2 bracket screen. Higher
       seed hosts on campus, so these are true home games — no
       `neutral`, and the bracket shows no bowl name for them.

       ONLY THE TWO ALL-CPU GAMES ARE HERE. The other half of the
       first round involves coached teams and lives on their own
       week-16 schedule rows in schedule-data.js, where the score was
       already entered:
         5 Wisconsin (Salzy)        38, 12 Tennessee  7
         7 South Carolina 27, 10 UCF (EYEDONTPULL19) 17
       The two places never both hold the same game — see the note on
       cfpGameWinner() in script.js. */
    { id: "cfp-r1", label: "CFP First Round", games: [
      { home: "Oklahoma", away: "Missouri",
        homeScore: 33, awayScore: 28 },
      { home: "BYU", away: "Michigan",
        homeScore: 12, awayScore: 41 },
    ]},
  ],
};
