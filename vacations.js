/* ============================================================
   VACATIONS — who is away, across all three dynasties
   ------------------------------------------------------------
   The central vacation tracker. Replaces the Google Form and its
   response sheet, which collected the right information into a
   place nothing else could read: the nudge runs from a checkout of
   this repo, the site is static files in this repo, and the
   answers were sitting in Drive.

   WHAT A COMMISSIONER USES THIS FOR
   Awarding a force win, and deciding whether a missed deadline is
   a no-show or a man on a beach. That's why the daily nudge reads
   this file — the decision gets made in the same message that
   lists the unplayed games, rather than in a browser tab somebody
   has to remember to open.

   ONE ENTRY PER PERSON, NO LEAGUE ON IT
   A vacation is a fact about a human, not about a dynasty. Salzy
   plays in the 1-star and the 3-star; when he's away he's away
   from both, and there is nothing to submit twice and nothing to
   fall out of step. Which leagues an entry appears in is DERIVED
   at read time by matching the name against each league's own
   COACHES array — see activeForRoster() in /vacation-core.js. Add
   a league, or move a coach between leagues, and this file needs
   no edit at all.

   Name matching is case-insensitive after trimming, the same rule
   people.js uses to know that "ronricofsu" in main and
   "RonRicoFSU" in 3-star are the same person.

   HOW ENTRIES GET HERE
   Coaches submit them at /vacation/ on the site. That posts to the
   Worker (worker/admin-api.js), which fires the same
   repository_dispatch an admin submission does, and tools/apply.js
   rewrites the array below and commits it. Hand-editing works too
   and is sometimes quicker — the format is exactly what you see.

   FIELDS
     coach   must match a name in some league's COACHES array.
             Submissions are checked against the union of all three
             rosters and rejected if they don't; that check is the
             whole reason this isn't a text box any more.
     start   "YYYY-MM-DD", the first day away.
     end     "YYYY-MM-DD", the last day away. INCLUSIVE — "the
             21st to the 24th" means the 24th is still a vacation
             day, because that's what a person means when they say
             it. They're compared as plain strings and never parsed
             into a moment in time, which is why there is no
             timezone bug waiting here.
     added   when it was submitted. Bookkeeping only; nothing reads
             it except the page, which uses it for nothing yet.

   Sorted by start date, oldest first. Entries more than 180 days
   past their end date are dropped automatically on the next write
   (KEEP_PAST_DAYS in vacation-core.js) — long enough to answer
   "was he away when that game was force-won?" for a full season.

   Seeded 2026-08-22 from the Vacation Tracker response sheet:
   the five entries that hadn't already ended. The four that had
   (EYEDONTPULL19, Texan_hog, Temptiger, and Alex's July entry)
   were left behind on purpose — a tracker for decisions being made
   now, not a diary.
   ============================================================ */

const VACATIONS = [
  { coach: "Alex", start: "2026-08-20", end: "2026-08-26", added: "2026-07-15" },
  { coach: "BlueMiniMeaniee", start: "2026-08-20", end: "2026-08-23", added: "2026-07-18" },
  { coach: "Salzy", start: "2026-08-21", end: "2026-08-24", added: "2026-08-13" },
  { coach: "Turt17", start: "2026-08-21", end: "2026-08-23", added: "2026-08-21" },
  { coach: "Miles", start: "2026-08-22", end: "2026-08-23", added: "2026-08-22" },
  { coach: "DiabeticSnail22", start: "2026-09-04", end: "2026-09-07", added: "2026-09-01" },
  { coach: "Pointdexter420", start: "2026-09-04", end: "2026-09-07", added: "2026-09-01" },
  { coach: "Salzy", start: "2026-09-04", end: "2026-09-07", added: "2026-08-13" },
  { coach: "Salzy", start: "2026-09-25", end: "2026-09-27", added: "2026-08-27" },
];
