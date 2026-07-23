/* ============================================================
   NCAA LEGENDS — SITE LOGIC
   ------------------------------------------------------------
   You shouldn't need to edit this file. Everything you update
   week to week lives in:
     league-data.js    roster, season state, power rankings
     schedule-data.js  team schedules and scores

   No dates anywhere. Week number is the only clock, because
   in-game seasons drift years from real life. SEASON.currentWeek
   in league-data.js is the single source of truth for "now".
   ============================================================ */

/* ------------------------------------------------------------
   SAFETY
   Everything from the data files is escaped before it reaches
   the DOM, so an ampersand in a stadium name or a stray angle
   bracket in a gamertag can't break the page.
   ------------------------------------------------------------ */
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

// Only real web links become hrefs — blocks javascript: URLs.
function safeUrl(url) {
  const u = String(url ?? "").trim();
  return /^https?:\/\//i.test(u) ? u : "";
}

// Team colors go into a style attribute, so only accept a literal
// hex value — anything else can't break out into arbitrary CSS.
function safeHex(v) {
  const s = String(v ?? "").trim();
  return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(s) ? s : "";
}

/* ------------------------------------------------------------
   DATA HANDLES
   Guarded so a missing/typo'd data file degrades to an empty
   site instead of a blank white page.
   ------------------------------------------------------------ */
const SCHEDULES_RAW = typeof TEAM_SCHEDULES !== "undefined" ? TEAM_SCHEDULES : [];
const ALIASES = typeof SCHEDULE_TEAM_ALIASES !== "undefined" ? SCHEDULE_TEAM_ALIASES : {};
const ROSTER_RAW = typeof COACHES !== "undefined" ? COACHES : [];
const INFO = typeof LEAGUE_INFO !== "undefined" ? LEAGUE_INFO : { name: "League", tag: "" };

/* ------------------------------------------------------------
   INACTIVE COACHES
   A coach marked `active: false` in league-data.js is on the books
   but not currently playing — they've stepped away and may return.
   Filtering them (and their now-stale schedule block) out here, at
   the data handles, is all it takes: everything below reads ROSTER
   and SCHEDULES, so the coach drops off the roster, their team stops
   counting as a league (coach-vs-coach) team and reverts to CPU, and
   they leave the By Team dropdown — with every byte of their data
   still in the file. Delete the flag to bring them back untouched.
   ------------------------------------------------------------ */
const isActiveCoach = (c) => c.active !== false;
const _inactiveNorm = (s) => String(s ?? "").trim().toLowerCase();
const _inactiveKey = (name) => {
  const aliased = ALIASES[name];
  return aliased ? _inactiveNorm(aliased) : _inactiveNorm(name);
};
const INACTIVE_TEAM_KEYS = new Set(
  ROSTER_RAW.filter((c) => !isActiveCoach(c)).flatMap((c) =>
    String(c.team).split("/").map((part) => _inactiveNorm(part))
  )
);
const ROSTER = ROSTER_RAW.filter(isActiveCoach);
const SCHEDULES = SCHEDULES_RAW.filter((t) => !INACTIVE_TEAM_KEYS.has(_inactiveKey(t.team)));

/* ------------------------------------------------------------
   TEAM NAME RESOLUTION
   ------------------------------------------------------------
   Three different names can refer to the same program:
     in-game schedule name   "California"
     roster name             "Cal"
     undecided roster entry  "Wake Forest / Oklahoma State"

   normalize() collapses case and spacing. rosterKeyFor() maps a
   schedule name through the alias table. ROSTER_KEYS holds every
   name the league occupies, with slash entries counted on both
   sides, so an undecided coach still gets league games tagged.
   ------------------------------------------------------------ */
const normalize = (s) => String(s ?? "").trim().toLowerCase();

// Every name a roster team answers to, slash entries split out.
const ROSTER_KEYS = new Set();
ROSTER.forEach((c) => {
  String(c.team)
    .split("/")
    .forEach((part) => {
      const k = normalize(part);
      if (k) ROSTER_KEYS.add(k);
    });
});

// Schedule name -> roster name, via the alias table when needed.
function rosterKeyFor(scheduleName) {
  const direct = normalize(scheduleName);
  const aliased = ALIASES[scheduleName];
  return aliased ? normalize(aliased) : direct;
}

/* Is this opponent another coach in the league?
   Checked against the ROSTER (22 teams), not against who has
   turned in a schedule (15) — otherwise a game against a coach
   who hasn't sent a screenshot yet looks like a CPU game. */
function isLeagueTeam(scheduleName) {
  return ROSTER_KEYS.has(rosterKeyFor(scheduleName));
}

// Teams that have actually submitted a schedule. Used only for
// deduping — a matchup can only appear twice if both sides are in.
const KNOWN_SCHEDULE_TEAMS = new Set(SCHEDULES.map((t) => t.team));

function rosterEntryFor(scheduleName) {
  const key = rosterKeyFor(scheduleName);
  return ROSTER.find((c) =>
    String(c.team).split("/").some((part) => normalize(part) === key)
  );
}

function coachFor(scheduleName) {
  return rosterEntryFor(scheduleName)?.name || "";
}

// Falls back to gold for anyone without a color set.
function colorFor(scheduleName) {
  return safeHex(rosterEntryFor(scheduleName)?.color);
}

/* ------------------------------------------------------------
   TEAM MARKS (logo, with monogram fallback)
   ------------------------------------------------------------
   Logos are hotlinked from ESPN's CDN by numeric team id. Two
   things can go wrong and they fail very differently:

     - a MISSING id, or a dead URL, just 404s. The <img> removes
       itself on error and the monogram underneath shows through,
       so the layout never breaks.
     - a WRONG id silently renders another school's logo. Nothing
       errors, so no code can catch it. Open logo-check.html to
       eyeball all 22 at once — that's the only real check.

   Logos sit on a light plate because a good number of college
   marks are black or navy and would vanish on this background.
   ------------------------------------------------------------ */
const ESPN_LOGO = "https://a.espncdn.com/i/teamlogos/ncaa/500/";

