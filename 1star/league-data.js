/* ============================================================
   1-STAR DYNASTY — roster, season state, and power rankings
   ------------------------------------------------------------
   Same shape as every other league's league-data.js, with one
   addition: teams here are Team Builder originals, so they carry a
   local `logo` path instead of an ESPN CDN id. See the LOGOS note
   further down.
   ============================================================ */

/* ------------------------------------------------------------
   SEASON STATE — manually advanced, never date-driven.

   Advanced off "PRESEASON" on 2026-07-22, when all eight team
   schedules were transcribed into schedule-data.js. Week 0 games
   haven't been played yet — only Patriot Tech, Wawa and Westeros
   have a week 0 opponent at all; the other five are on a bye.

   nextAdvance is the only real-world date on the site — a
   scheduling deadline for coaches, not part of season chronology.
   Plain text, so write it however reads best; no time is given
   for this league. Set it to "" to hide the badge entirely.
   ------------------------------------------------------------ */
const SEASON = {
  // In-game year for this season's data. See the long note in
  // main/league-data.js — it governs the seasons/<year>/ archive.
  year: 2026,

  currentWeek: 8,
  statusLine: "WEEK 8",
  nextAdvance: "Monday, August 10th",
};

/* ------------------------------------------------------------
   LEAGUE IDENTITY
   ------------------------------------------------------------ */
const LEAGUE_INFO = {
  name: "NCAA Legends",
  tag: "1-Star Dynasty",

  links: {
    discord: "",
    rules: "",
  },

  /* Every COACH team here is fictional and carries a local `logo`,
     which teamLogoSrc() checks before the CDN. But the schedules
     are full of real CPU opponents, so this must stay true or
     those marks all collapse to monograms. */
  useEspnLogos: true,
};

/* ------------------------------------------------------------
   COACHES — from the 1-star sign-up sheet, snapshot 2026-07-21,
   plus Scuba (Appalachian State), added 2026-07-27.

   The sheet's "SIM Sign Up" section is still TBD and would render
   as empty cards, so it's deliberately excluded until it firms up.

   LOGOS
     The eight original teams are Team Builder builds, so there's
     no ESPN id to hotlink. Each carries `logo`, a path relative to
     this folder, pointing at an optimised PNG in 1star/logos/.
     script.js prefers `logo` over `espnId` when both exist, and
     falls back to the monogram chip if the file 404s. Scuba's
     Appalachian State is a stock team and uses `espnId` instead —
     which works because useEspnLogos is true above.

     Source art was 9.6 MB across 8 files; these are resampled to
     400px max edge (0.74 MB total). Originals are NOT in the repo
     — keep them somewhere safe if you want to re-derive.

   COLORS were sampled from each logo by eye, not by histogram —
   an automated pass picked the White Walker's sword and the moose
   outline.

     New Glarus is pure black-and-white artwork, so there's no
     color in the logo to pull from. It's taken instead from the
     green banner on the team's in-game Team Schedule screen,
     which reads about #196441 mid-gradient. That's only 2.4:1 on
     --navy-panel, and --team is used as a text color in the
     league picker, not just as a border — so the hue is kept and
     the value lifted to #3E9B6B (4.9:1). Same green, legible on
     the dark theme.

     Heads up: this sits close to North Shore's #4FAE6E and both
     are MAC teams, so they land near each other on the roster
     grid. Known and accepted — the logos carry the identity.

   `replacing` records which stock team the build replaced. Not
   rendered anywhere — kept because it's easy to lose track of.
   ------------------------------------------------------------ */
const COACHES = [
  { name: "BluBus",     team: "Dillon",                  conference: "Sun Belt", color: "#5990E3", twitch: "https://www.twitch.tv/blubusbandit", logo: "logos/dillon-panthers.png",            location: "Dillon, TX",      replacing: "Georgia Southern" },
  { name: "Alex",       team: "North Shore",             conference: "MAC",      color: "#4FAE6E", twitch: "https://www.twitch.tv/alexgators1", logo: "logos/north-shore-fighting-moose.png", location: "Duluth, MN",      replacing: "Akron" },
  { name: "Dway",       team: "Minneapolis",             conference: "MAC",      color: "#C3E63F", twitch: "https://www.twitch.tv/dwayinspired", logo: "logos/minneapolis-monsters.png",       location: "Minneapolis, MN", replacing: "Kent State" },
  { name: "Salzy",      team: "New Glarus",              conference: "MAC",      color: "#3E9B6B", twitch: "https://www.twitch.tv/salzy117", logo: "logos/new-glarus-spotted-cows.png",    location: "New Glarus, WI",  replacing: "Ball State" },
  { name: "Bl00dVayN3", team: "Westeros",                conference: "CUSA",     color: "#A8D5E8", twitch: "https://www.twitch.tv/bl00dvayn3", logo: "logos/westeros-white-walkers.png",     location: "Boise, ID",       replacing: "Western Kentucky" },
  { name: "Woody",      team: "Baldwin Wallace",         conference: "Sun Belt", color: "#F3CD49", twitch: "https://www.twitch.tv/mldwoody", logo: "logos/baldwin-wallace.png",            location: "Berea, OH",       replacing: "South Alabama" },
  { name: "Brian52682", team: "Patriot Tech",            conference: "CUSA",     color: "#DE4B5C", twitch: "https://www.twitch.tv/brian52682", logo: "logos/patriot-tech-minutemen.png",     location: "",                replacing: "Liberty" },
  { name: "Bayside",    team: "Wawa University",         conference: "CUSA",    color: "#EE4B3C", twitch: "https://www.twitch.tv/baysideblitz", logo: "logos/wawa-university.png",            location: "Media, PA",       replacing: "FIU" },

  /* Joined 2026-07-27, mid-season. The only stock team on this
     roster — Scuba took Appalachian State as-is rather than
     building an original, so there's no `logo` and no `replacing`;
     the ESPN id carries the mark like it does in the other two
     leagues. Color is the official App State gold, which reads
     cleanly on --navy-panel without lifting. */
  { name: "Scuba",      team: "Appalachian State",       conference: "Sun Belt", color: "#FFCC00", twitch: "https://www.twitch.tv/scuba2122", espnId: "2026",                               location: "Boone, NC" },
];

/* ------------------------------------------------------------
   POWER RANKINGS

   Empty until the season starts and enough H2H (user vs. user)
   games are on the board. Shape:
     { week: 3, rank: 1, team: "Dillon", record: "3-0", score: 97.5 }
   ------------------------------------------------------------ */
const RANKINGS = [];
