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
  rounds: [],
};