// "Ohio State" -> OS, "UCLA" -> UCL, "Cal" -> CAL
function monogramFor(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

/* Two ways a team can have a logo, checked in this order:

     1. a local `logo` path on the roster entry — used by the 1-star
        league, whose teams are Team Builder originals with no
        real-world counterpart to hotlink
     2. an `espnId` — hotlinked from ESPN's CDN

   Local wins when both are set. Either way a failed load removes
   the <img> and the monogram underneath shows through, so a bad
   path degrades exactly like a bad id. */
function logoSrcFor(entry) {
  const local = String(entry?.logo ?? "").trim();
  if (local) return local;

  const id = String(entry?.espnId ?? "").trim();
  const useEspn = INFO.useEspnLogos !== false;
  return useEspn && /^\d+$/.test(id) ? `${ESPN_LOGO}${id}.png` : "";
}

/* ESPN ids for every team that appears as an opponent in any league.
   A team coached in one league is a CPU opponent in another (e.g.
   North Carolina is a coach's team in 3-star but a CPU opponent in
   main), so this map has to include coach teams too — teamLogoSrc
   checks the roster first, so a coach in their own league still uses
   their roster id and this is only the fallback. Keys match the
   schedule spelling exactly (both "Mississippi St" and "Mississippi
   State" appear, so both are listed). Built from the full ESPN team
   table; eyeball them all in logo-check.html. FCS placeholders
   ("FCS West", etc.) are intentionally absent and fall back to a
   monogram. */
const OPPONENT_ESPN_IDS = {
  "Akron": "2006",
  "Alabama": "333",
  "Appalachian State": "2026",
  "Arizona": "12",
  "Arizona State": "9",
  "Arkansas": "8",
  "Arkansas State": "2032",
  "Auburn": "2",
  "Ball State": "2050",
  "Baylor": "239",
  "Boise State": "68",
  "Boston College": "103",
  "Bowling Green": "189",
  "Buffalo": "2084",
  "BYU": "252",
  "C. Michigan": "2117",
  "California": "25",
  "Central Michigan": "2117",
  "Charlotte": "2429",
  "Cincinnati": "2132",
  "Clemson": "228",
  "Coastal Carolina": "324",
  "Colorado": "38",
  "Delaware": "48",
  "Duke": "150",
  "East Carolina": "151",
  "Eastern Michigan": "2199",
  "FLA Atlantic": "2226",
  "Florida": "57",
  "Florida Atlantic": "2226",
  "Florida State": "52",
  "Fresno State": "278",
  "Ga Southern": "290",
  "Georgia": "61",
  "Georgia State": "2247",
  "Georgia Tech": "59",
  "Hawai'i": "62",
  "Houston": "248",
  "Illinois": "356",
  "Indiana": "84",
  "Iowa": "2294",
  "Iowa State": "66",
  "Jacksonville State": "55",
  "James Madison": "256",
  "Kansas": "2305",
  "Kansas State": "2306",
  "Kennesaw State": "338",
  "Kent State": "2309",
  "Kentucky": "96",
  "Liberty": "2335",
  "Louisiana": "309",
  "Louisiana Tech": "2348",
  "Louisville": "97",
  "LSU": "99",
  "Marshall": "276",
  "Maryland": "120",
  "Miami": "2390",
  "Miami University": "193",
  "Michigan": "130",
  "Michigan State": "127",
  "Middle Tennessee": "2393",
  "Minnesota": "135",
  "Mississippi St": "344",
  "Mississippi State": "344",
  "Missouri": "142",
  "Missouri State": "2623",
  "Navy": "2426",
  "NC State": "152",
  "Nebraska": "158",
  "Nevada": "2440",
  "New Mexico": "167",
  "New Mexico St.": "166",
  "New Mexico State": "166",
  "North Carolina": "153",
  "North Dakota State": "2449",
  "North Texas": "249",
  "Northwestern": "77",
  "Notre Dame": "87",
  "Ohio": "195",
  "Ohio State": "194",
  "Oklahoma": "201",
  "Oklahoma State": "197",
  "Old Dominion": "295",
  "Ole Miss": "145",
  "Oregon": "2483",
  "Penn State": "213",
  "Pittsburgh": "221",
  "Purdue": "2509",
  "Rice": "242",
  "Rutgers": "164",
  "Sacramento State": "16",
  "Sam Houston": "2534",
  "San Diego St.": "21",
  "San Jose State": "23",
  "SMU": "2567",
  "South Carolina": "2579",
  "Southern Mississippi": "2572",
  "Stanford": "24",
  "Syracuse": "183",
  "TCU": "2628",
  "Tennessee": "2633",
  "Texas": "251",
  "Texas A&M": "245",
  "Texas State": "326",
  "Texas Tech": "2641",
  "Toledo": "2649",
  "Troy": "2653",
  "Tulane": "2655",
  "Tulsa": "202",
  "UAB": "5",
  "UCF": "2116",
  "UCLA": "26",
  "UConn": "41",
  "UL Monroe": "2433",
  "UMass": "113",
  "UNLV": "2439",
  "USC": "30",
  "USF": "58",
  "Utah": "254",
  "Utah State": "328",
  "UTEP": "2638",
  "UTSA": "2636",
  "Vanderbilt": "238",
  "Virginia": "258",
  "Virginia Tech": "259",
  "W. Kentucky": "98",
  "W. Michigan": "2711",
  "Wake Forest": "154",
  "Washington": "264",
  "Washington St.": "265",
  "West Virginia": "277",
  "Western Michigan": "2711",
  "Wisconsin": "275",
};

/* Normalized index so a minor spelling drift still resolves. */
const OPPONENT_ID_INDEX = Object.fromEntries(
  Object.entries(OPPONENT_ESPN_IDS).map(([name, id]) => [normalize(name), id])
);

/* Logo src for any team by its schedule name — roster logo/espnId
   first (coach teams), then the CPU opponent map. Empty string when
   nothing matches, so the monogram shows through. */
function teamLogoSrc(scheduleName) {
  const entry = rosterEntryFor(scheduleName);
  const local = String(entry?.logo ?? "").trim();
  if (local) return local;
  if (INFO.useEspnLogos === false) return "";

  const rosterId = String(entry?.espnId ?? "").trim();
  const id = /^\d+$/.test(rosterId)
    ? rosterId
    : OPPONENT_ESPN_IDS[scheduleName] ||
      OPPONENT_ID_INDEX[normalize(scheduleName)] ||
      "";
  return /^\d+$/.test(id) ? `${ESPN_LOGO}${id}.png` : "";
}

function teamMarkHtml(scheduleName, size = "md") {
  const entry = rosterEntryFor(scheduleName);
  const color = safeHex(entry?.color);
  const src = logoSrcFor(entry);

  return `
    <span class="team-mark tm-${esc(size)}"${color ? ` style="--team:${color}"` : ""}>
      <span class="tm-fallback">${esc(monogramFor(entry?.team || scheduleName))}</span>
      ${
        src
          ? `<img class="tm-img" src="${esc(src)}" alt="" loading="lazy"
                  onerror="this.remove()">`
          : ""
      }
    </span>`;
}

/* ------------------------------------------------------------
   DATA SANITY CHECK
   Surfaces the most common editing mistake — a team name that
   doesn't line up between the two data files.
   ------------------------------------------------------------ */
function validateData() {
  const problems = [];

  SCHEDULES.forEach((t) => {
    if (!isLeagueTeam(t.team)) {
      problems.push(
        `schedule-data.js has "${t.team}" but no coach in league-data.js claims it ` +
        `(add an alias to SCHEDULE_TEAM_ALIASES if the in-game name differs)`
      );
    }
  });

  if (problems.length) console.warn("[data check]\n" + problems.join("\n"));
  return problems;
}

/* ------------------------------------------------------------
   WEEK HELPERS
   ------------------------------------------------------------ */
const isPreseason = () => SEASON.currentWeek === "PRESEASON";

/* Two ways to name a week, used in different places.

   weekNum()   always "Week 14" — for the narrow left-hand column of
               the By Team view, where the descriptive name both
               blew out the column width and duplicated the note
               sitting right beside it.
   weekLabel() the descriptive name, for dropdowns, tags and the
               ticker where there's room and the context helps. */
function weekNum(week) {
  return `Week ${week}`;
}

function weekLabel(week) {
  if (week === 14) return "Army-Navy Week";
  if (week === 15) return "CCG Week";
  return `Week ${week}`;
}

function gameRowKey(week, teamA, teamB) {
  return `${week}|${[teamA, teamB].sort().join("~")}`;
}

/* Resolve a week entry's teamScore/opponentScore (that team's own
   perspective) into absolute homeScore/awayScore based on whether
   that team was "vs" (home) or "at" (away) that week. */
function entryScores(entry) {
  const played = entry.teamScore != null && entry.opponentScore != null;
  if (!played) return { played: false };
  return entry.location === "vs"
    ? { played: true, homeScore: entry.teamScore, awayScore: entry.opponentScore }
    : { played: true, homeScore: entry.opponentScore, awayScore: entry.teamScore };
}

/* Shared by Schedule > Weekly and the Home tab preview.
   Returns deduped { rows, offRows } for a given week number. */
function buildWeekGames(week) {
  const rows = [];
  const offRows = [];
  const seen = new Set();

  SCHEDULES.forEach((team) => {
    const entry = team.weeks.find((w) => w.week === week);
    if (!entry) return;

    if (!entry.opponent) {
      offRows.push({ team: team.team, note: entry.note });
      return;
    }

    // Tagging and deduping are separate questions:
    // "is the opponent a league coach" vs "did they submit a schedule".
    const isLeague = isLeagueTeam(entry.opponent);
    const bothTracked = KNOWN_SCHEDULE_TEAMS.has(entry.opponent);

    if (bothTracked) {
      const key = gameRowKey(week, team.team, entry.opponent);
      if (seen.has(key)) return;
      seen.add(key);
    }

    const home = entry.location === "vs" ? team.team : entry.opponent;
    const away = entry.location === "vs" ? entry.opponent : team.team;

    rows.push({
      home,
      away,
      stadium: entry.stadium,
      league: isLeague,
      ...entryScores(entry),
    });
  });

  // League games first, then alphabetical — the matchups people care
  // about shouldn't be buried among CPU games.
  rows.sort((a, b) => (b.league - a.league) || a.home.localeCompare(b.home));
  return { rows, offRows };
}

/* ------------------------------------------------------------
   HOME TAB
   ------------------------------------------------------------ */
function renderLaunchStatus() {
  const el = document.getElementById("launch-status");
  if (el) el.textContent = SEASON.statusLine || "";
}

/* Advance deadline. Hidden entirely when nextAdvance is blank or
   missing, so an empty value degrades quietly instead of showing
   a dangling label. */
function renderNextAdvance() {
  const el = document.getElementById("next-advance");
  if (!el) return;

  const when = String(SEASON.nextAdvance ?? "").trim();
  if (!when) {
    el.hidden = true;
    return;
  }

  el.hidden = false;
  el.innerHTML =
    `<span class="advance-label">NEXT ADVANCE</span>` +
    `<span class="advance-when">${esc(when)}</span>`;
}

function renderJumbotron() {
  const frame = document.getElementById("jumbo-frame");
  const sub = document.getElementById("week-summary");
  if (!frame || !sub) return;

  if (isPreseason()) {
    frame.innerHTML = `
      <span class="jumbo-label">CURRENT STATUS</span>
      <span class="jumbo-preseason">PRESEASON</span>`;
    sub.textContent = "Kickoff starts once Week 0 goes live";
    return;
  }

  const week = SEASON.currentWeek;
  const { rows } = buildWeekGames(week);
  const leagueRows = rows.filter((g) => g.league);
  const played = rows.filter((g) => g.played).length;
  const upcoming = rows.length - played;

  frame.innerHTML = `
    <span class="jumbo-label">CURRENT</span>
    <span class="jumbo-word">WEEK</span>
    <span class="jumbo-number">${esc(week)}</span>`;

  sub.textContent =
    rows.length === 0
      ? "No tracked matchups this week."
      : `${rows.length} tracked game${rows.length === 1 ? "" : "s"} — ` +
        `${leagueRows.length} league, ${played} final, ${upcoming} upcoming`;
}

/* One team's row in the scorebug — logo, team, coach gamertag,
   score, and a winner arrow. The winning row reads green (is-win),
   the loser recedes to steel (is-loss). The gamertag sits in a pill
   so it reads as a handle, not stray metadata; a team with no coach
   is a CPU opponent. Team and coach both truncate with ellipsis, so
   any long name (e.g. "North Dakota State") stays boxed. Logo comes
   from ESPN's CDN with a monogram fallback — same as the roster. */
function gameRowHtml(team, played, win, score) {
  const entry = rosterEntryFor(team);
  const coach = entry?.name || "";
  const src = teamLogoSrc(team);
  const mono = monogramFor(entry?.team || team);
  const cls = win ? " is-win" : played ? " is-loss" : "";

  return `<div class="gc-row${cls}">
      <span class="gc-logo">
        <span class="gc-mono">${esc(mono)}</span>
        ${
          src
            ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">`
            : ""
        }
      </span>
      <span class="gc-who">
        <span class="gc-team" title="${esc(team)}">${esc(team)}</span>
        ${
          coach
            ? `<span class="gc-coach">${esc(coach)}</span>`
            : '<span class="gc-cpu">CPU</span>'
        }
      </span>
      <span class="gc-pts${played ? "" : " gc-dash"}">${
    played ? esc(score) : "&ndash;"
  }</span>
      <span class="gc-arrow">${win ? "&#9664;" : ""}</span>
    </div>`;
}

function gameCardHtml(g, week) {
  const homeWon = g.played && g.homeScore > g.awayScore;
  const awayWon = g.played && g.awayScore > g.homeScore;

  return `
    <article class="game-card${g.league ? " is-league" : ""}${
    g.played ? " is-final" : " is-upcoming"
  }">
      ${gameRowHtml(g.away, g.played, awayWon, g.awayScore)}
      ${gameRowHtml(g.home, g.played, homeWon, g.homeScore)}
      <div class="gc-foot">
        <span>${g.played ? "Final" : esc(weekLabel(week))}</span>
        ${g.league ? '<span class="wg-league-tag">League</span>' : ""}
      </div>
    </article>`;
}

function renderThisWeekGames() {
  const container = document.getElementById("this-week-games");
  const tag = document.getElementById("this-week-tag");
  if (!container || !tag) return;

  if (isPreseason()) {
    tag.textContent = "PRESEASON";
    container.innerHTML =
      '<p class="sched-empty">Matchups will show up here once Week 0 kicks off.</p>';
    return;
  }

  const week = SEASON.currentWeek;
  const { rows } = buildWeekGames(week);
  tag.textContent = weekLabel(week).toUpperCase();

  container.innerHTML = rows.length
    ? `<div class="game-grid">${rows.map((g) => gameCardHtml(g, week)).join("")}</div>`
    : '<p class="sched-empty">No tracked matchups this week.</p>';
}

function renderRecentResults() {
  const container = document.getElementById("recent-results");
  if (!container) return;

  if (isPreseason()) {
    container.innerHTML =
      '<li class="sched-empty">No results yet — season hasn\'t started.</li>';
    return;
  }

  // Previous weeks only — the current week's games live in "This
  // Week" until the season advances, then drop into results. Capped
  // at the two most recent completed weeks: at week 3 that's weeks
  // 1-2, at week 1 just week 0, at week 0 nothing yet.
  const results = [];
  const firstWeek = Math.max(0, SEASON.currentWeek - 2);
  for (let w = firstWeek; w < SEASON.currentWeek; w++) {
    buildWeekGames(w).rows.forEach((g) => {
      if (g.played) results.push({ ...g, week: w });
    });
  }

  // Most recent first, league games surfaced above CPU games.
  results.sort((a, b) => (b.week - a.week) || (b.league - a.league));

  container.innerHTML = results.length
    ? results
        .map((g) => {
          const awayWon = g.awayScore > g.homeScore;
          return `
      <li>
        <span class="week-chip">WK ${esc(g.week)}</span>
        <span class="r-line">
          <span class="r-team${awayWon ? " won" : ""}">${esc(g.away)}</span>
          <span class="r-score${awayWon ? " won" : ""}">${esc(g.awayScore)}</span>
          <span class="r-at">&#64;</span>
          <span class="r-team${!awayWon ? " won" : ""}">${esc(g.home)}</span>
          <span class="r-score${!awayWon ? " won" : ""}">${esc(g.homeScore)}</span>
          ${g.league ? '<span class="wg-league-tag">League</span>' : ""}
        </span>
      </li>`;
        })
        .join("")
    : '<li class="sched-empty">No results yet.</li>';
}

/* ------------------------------------------------------------
   RANKINGS  (live-computed)
   ------------------------------------------------------------
   The poll is no longer hand-entered in league-data.js. It's
   computed straight from the scores in schedule-data.js by
   WeekCore.computeRankings — coach-vs-coach games only, force-sims
   and forfeits excluded — so it updates itself the instant a
   result is recorded.

   The up/down arrows need no stored history: the poll as it stood
   a week earlier is just the same computation run with
   throughWeek - 1, and each team's movement is the difference in
   position between the two. RANKING_CONFIG (optional, in
   league-data.js) can retune the weights without touching this.
   ------------------------------------------------------------ */
const RANKING_DATA = { COACHES: ROSTER, ALIASES, TEAM_SCHEDULES: SCHEDULES };
const RANKING_OPTS = typeof RANKING_CONFIG !== "undefined" ? { config: RANKING_CONFIG } : {};

/* Movement of one team against a map of last week's ranks. A team
   that wasn't in last week's poll is new (star), not "up from
   nowhere", so its first appearance doesn't read as a giant climb. */
function trendFrom(prevRankByKey, r) {
  if (!prevRankByKey.has(r.key)) return { symbol: "&#9733;", cls: "same", label: "new to poll" };
  const diff = prevRankByKey.get(r.key) - r.rank;
  if (diff > 0) return { symbol: `&#9650;${diff}`, cls: "up", label: `up ${diff}` };
  if (diff < 0) return { symbol: `&#9660;${Math.abs(diff)}`, cls: "down", label: `down ${Math.abs(diff)}` };
  return { symbol: "&ndash;", cls: "same", label: "no change" };
}

