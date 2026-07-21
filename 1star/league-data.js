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

   This league hasn't kicked off. "PRESEASON" is a valid value for
   currentWeek and renders a sign-up-phase home tab rather than an
   empty week view.

   nextAdvance is blank: run by a different commissioner, not on
   the automated advance tooling. Blank hides the countdown line
   rather than showing a stale deadline.
   ------------------------------------------------------------ */
const SEASON = {
  currentWeek: "PRESEASON",
  statusLine: "PRESEASON — TEAMS BUILT, SCHEDULE PENDING",
  nextAdvance: "",
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

  /* No ESPN logos in this league — every team is fictional. Left
     true because the flag only gates the ESPN CDN path; local
     `logo` files below are handled separately and always render. */
  useEspnLogos: true,
};

/* ------------------------------------------------------------
   COACHES — from the 1-star sign-up sheet, snapshot 2026-07-21.

   Only the 8 coaches with a built team are listed. The sheet's
   "SIM Sign Up" section is still TBD and would render as empty
   cards, so it's deliberately excluded until it firms up.

   LOGOS
     These are Team Builder originals, so there's no ESPN id to
     hotlink. Each entry carries `logo`, a path relative to this
     folder, pointing at an optimised PNG in 1star/logos/.
     script.js prefers `logo` over `espnId` when both exist, and
     falls back to the monogram chip if the file 404s.

     Source art was 9.6 MB across 8 files; these are resampled to
     400px max edge (0.74 MB total). Originals are NOT in the repo
     — keep them somewhere safe if you want to re-derive.

   COLORS were sampled from each logo by eye, not by histogram —
   an automated pass picked the White Walker's sword and the moose
   outline. New Glarus is pure black-and-white artwork, so its bone
   accent is invented; change it freely.

   `replacing` records which stock team the build replaced. Not
   rendered anywhere — kept because it's easy to lose track of.
   ------------------------------------------------------------ */
const COACHES = [
  { name: "BluBus",     team: "Dillon Panthers",             conference: "Sun Belt", color: "#5990E3", twitch: "https://www.twitch.tv/blubusbandit", logo: "logos/dillon-panthers.png",            location: "Dillon, TX",      replacing: "Georgia Southern" },
  { name: "Alex",       team: "North Shore Fighting Moose",  conference: "MAC",      color: "#4FAE6E", twitch: "https://www.twitch.tv/alexgators1", logo: "logos/north-shore-fighting-moose.png", location: "Duluth, MN",      replacing: "Akron" },
  { name: "Dway",       team: "Minneapolis Monsters",        conference: "MAC",      color: "#C3E63F", twitch: "https://www.twitch.tv/dwayinspired", logo: "logos/minneapolis-monsters.png",       location: "Minneapolis, MN", replacing: "Kent State" },
  { name: "Salzy",      team: "New Glarus Spotted Cows",     conference: "MAC",      color: "#E6E1D3", twitch: "", logo: "logos/new-glarus-spotted-cows.png",    location: "New Glarus, WI",  replacing: "Ball State" },
  { name: "Bl00dVayN3", team: "Westeros White Walkers",      conference: "CUSA",     color: "#A8D5E8", twitch: "https://www.twitch.tv/bl00dvayn3", logo: "logos/westeros-white-walkers.png",     location: "Boise, ID",       replacing: "Western Kentucky" },
  { name: "Woody",      team: "Baldwin Wallace",             conference: "Sun Belt", color: "#F3CD49", twitch: "", logo: "logos/baldwin-wallace.png",            location: "Berea, OH",       replacing: "South Alabama" },
  { name: "Brian52682", team: "Patriot Tech Minutemen",      conference: "CUSA",     color: "#DE4B5C", twitch: "https://www.twitch.tv/brian52682", logo: "logos/patriot-tech-minutemen.png",     location: "",                replacing: "Liberty" },
  { name: "Bayside",    team: "Wawa University Hoagiemakers", conference: "CUSA",    color: "#EE4B3C", twitch: "", logo: "logos/wawa-university.png",            location: "Media, PA",       replacing: "FIU" },
];

/* ------------------------------------------------------------
   POWER RANKINGS

   Empty until the season starts and enough H2H (user vs. user)
   games are on the board. Shape:
     { week: 3, rank: 1, team: "Dillon Panthers", record: "3-0", score: 97.5 }
   ------------------------------------------------------------ */
const RANKINGS = [];
