/* ============================================================
   PEOPLE — cross-league identity resolution
   ------------------------------------------------------------
   31 distinct people play across the three dynasties, and 13 of
   them play in more than one. This file answers exactly one
   question: "are these two roster entries the same human?"

   Counted 2026-07-21 from the three league-data.js COACHES
   arrays: 47 roster entries total (24 main / 15 3-star / 8 1-star)
   = 3 people in all three leagues, 10 in two, 18 in one. Said 32
   before this; the overlap count was right, so it was one
   single-league coach who left without the comment being updated.

   WHAT'S DELIBERATELY NOT HERE
   ----------------------------
   No rosters, no team assignments, no league membership lists.
   Each league's own league-data.js is the single source of truth
   for who plays what. Copying membership here would create two
   places to update and they would drift — which is the exact
   failure mode this file exists to prevent.

   No Discord IDs either. This file is served publicly by GitHub
   Pages. Discord IDs live only in tools/config.json, which is
   gitignored.

   HOW MATCHING WORKS
   ------------------
   Coach names are matched case-insensitively after trimming. That
   alone resolves every real-world collision in the current data:

     ronricofsu   (main)   ==  RonRicoFSU  (3-star)
     Texan_hog    (main)   ==  Texan_hog   (3-star)

   Display name always comes from the league you're looking at, so
   each league renders its own spelling. This file never overrides
   how a name appears on screen.

   KNOWN NON-MATCHES
   -----------------
   Deliberately kept apart, confirmed 2026-07-21:

     Woogity (main)  is NOT  Woody (1-star)

   They normalise differently, so no code is needed to keep them
   separate — this note exists so nobody "helpfully" merges them
   later. If that ever turns out to be wrong, add an ALIASES entry
   rather than renaming either roster.
   ============================================================ */

/* ------------------------------------------------------------
   THE LEAGUES
   ------------------------------------------------------------
   One list, used by three different things: the landing page cards,
   the header league switcher, and the accent lookup. Adding a fourth
   dynasty means adding a folder, a line here, and a colour block in
   style.css — nothing else.

   `dir` is both the folder name and the URL segment.
   ------------------------------------------------------------ */
const SITE_LEAGUES = [
  { dir: "main", label: "Main Dynasty", accent: "#f2c14e" },
  { dir: "3star", label: "3-Star Dynasty", accent: "#4ec3f2" },
  { dir: "1star", label: "1-Star Dynasty", accent: "#f2894e" },
];

/* ------------------------------------------------------------
   LIVE STATUS
   ------------------------------------------------------------
   The Cloudflare Worker that answers "who is streaming right now".
   Source and setup steps are in worker/ — the Twitch client secret
   lives in the Worker's environment, never here, because this file
   is served publicly.

   Leave `endpoint` empty to switch the feature off: script.js skips
   the fetch entirely and roster cards render exactly as they did
   before live status existed.

   refreshSeconds only controls how often an already-open tab
   re-checks. The Worker caches for 60s regardless, so setting this
   lower than that just returns the same cached answer.
   ------------------------------------------------------------ */
const LIVE_STATUS = {
  endpoint: "https://ncaa-legends-live.westfall-105.workers.dev",
  refreshSeconds: 120,
};

/* Variant spelling -> canonical key, for cases normalisation alone
   can't resolve (a coach who changed handles, say). Both sides are
   compared normalised, so casing here doesn't matter.

   Empty today: every current cross-league name matches on casing
   alone. Add entries only when two genuinely different strings
   refer to one person. */
const PEOPLE_ALIASES = {
  // "OldHandle": "NewHandle",
};

/* The join key for a coach name. Lowercase, trimmed, alias-mapped.
   Used anywhere two leagues' rosters need to be compared. */
function personKey(name) {
  const raw = String(name ?? "").trim();
  const mapped = Object.keys(PEOPLE_ALIASES).find(
    (k) => k.toLowerCase() === raw.toLowerCase()
  );
  return (mapped ? PEOPLE_ALIASES[mapped] : raw).toLowerCase();
}

/* Do two roster entries refer to the same person? */
function samePerson(a, b) {
  return personKey(a) === personKey(b) && personKey(a) !== "";
}