/* The rank number is drawn by a CSS counter on the <li>, so this
   returns exactly 3 children to fill the remaining 3 grid columns.
   Adding an element here means adding a column in style.css. */
function rankingRowHtml(r, trend) {
  return `
    <li>
      <span class="p-main">
        ${teamMarkHtml(r.team, "sm")}
        <span class="p-text">
          <span class="p-team">${esc(r.team)}</span>
          <span class="p-coach">${esc(r.coach || coachFor(r.team))}</span>
        </span>
      </span>
      <span class="p-record">${esc(r.record || "")}</span>
      <span class="p-trend ${trend.cls}" title="${esc(trend.label)}">${trend.symbol}</span>
    </li>`;
}

const RANKINGS_EMPTY_MSG =
  '<li class="poll-empty-msg">No power rankings yet — check back once there are enough league (coach vs. coach) games on the board.</li>';

function renderRankings() {
  const fullList = document.getElementById("full-rankings");
  const previewList = document.getElementById("rankings-preview");
  const label = document.getElementById("rankings-week-label");

  /* WeekCore carries the shared ranking math. If the script failed
     to load, degrade to the empty state rather than throwing. */
  const engineReady = typeof WeekCore !== "undefined" && WeekCore.computeRankings;
  const week = engineReady ? WeekCore.latestH2HWeek(RANKING_DATA) : null;
  const rows =
    engineReady && week != null
      ? WeekCore.computeRankings(RANKING_DATA, { ...RANKING_OPTS, throughWeek: week })
      : [];

  if (!rows.length) {
    if (label) label.textContent = "NOT ENOUGH GAMES YET";
    [fullList, previewList].forEach((el) => {
      if (!el) return;
      el.classList.add("is-empty");
      el.innerHTML = RANKINGS_EMPTY_MSG;
    });
    return;
  }

  const prev =
    week > 0
      ? WeekCore.computeRankings(RANKING_DATA, { ...RANKING_OPTS, throughWeek: week - 1 })
      : [];
  const prevRankByKey = new Map(prev.map((r) => [r.key, r.rank]));

  if (label) label.textContent = `WEEK ${week} POLL`;
  if (fullList) {
    fullList.classList.remove("is-empty");
    fullList.innerHTML = rows.map((r) => rankingRowHtml(r, trendFrom(prevRankByKey, r))).join("");
  }
  if (previewList) {
    previewList.classList.remove("is-empty");
    previewList.innerHTML = rows
      .slice(0, 5)
      .map((r) => rankingRowHtml(r, trendFrom(prevRankByKey, r)))
      .join("");
  }
}

/* ------------------------------------------------------------
   ROSTER
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   LIVE STATUS
   ------------------------------------------------------------
   Filled in by a background fetch after first paint. The roster
   renders immediately without it, then re-renders once the answer
   arrives — so a slow or dead Worker costs nothing but the badges.
   ------------------------------------------------------------ */
const LIVE_NOW = new Set();

const LIVE_CFG =
  typeof LIVE_STATUS !== "undefined"
    ? LIVE_STATUS
    : { endpoint: "", refreshSeconds: 120 };

/* The channel name out of a Twitch URL — the last path segment.
   This has to come from the URL rather than the coach name: plenty
   of handles don't match (Miles streams as kyrvach, Woody as
   mldwoody), so deriving from the name would silently mark the
   wrong people live. */
function twitchLogin(url) {
  const u = safeUrl(url);
  if (!u) return "";
  try {
    const seg = new URL(u).pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[a-z0-9_]{3,25}$/i.test(seg) ? seg.toLowerCase() : "";
  } catch {
    return "";
  }
}

const isLive = (coach) => {
  const login = twitchLogin(coach.twitch);
  return login !== "" && LIVE_NOW.has(login);
};

async function refreshLiveStatus() {
  const endpoint = safeUrl(LIVE_CFG.endpoint);
  if (!endpoint) return;

  const logins = [
    ...new Set(ROSTER.map((c) => twitchLogin(c.twitch)).filter(Boolean)),
  ].sort();
  if (logins.length === 0) return;

  try {
    const res = await fetch(`${endpoint}?logins=${logins.join(",")}`);
    if (!res.ok) return;

    const data = await res.json();
    if (!Array.isArray(data.live)) return;

    LIVE_NOW.clear();
    data.live.forEach((l) => LIVE_NOW.add(String(l).toLowerCase()));
    renderRoster();
    renderLiveNow();
  } catch {
    /* Offline, blocked, Worker down — leave the last known state
       alone and try again on the next tick. Never surface this to
       the page; a missing badge is not worth an error message. */
  }
}

function initLiveStatus() {
  if (!safeUrl(LIVE_CFG.endpoint)) return;

  refreshLiveStatus();

  const secs = Number(LIVE_CFG.refreshSeconds) || 120;
  setInterval(() => {
    // Don't poll a tab nobody is looking at.
    if (document.visibilityState === "visible") refreshLiveStatus();
  }, Math.max(30, secs) * 1000);

  // Coming back to a backgrounded tab should show current reality.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshLiveStatus();
  });
}

/* ------------------------------------------------------------
   CURRENTLY LIVE — Home tab
   ------------------------------------------------------------
   A band at the top of Home listing this league's coaches who are
   streaming right now. It only exists when someone is live: no
   live coaches means the container is emptied, so there's no
   header, no border, no gap — Home looks exactly as it did before
   the feature. Same LIVE_NOW set that drives the roster badges, so
   the two can never disagree.
   ------------------------------------------------------------ */
function renderLiveNow() {
  const box = document.getElementById("live-now");
  if (!box) return;

  // ROSTER holds each coach once per league, so no cross-league
  // dedupe is needed here — that's only a concern on the landing
  // page, which spans all three.
  const live = ROSTER.filter(isLive).sort((a, b) => a.team.localeCompare(b.team));

  if (live.length === 0) {
    box.innerHTML = "";
    return;
  }

  const cards = live
    .map((c) => {
      const url = safeUrl(c.twitch);
      const color = safeHex(c.color);
      return `
      <article class="live-card"${color ? ` style="--team:${color}"` : ""}>
        ${teamMarkHtml(c.team, "md")}
        <div class="live-card-text">
          <div class="live-card-coach">${esc(c.name)}</div>
          <div class="live-card-team">${esc(c.team)}</div>
        </div>
        ${
          url
            ? `<a class="live-card-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Watch &rarr;</a>`
            : ""
        }
      </article>`;
    })
    .join("");

  box.innerHTML = `
    <div class="live-now-head">
      <span class="live-now-dot"></span>
      <h2 class="live-now-title">Currently Live on Twitch</h2>
    </div>
    <div class="live-now-grid">${cards}</div>`;
}

function renderRoster() {
  const grid = document.getElementById("roster-grid");
  if (!grid) return;

  const sorted = [...ROSTER].sort((a, b) => a.team.localeCompare(b.team));

  grid.innerHTML = sorted
    .map((c) => {
      const url = safeUrl(c.twitch);
      const color = safeHex(c.color);
      const live = isLive(c);
      return `
      <article class="roster-card${live ? " is-live" : ""}"${color ? ` style="--team:${color}"` : ""}>
        ${teamMarkHtml(c.team, "lg")}
        <div class="r-team">${esc(c.team)}</div>
        <div class="r-coach">${esc(c.name)}</div>
        ${/* Conference sits in a quiet meta line rather than
             competing with the logo up top. The LIVE badge joins it
             there so it can't shift the card's height when it
             appears mid-session. */ ""}
        <div class="r-meta">
          ${c.conference ? `<span class="r-conf">${esc(c.conference)}</span>` : ""}
          ${live ? `<span class="live-badge"><span class="live-dot"></span>LIVE</span>` : ""}
        </div>
        ${
          url
            ? `<a class="twitch-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Watch on Twitch &rarr;</a>`
            /* No placeholder while links are still coming in — a card
               with no twitch value simply ends here. To bring the
               placeholder back, swap in:
               `<span class="no-stream">No stream linked</span>`
               (the .no-stream style is still in style.css). */
            : ""
        }
      </article>`;
    })
    .join("");
}

/* ------------------------------------------------------------
   SCHEDULE TAB — Weekly / By Team
   ------------------------------------------------------------ */
function setupScheduleToggle() {
  document.querySelectorAll(".sched-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.schedView;
      document.querySelectorAll(".sched-toggle-btn")
        .forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".sched-view")
        .forEach((v) => v.classList.toggle("active", v.id === `sched-${target}`));
    });
  });
}

function populateWeekSelect() {
  const sel = document.getElementById("week-select");
  if (!sel) return;

  sel.innerHTML = Array.from(
    { length: 16 },
    (_, w) => `<option value="${w}">${esc(weekLabel(w))}</option>`
  ).join("");

  // Open on the week the league is actually playing, not a fixed week 1.
  sel.value = String(isPreseason() ? 0 : SEASON.currentWeek);
  sel.addEventListener("change", renderWeeklyGames);
}

function populateTeamSelect() {
  const sel = document.getElementById("team-select");
  if (!sel) return;
  const sorted = [...SCHEDULES].sort((a, b) => a.team.localeCompare(b.team));
  sel.innerHTML = sorted
    .map((t) => `<option value="${esc(t.team)}">${esc(t.team)}</option>`)
    .join("");
  sel.addEventListener("change", renderTeamSchedule);
}

function renderWeeklyGames() {
  const container = document.getElementById("weekly-games");
  const weekSel = document.getElementById("week-select");
  if (!container || !weekSel) return;

  const week = Number(weekSel.value);
  const { rows, offRows } = buildWeekGames(week);

  const gamesHtml =
    rows
      .map((g) => {
        const awayWon = g.played && g.awayScore > g.homeScore;
        const homeWon = g.played && g.homeScore > g.awayScore;
        return `
    <div class="week-game-row ${g.league ? "is-league" : ""}">
      <div class="wg-teams">
        <span class="wg-team${awayWon ? " won" : g.played ? " lost" : ""}">${esc(g.away)}</span>
        ${g.played ? `<span class="wg-score${awayWon ? " won" : " lost"}">${esc(g.awayScore)}</span>` : ""}
        <span class="wg-at">&#64;</span>
        <span class="wg-team${homeWon ? " won" : g.played ? " lost" : ""}">${esc(g.home)}</span>
        ${g.played ? `<span class="wg-score${homeWon ? " won" : " lost"}">${esc(g.homeScore)}</span>` : ""}
      </div>
      <div class="wg-meta">
        ${g.played ? '<span class="wg-final-tag">Final</span>' : ""}
        ${g.league ? '<span class="wg-league-tag">League Game</span>' : ""}
        <span class="wg-stadium">${esc(g.stadium || "")}</span>
      </div>
    </div>`;
      })
      .join("") || '<p class="sched-empty">No games recorded for this week yet.</p>';

  const offHtml = offRows.length
    ? `
    <div class="sched-off-block">
      <span class="sched-off-label">Off this week</span>
      <div class="sched-off-list">
        ${offRows
          .map((o) => `<span class="sched-off-chip">${esc(o.team)} <i>${esc(o.note)}</i></span>`)
          .join("")}
      </div>
    </div>`
    : "";

  container.innerHTML = gamesHtml + offHtml;
}

function renderTeamSchedule() {
  const container = document.getElementById("team-schedule");
  const teamSel = document.getElementById("team-select");
  if (!container || !teamSel) return;

  const team = SCHEDULES.find((t) => t.team === teamSel.value);
  if (!team) {
    container.innerHTML = '<p class="sched-empty">Schedule not yet available for this team.</p>';
    return;
  }

  const coach = coachFor(team.team);
  let wins = 0;
  let losses = 0;

  const rowsHtml = team.weeks
    .map((w) => {
      if (!w.opponent) {
        return `
        <div class="team-sched-row is-note">
          <span class="tsr-week">${esc(weekNum(w.week))}</span>
          <span class="tsr-note">${esc(w.note)}</span>
        </div>`;
      }

      const isLeague = isLeagueTeam(w.opponent);
      const oppCoach = isLeague ? coachFor(w.opponent) : "";
      const played = w.teamScore != null && w.opponentScore != null;

      let resultCls = "";
      let resultLetter = "";
      if (played) {
        if (w.teamScore > w.opponentScore) { resultCls = "win"; resultLetter = "W"; wins++; }
        else if (w.teamScore < w.opponentScore) { resultCls = "loss"; resultLetter = "L"; losses++; }
        else { resultCls = "tie"; resultLetter = "T"; }
      }

      const isCurrent = !isPreseason() && w.week === SEASON.currentWeek;

      return `
        <div class="team-sched-row${isCurrent ? " is-current" : ""}">
          <span class="tsr-week">${esc(weekNum(w.week))}</span>
          <span class="tsr-loc">${w.location === "vs" ? "VS" : "AT"}</span>
          <span class="tsr-opp">
            <span class="tsr-opp-name">${esc(w.opponent)}</span>
            ${
              isLeague
                ? `<span class="wg-league-tag">League${
                    oppCoach
                      /* Coach name is split out so narrow screens can drop
                         just that part and keep the League tag itself. */
                      ? `<span class="lt-coach"> &middot; ${esc(oppCoach)}</span>`
                      : ""
                  }</span>`
                : ""
            }
          </span>
          <span class="tsr-stadium">${esc(w.stadium || "")}</span>
          ${
            played
              /* The W/L sits INSIDE .tsr-score rather than in its own
                 grid cell — the row is a fixed 5-column grid, so a
                 sixth child would wrap onto a new line. Nesting it
                 also means it inherits the win/loss colour from the
                 parent automatically, so the letter and the score can
                 never end up different colours. */
              ? `<span class="tsr-score ${resultCls}">` +
                `<span class="tsr-wl">${resultLetter}</span>` +
                `${esc(w.teamScore)}&ndash;${esc(w.opponentScore)}</span>`
              : `<span class="tsr-score pending">&mdash;</span>`
          }
        </div>`;
    })
    .join("");

  const recordText = wins + losses > 0 ? `${wins}-${losses}` : "";

  const teamColor = colorFor(team.team);

  container.innerHTML = `
    ${/* Grouped into mark / text / record so the header can reflow to a
         two-line stack on narrow screens instead of wrapping raggedly.
         Only the selected team gets a mark — opponents stay text, since
         covering every CPU school would mean sourcing 90+ logos
         including EA's fictional FCS teams. */ ""}
    <div class="team-sched-head"${teamColor ? ` style="--team:${teamColor}"` : ""}>
      ${teamMarkHtml(team.team, "xl")}
      <div class="tsh-text">
        <span class="team-sched-name">${esc(team.team)}</span>
        <span class="tsh-meta">
          <span class="team-sched-conf">${esc(team.conference)}</span>
          ${coach ? `<span class="team-sched-coach">${esc(coach)}</span>` : ""}
        </span>
      </div>
      ${recordText ? `<span class="team-sched-record">${esc(recordText)}</span>` : ""}
    </div>
    <div class="team-sched-rows">${rowsHtml}</div>`;
}

function initSchedule() {
  /* A league with no schedule at all is a different situation from a
     week with no games in it. Without this, both the Weekly and By
     Team views would render an empty dropdown next to a vague "no
     games" line, which reads like a bug rather than "we haven't
     transcribed the screenshots yet". */
  if (!SCHEDULES.length) {
    const panel = document.getElementById("schedule");
    if (panel) {
      const toggle = panel.querySelector(".sched-toggle");
      const weekly = document.getElementById("sched-weekly");
      const byTeam = document.getElementById("sched-team");
      if (toggle) toggle.hidden = true;
      if (byTeam) byTeam.hidden = true;
      if (weekly) {
        weekly.innerHTML =
          '<p class="sched-empty">No schedule posted yet. Once coaches share their ' +
          'in-game schedule screenshots, every week and matchup shows up here.</p>';
      }
    }
    return;
  }

  setupScheduleToggle();
  populateWeekSelect();
  populateTeamSelect();
  renderWeeklyGames();
  renderTeamSchedule();
}

/* ------------------------------------------------------------
   TICKER — live content, not decoration
   Builds its segments from the data files so it always says
   something true. Preseason it chases missing schedules; in
   season it carries the latest finals and what's up next.
   The list is emitted twice because the scroll animation
   translates by -50% for a seamless loop.
   ------------------------------------------------------------ */
/* Each segment is { html } (already escaped) plus an optional `lead`
   flag for the gold league name. Building html here — rather than
   plain strings escaped in renderTicker — lets a current-week result
   wrap its winning team in <span class="ts-win"> for the green
   highlight. */
function tickerSegments() {
  const seg = (text) => ({ html: esc(String(text).toUpperCase()) });
  const segs = [
    { html: esc(`${INFO.name} · ${INFO.tag}`.toUpperCase()), lead: true },
  ];

  if (isPreseason()) {
    const missing = ROSTER.filter(
      (c) => !SCHEDULES.some((t) => rosterKeyFor(t.team) === rosterKeyFor(c.team))
    );

    segs.push(seg(`${SCHEDULES.length} of ${ROSTER.length} schedules in`));

    if (missing.length) {
      segs.push(seg(`Still needed: ${missing.map((c) => c.team).join(", ")}`));
    } else {
      segs.push(seg("ALL SCHEDULES IN — READY FOR WEEK 0"));
    }
    segs.push(seg(`${ROSTER.length} coaches signed up`));
    return segs;
  }

  const week = SEASON.currentWeek;
  segs.push(seg(weekLabel(week)));

  // Latest finals, league games first.
  const finals = [];
  for (let w = 0; w <= week; w++) {
    buildWeekGames(w).rows.forEach((g) => { if (g.played) finals.push({ ...g, week: w }); });
  }
  finals.sort((a, b) => (b.week - a.week) || (b.league - a.league));
  finals.slice(0, 4).forEach((g) => {
    const awayWon = g.awayScore > g.homeScore;
    const [wT, wS, lT, lS] = awayWon
      ? [g.away, g.awayScore, g.home, g.homeScore]
      : [g.home, g.homeScore, g.away, g.awayScore];

    // Highlight the winning team, but only for the current week.
    if (g.week === week) {
      segs.push({
        html:
          `<span class="ts-win">${esc(`${wT} ${wS}`.toUpperCase())}</span>` +
          esc(`, ${lT} ${lS}`.toUpperCase()),
      });
    } else {
      segs.push(seg(`${wT} ${wS}, ${lT} ${lS}`));
    }
  });

  // Still to play this week, league games only.
  const upcoming = buildWeekGames(week).rows.filter((g) => !g.played && g.league);
  upcoming.slice(0, 3).forEach((g) => {
    segs.push(seg(`Up next: ${g.away} at ${g.home}`));
  });

  if (finals.length === 0 && upcoming.length === 0) {
    segs.push(seg("NO TRACKED GAMES THIS WEEK"));
  }
  return segs;
}

/* The loop animates the track by -50%, so the track must be exactly
   two identical halves and each half must be at least as wide as the
   viewport — otherwise the content runs out mid-scroll and you see a
   gap before it wraps. Short segment lists get repeated until one
   half fills the screen. */
function renderTicker() {
  const track = document.getElementById("ticker-track");
  if (!track) return;

  const segs = tickerSegments();
  if (!segs.length) return;

  // The league name leads every repetition and is the only gold
  // segment. Keyed by class, not :first-child, or the gold would
  // appear once across the whole track and visibly jump on wrap.
  // Each segment carries its own pre-escaped html (see tickerSegments).
  const oneCopy = segs
    .map((s) => `<span${s.lead ? ' class="ts-lead"' : ""}>${s.html}</span>`)
    .join("");

  track.innerHTML = oneCopy;

  const viewport = track.parentElement?.clientWidth || 0;
  let half = oneCopy;
  let guard = 0;
  // Grow one half until it covers the viewport (cap the loop so a
  // zero-width measurement can't spin forever).
  while (track.scrollWidth < viewport && guard < 12) {
    half += oneCopy;
    track.innerHTML = half;
    guard++;
  }

  const halfWidth = track.scrollWidth;
  track.innerHTML = half + half; // two identical halves -> seamless -50%

  // Constant speed regardless of how much content there is.
  const PX_PER_SEC = 55;
  track.style.animationDuration = `${Math.max(12, halfWidth / PX_PER_SEC)}s`;
}

/* ------------------------------------------------------------
   FOOTER — live status bar
   Every segment is computed from the data files, so it stays
   accurate on its own as schedules come in and weeks advance.
   ------------------------------------------------------------ */
function renderFooter() {
  const statusEl = document.getElementById("footer-status");
  const linksEl = document.getElementById("footer-links");

  if (statusEl) {
    // Just the dynasty you're in and the current week.
    const phase = isPreseason()
      ? "PRESEASON"
      : weekLabel(SEASON.currentWeek).toUpperCase();

    const segs = [INFO.name.toUpperCase()];
    if (INFO.tag) segs.push(INFO.tag.toUpperCase());
    segs.push(phase);

    statusEl.innerHTML = segs
      .map((seg) => `<span class="fs-seg">${esc(seg)}</span>`)
      .join('<span class="fs-sep">&middot;</span>');
  }

  if (linksEl) {
    // Only links with a real URL render — empty slots stay invisible.
    const links = (INFO.links || {});
    const items = [
      { label: "Discord", url: safeUrl(links.discord) },
      { label: "Rules", url: safeUrl(links.rules) },
      /* Commissioner sign-in. Always shown, on every league — it's a
         login wall, not a back door, so a coach clicking it just
         finds a box they have no code for. Not run through safeUrl()
         because that only accepts absolute http(s) URLs and this is
         a relative path within the site, written here as a literal
         rather than taken from data. */
      { label: "Commissioner tools", url: "../admin/", internal: true },
    ].filter((l) => l.url);

    linksEl.innerHTML = items
      .map((l) =>
        l.internal
          ? `<a href="${esc(l.url)}">${esc(l.label)}</a>`
          : `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`
      )
      .join('<span class="fs-sep">&middot;</span>');
  }
}

/* ------------------------------------------------------------
   TABS
   Tab state lives in the URL hash, so a refresh keeps your place
   and you can drop someone straight into #rankings in Discord.
   ------------------------------------------------------------ */
const TABS = ["home", "schedule", "rankings", "roster"];

function showTab(name, { scroll = true } = {}) {
  const target = TABS.includes(name) ? name : "home";

  document.querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.toggle("active", p.id === target));

  document.querySelectorAll(".tab-btn").forEach((b) => {
    const on = b.dataset.tab === target;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });

  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupTabs() {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      if (location.hash.slice(1) === target) showTab(target);
      else location.hash = target; // hashchange listener finishes the job
    });
  });

  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));
  showTab(location.hash.slice(1), { scroll: false });
}

/* ------------------------------------------------------------
   LEAGUE SWITCHER
   ------------------------------------------------------------
   The header badge opens into the other dynasties. Built from
   SITE_LEAGUES in people.js so adding a league doesn't mean editing
   three near-identical index.html files.

   Which league we're on comes from <body data-league>, the same
   attribute that drives the accent palette — one source of truth
   rather than parsing the URL, which would break on local preview
   and on any future custom domain.

   <details> handles open/close and keyboard access for free. The
   only things it doesn't do are close on outside click and close on
   Escape, both added below.
   ------------------------------------------------------------ */
function renderLeagueSwitch() {
  const wrap = document.getElementById("league-switch");
  const menu = document.getElementById("league-menu");
  const leagues = typeof SITE_LEAGUES !== "undefined" ? SITE_LEAGUES : [];

  // Degrade to a plain, non-interactive badge if anything's missing.
  if (!wrap || !menu || leagues.length < 2) {
    if (wrap) wrap.classList.add("no-switch");
    return;
  }

  const current = document.body.dataset.league || "";

  menu.innerHTML = leagues
    .map((l) => {
      const here = l.dir === current;
      return `
        <a class="league-menu-item${here ? " is-current" : ""}"
           href="../${esc(l.dir)}/"
           style="--team:${esc(l.accent)}"
           ${here ? 'aria-current="page"' : ""}>
          <span class="lm-dot"></span>
          <span class="lm-label">${esc(l.label)}</span>
          ${here ? '<span class="lm-here">You are here</span>' : ""}
        </a>`;
    })
    .join("");

  document.addEventListener("click", (e) => {
    if (wrap.open && !wrap.contains(e.target)) wrap.open = false;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && wrap.open) {
      wrap.open = false;
      wrap.querySelector("summary")?.focus();
    }
  });
}

/* ------------------------------------------------------------
   INIT
   ------------------------------------------------------------ */
function init() {
  /* Everything league-specific in the page shell is filled from
     LEAGUE_INFO, so the three index.html files stay byte-identical
     apart from their <meta> tags — which have to be static because
     crawlers and link-preview bots don't run JavaScript. */
  const nameEl = document.getElementById("league-name");
  if (nameEl) nameEl.textContent = INFO.name.toUpperCase();

  const badgeEl = document.getElementById("league-badge");
  if (badgeEl) badgeEl.textContent = (INFO.tag || "").toUpperCase();

  renderLeagueSwitch();

  const heroSubEl = document.getElementById("hero-sub");
  if (heroSubEl) heroSubEl.textContent = (INFO.tag || "").toUpperCase();

  document.title = INFO.tag ? `${INFO.name} — ${INFO.tag}` : INFO.name;

  validateData();

  renderLaunchStatus();
  renderJumbotron();
  renderNextAdvance();
  renderThisWeekGames();
  renderRecentResults();
  renderRankings();
  renderRoster();
  renderLiveNow();
  initLiveStatus();
  initSchedule();
  renderTicker();
  renderFooter();
  setupTabs();
}

init();
