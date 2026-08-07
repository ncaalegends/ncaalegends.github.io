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
   COACHES WHO HAVE LEFT
   Two flags, two different amounts of history to preserve.

   `active: false` — on the books but not playing, with no played
   games worth keeping. They and their now-stale schedule block drop
   out here, at the data handles: the coach leaves the roster, their
   team stops counting as a league (coach-vs-coach) team and reverts
   to CPU, and they leave the By Team dropdown.

   `departedAfterWeek: N` — left PART WAY THROUGH a season they had
   already played in. Same disappearance from the roster grid and the
   dropdown, but weeks 0..N are history: those games happened, and
   they still belong to whoever played them. So this file keeps a
   third handle, ROSTER_HISTORY, which includes departed coaches, and
   the name/colour lookups read it — otherwise an opponent's Week 4
   row would lose the coach chip on a game that was really played.
   Whether a departed coach still counts as a league team is a
   per-week question, so isLeagueTeam takes a week; see week-core.js
   makeResolver, which owns the authoritative version of this rule.

   Every byte of their data stays in the file. Delete the flag to
   bring a coach back untouched.
   ------------------------------------------------------------ */
const isActiveCoach = (c) => c.active !== false;
const hasDeparted = (c) => c.departedAfterWeek != null;
const _inactiveNorm = (s) => String(s ?? "").trim().toLowerCase();
const _inactiveKey = (name) => {
  const aliased = ALIASES[name];
  return aliased ? _inactiveNorm(aliased) : _inactiveNorm(name);
};
const _teamKeys = (c) =>
  String(c.team).split("/").map((part) => _inactiveNorm(part));

// Gone entirely — no games to preserve, no schedule block to keep.
const INACTIVE_TEAM_KEYS = new Set(
  ROSTER_RAW.filter((c) => !isActiveCoach(c)).flatMap(_teamKeys)
);

/* Left mid-season -> team key -> last week they count as a league
   team. Read by isLeagueTeam below. */
const DEPARTED_TEAM_UNTIL = new Map();
ROSTER_RAW.filter((c) => isActiveCoach(c) && hasDeparted(c)).forEach((c) => {
  _teamKeys(c).forEach((k) => {
    if (k) DEPARTED_TEAM_UNTIL.set(k, Number(c.departedAfterWeek));
  });
});

/* ROSTER         the league as it stands now — cards, dropdown, live row
   ROSTER_HISTORY everyone whose games still count — name/colour lookups
   SCHEDULES      blocks worth rendering; a departed coach's own block
                  goes, because their remaining weeks won't be played */
const ROSTER = ROSTER_RAW.filter((c) => isActiveCoach(c) && !hasDeparted(c));
const ROSTER_HISTORY = ROSTER_RAW.filter(isActiveCoach);
const SCHEDULES = SCHEDULES_RAW.filter(
  (t) =>
    !INACTIVE_TEAM_KEYS.has(_inactiveKey(t.team)) &&
    !DEPARTED_TEAM_UNTIL.has(_inactiveKey(t.team))
);

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
   who hasn't sent a screenshot yet looks like a CPU game.

   `week` is optional and means "as of that week". A coach who left
   after week 4 was a league opponent in weeks 0-4 and is CPU from
   week 5, so a caller rendering a specific row should pass its week.
   Omitting it asks about the league today, which is what the roster
   grid and the dropdown want. */
function isLeagueTeam(scheduleName, week) {
  const key = rosterKeyFor(scheduleName);
  if (ROSTER_KEYS.has(key)) return true;
  if (!DEPARTED_TEAM_UNTIL.has(key)) return false;
  return week !== undefined && week <= DEPARTED_TEAM_UNTIL.get(key);
}

// Teams that have actually submitted a schedule. Used only for
// deduping — a matchup can only appear twice if both sides are in.
const KNOWN_SCHEDULE_TEAMS = new Set(SCHEDULES.map((t) => t.team));

/* ROSTER_HISTORY, not ROSTER: a departed coach's played games still
   carry their name and colour. */
function rosterEntryFor(scheduleName) {
  const key = rosterKeyFor(scheduleName);
  return ROSTER_HISTORY.find((c) =>
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
   TOP 25 (in-game AP poll)
   ------------------------------------------------------------
   The transcribed in-game poll, one frozen entry per week (see
   top25-data.js). Two things read it: the Top 25 tab, and the "#N"
   badges on schedules. A game in week N always shows a team's rank
   from THAT week's poll, so a schedule reflects what a team was
   ranked when the game was actually played — never a later poll.
   Team names resolve through the same alias table as everything
   else, so "Cal"/"California" and friends line up.
   ------------------------------------------------------------ */
const TOP25_DATA = typeof TOP25 !== "undefined" ? TOP25 : [];

// week number -> Map(rosterKey -> { rank, record })
const POLL_BY_WEEK = new Map();
TOP25_DATA.forEach((p) => {
  const m = new Map();
  (p.teams || []).forEach((t) => {
    const k = rosterKeyFor(t.team);
    if (k) m.set(k, { rank: Number(t.rank), record: String(t.record ?? "") });
  });
  POLL_BY_WEEK.set(Number(p.week), m);
});

const pollWeeksAvailable = () => [...POLL_BY_WEEK.keys()].sort((a, b) => a - b);
const latestPollWeek = () => {
  const ws = pollWeeksAvailable();
  return ws.length ? ws[ws.length - 1] : null;
};

/* The poll the site should actually SHOW. Not necessarily the newest
   one in the file — the newest poll whose week the season has actually
   reached (currentWeek). A poll can be committed for a week we haven't
   advanced to yet: the advance gate (tools/lib/league.js) requires
   week N's poll to be in the repo BEFORE an advance to week N is
   allowed, so the poll always lands first. Capping the display at
   currentWeek is what keeps that early-committed poll invisible until
   the advance flips the week — the poll and the new week reveal
   together, never before. Falls back to the latest poll at or before
   the current week, and to null (nothing published) if none qualifies. */
const currentSeasonWeek = () =>
  SEASON.currentWeek === "PRESEASON" ? 0 : Number(SEASON.currentWeek) || 0;
const currentPollWeek = () => {
  const cap = currentSeasonWeek();
  const reached = pollWeeksAvailable().filter((w) => w <= cap);
  return reached.length ? reached[reached.length - 1] : null;
};

/* A team's rank in a given week's poll, or null when it's unranked
   (or no poll exists for that week yet). */
function rankForWeek(teamName, week) {
  const m = POLL_BY_WEEK.get(Number(week));
  if (!m) return null;
  const e = m.get(rosterKeyFor(teamName));
  return e ? e.rank : null;
}

/* "#7" badge for a team ranked that week, empty string otherwise —
   unranked teams just show their name with no prefix. */
function rankBadgeHtml(teamName, week) {
  const r = rankForWeek(teamName, week);
  return r ? `<span class="rank-badge">#${r}</span>` : "";
}

/* Which poll a schedule row should read for its opponent badge. A
   game that's been played is frozen: it shows the rank the opponent
   held in the week it was actually played. An unplayed (future) game
   can't know that yet, so it tracks the opponent's CURRENT rank — the
   current week's poll — and keeps updating until the game happens.
   "Current" is the shown poll (currentPollWeek), so a poll uploaded
   for a week the site hasn't advanced to yet never leaks into a badge
   early. */
function badgeWeekFor(played, gameWeek) {
  return played ? gameWeek : currentPollWeek();
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
    const isLeague = isLeagueTeam(entry.opponent, week);
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
function gameRowHtml(team, played, win, score, week) {
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
        <span class="gc-team" title="${esc(team)}">${rankBadgeHtml(team, badgeWeekFor(played, week))}${esc(team)}</span>
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
      ${gameRowHtml(g.away, g.played, awayWon, g.awayScore, week)}
      ${gameRowHtml(g.home, g.played, homeWon, g.homeScore, week)}
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
/* RAW, deliberately — this hands week-core.js the unfiltered arrays and
   lets it apply its own `active: false` rules, which is what it was built
   to do (see the inactive-coach note in makeResolver).

   It used to pass the already-filtered ROSTER and SCHEDULES. That looked
   safer and was in fact weaker. makeResolver derives its inactiveKeys from
   COACHES.filter(c => c.active === false) — hand it a list with the
   inactive coaches already removed and that set is always empty, so
   isInactiveTeam() never fires and buildWeek's skip is dead code. The only
   thing still keeping Jake/Louisville's stale schedule block out was the
   SCHEDULES filter on line 71, i.e. the redundant guard was carrying the
   load while the real one was switched off.

   Proof it mattered: filtered COACHES + UNFILTERED TEAM_SCHEDULES puts
   Louisville back as a league opponent in weeks 1, 3, 4 and 6, generating
   four matchups with an empty coach name. Nothing on the site does that
   combination today, but the next caller would have had to know not to.

   Verified byte-identical across all three leagues before and after this
   change: every buildWeek result (league/cpu/notes/missing) for weeks
   0-15, latestH2HWeek, and the full computeRankings output.

   ROSTER and SCHEDULES are still the right handles for everything else in
   this file — this is the one place that needs the raw arrays, because
   it's the one place handing data to another module. */
const RANKING_DATA = {
  SEASON,
  COACHES: ROSTER_RAW,
  ALIASES,
  TEAM_SCHEDULES: SCHEDULES_RAW,
  TOP25: TOP25_DATA,
  POSTSEASON: typeof POSTSEASON !== "undefined" ? POSTSEASON : null,
  CFP_POLL: typeof CFP_POLL !== "undefined" ? CFP_POLL : null,
};

/* THE CAREER — every season the page has loaded, oldest first.

   The power poll is a rolling window over a coach's last N head-to-head
   games REGARDLESS OF SEASON, so it needs the archive, not just the
   season being played. A per-season poll would reset every year and
   spend the first month of each one ranking nobody.

   Today this is a one-element list: no season has been archived yet,
   and index.html loads only the current season's data files. When
   seasons/<year>/ folders exist, each archived season gets a <script>
   tag ahead of the current one and pushes an entry here — see
   docs/seasons-and-postseason.md.

   Order matters: oldest first, current season LAST. computeRankings
   and computeH2H both apply `throughWeek` to the final entry only, so
   getting this backwards would cap the wrong season. */
const CAREER =
  typeof ARCHIVED_SEASONS !== "undefined" && Array.isArray(ARCHIVED_SEASONS)
    ? [...ARCHIVED_SEASONS, RANKING_DATA]
    : [RANKING_DATA];
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
function rankingRowHtml(r, trend, showScore) {
  const score = r.powerScore != null ? r.powerScore.toFixed(1) : "";
  return `
    <li>
      <span class="p-main">
        ${teamMarkHtml(r.team, "sm")}
        <span class="p-text">
          <span class="p-team">${esc(r.team)}</span>
          <span class="p-coach">${esc(r.coach || coachFor(r.team))}</span>
        </span>
      </span>
      <span class="p-record">${esc(r.l5 || r.record || "")}</span>
      <span class="p-trend ${trend.cls}" title="${esc(trend.label)}">${trend.symbol}</span>
      ${showScore ? `<span class="p-score">${esc(score)}</span>` : ""}
    </li>`;
}

const RANKINGS_EMPTY_MSG =
  '<li class="poll-empty-msg">No power rankings yet — check back once there are enough league (coach vs. coach) games on the board.</li>';

/* Column header for the full rankings tab. It's a non-counting row —
   the CSS suppresses its rank counter — so it lines up with the data
   rows below without taking a number. */
const RANKINGS_HEAD_HTML =
  '<li class="poll-head" aria-hidden="true">' +
  "<span></span><span>Team</span>" +
  '<span class="ph-l5">L5</span><span></span>' +
  '<span class="ph-score">Score</span></li>';

function renderRankings() {
  const fullList = document.getElementById("full-rankings");
  const previewList = document.getElementById("rankings-preview");
  const label = document.getElementById("rankings-week-label");

  /* WeekCore carries the shared ranking math. If the script failed
     to load, degrade to the empty state rather than throwing. */
  const engineReady = typeof WeekCore !== "undefined" && WeekCore.computeRankings;
  /* The week label still comes from the CURRENT season — it's a "where
     are we now" caption. The poll itself is computed over CAREER, so a
     coach's window can reach back into archived seasons. */
  const week = engineReady ? WeekCore.latestH2HWeek(RANKING_DATA) : null;
  const rows =
    engineReady && week != null
      ? WeekCore.computeRankings(CAREER, { ...RANKING_OPTS, throughWeek: week })
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

  /* The up/down arrows compare against the poll as it stood one week
     earlier. Stepping back within the current season is enough even
     once the archive exists: at week 0 the previous state is every
     archived season complete, which `throughWeek: -1` produces (no
     regular-season games from the current season, all earlier seasons
     whole). Before there was an archive, week 0 had no previous poll
     at all, which is why this used to bail out at week > 0. */
  const prev =
    week > 0 || CAREER.length > 1
      ? WeekCore.computeRankings(CAREER, { ...RANKING_OPTS, throughWeek: week - 1 })
      : [];
  const prevRankByKey = new Map(prev.map((r) => [r.key, r.rank]));

  if (label) label.textContent = `WEEK ${week} POLL`;
  if (fullList) {
    fullList.classList.remove("is-empty");
    fullList.innerHTML =
      RANKINGS_HEAD_HTML +
      rows.map((r) => rankingRowHtml(r, trendFrom(prevRankByKey, r), true)).join("");
  }
  if (previewList) {
    previewList.classList.remove("is-empty");
    previewList.innerHTML = rows
      .slice(0, 5)
      .map((r) => rankingRowHtml(r, trendFrom(prevRankByKey, r), false))
      .join("");
  }
}

/* ------------------------------------------------------------
   TOP 25 TAB
   ------------------------------------------------------------
   Renders one week's transcribed in-game poll, styled like the
   game's own screen: rank, logo, team (with coach handle if it's
   one of ours), and the poll record. A week picker appears once
   more than one week has been entered.
   ------------------------------------------------------------ */
/* Week-over-week movement for one team, versus the most recent
   EARLIER week that has a poll (so a skipped week doesn't blank every
   arrow). Green ▲N for climbing N spots, red ▼N for falling, a dash
   for no change, and a plain green ▲ (no number) for a team new to
   the poll. Empty string when there's no earlier poll at all — the
   first week has nothing to move against. */
function top25TrendHtml(teamName, week) {
  const priorWeeks = pollWeeksAvailable().filter((w) => w < Number(week));
  if (!priorWeeks.length) return "";

  const prevMap = POLL_BY_WEEK.get(priorWeeks[priorWeeks.length - 1]);
  const prev = prevMap && prevMap.get(rosterKeyFor(teamName));
  if (!prev) {
    return `<span class="t25-move up" title="New to the poll">&#9650;</span>`;
  }

  const diff = prev.rank - rankForWeek(teamName, week);
  if (diff > 0) return `<span class="t25-move up" title="Up ${diff}">&#9650;${diff}</span>`;
  if (diff < 0)
    return `<span class="t25-move down" title="Down ${Math.abs(diff)}">&#9660;${Math.abs(diff)}</span>`;
  return `<span class="t25-move same" title="No change">&ndash;</span>`;
}

function top25RowHtml(t, week) {
  const name = t.team;
  const src = teamLogoSrc(name);
  const mono = monogramFor(rosterEntryFor(name)?.team || name);
  /* Non-empty only when a coach owns this team RIGHT NOW. A departed
     coach's old school is just another ranked CPU program, so it gets
     no accent — no week passed, so this asks about today. */
  const coach = isLeagueTeam(name) ? coachFor(name) : "";
  const color = coach ? colorFor(name) : "";

  /* League teams get a coloured accent bar + tint so a coach's team
     jumps out of a poll that's mostly CPU schools — the same --team
     accent used on roster cards and schedule headers. */
  return `
    <li class="t25-row${coach ? " is-coach" : ""}"${color ? ` style="--team:${color}"` : ""}>
      <span class="t25-rank">${esc(t.rank)}</span>
      <span class="t25-logo">
        <span class="t25-mono">${esc(mono)}</span>
        ${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
      </span>
      <span class="t25-who">
        <span class="t25-team" title="${esc(name)}">${esc(name)}</span>
        ${coach ? `<span class="t25-coach">${esc(coach)}</span>` : ""}
      </span>
      <span class="t25-record">${esc(t.record || "")}</span>
      <span class="t25-trend">${top25TrendHtml(name, week)}</span>
    </li>`;
}

/* Shows the current week's poll with movement against the previous
   week. "Current" is the newest poll the season has advanced to
   (currentPollWeek), NOT simply the newest poll in the file — a poll
   uploaded for a week we haven't advanced to yet stays hidden until
   the advance flips currentWeek. Earlier weeks stay in top25-data.js —
   they're needed to compute the arrows — but aren't browsable. */
function renderTop25() {
  const host = document.getElementById("top25-list");
  const label = document.getElementById("top25-week-label");
  if (!host) return;

  const week = currentPollWeek();
  if (week == null) {
    if (label) label.textContent = "NOT PUBLISHED YET";
    host.classList.add("is-empty");
    host.innerHTML =
      '<li class="poll-empty-msg">No Top 25 has been posted yet — check back after the first poll drops.</li>';
    return;
  }

  const poll = TOP25_DATA.find((p) => Number(p.week) === week);
  const teams = poll ? [...poll.teams].sort((a, b) => Number(a.rank) - Number(b.rank)) : [];

  if (label) label.textContent = `WEEK ${week}`;
  host.classList.remove("is-empty");
  host.innerHTML = teams.map((t) => top25RowHtml(t, week)).join("");
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
        ${/* THE WHOLE CARD OPENS THE MODAL, but the card can't BE a
             button: it contains the Twitch anchor, and a link inside a
             button is invalid HTML that browsers resolve
             unpredictably. So the card stays an <article> and gets a
             full-bleed button stretched behind its contents. The
             Twitch link is raised above it in style.css, so clicking
             "Watch" still goes to Twitch and clicking anywhere else
             opens the card.

             A real <button> rather than a click handler on the
             <article>: it is focusable, it is announced, and Enter and
             Space work, all without a keydown handler. */ ""}
        <button type="button" class="r-open" data-coach="${esc(personKey(c.name))}"
                aria-label="View ${esc(c.name)} career details"></button>
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

/* ============================================================
   COACH MODAL — the career card
   ------------------------------------------------------------
   Clicking a roster card opens a popup showing that coach's career
   against every other coach in the league: total record, points for
   and against, average margin, streak, trophies, and a row per
   opponent.

   CAREER, NOT SEASON. Every figure here spans every season the page
   has loaded (see CAREER above). That is the point of the card — a
   season card would be thin forever, and the dynasty is expected to
   run 8-10 years.

   ONLY H2H COUNTS. Points for/against, records, margins: all
   coach-vs-coach. CPU games never appear, which is consistent with
   the rest of the site but IS worth knowing before someone wonders
   why their 63-0 win over an FCS team isn't in the total.
   ============================================================ */

/* Two games is the floor for an AVERAGE. "Avg margin +13.0" off a
   single result states a typical performance inferred from a sample
   of one — true arithmetic, misleading claim.

   Counts get no floor, because they make no such claim. A record of
   1-0, a points total of 22, and a streak of W1 are each just a fact
   about what happened. Streak in particular was gated here at first
   and shouldn't have been: "W1" means "won their last game", which is
   exactly as sound after one game as after ten. */
const MIN_GAMES_FOR_AVERAGES = 2;

/* Computed on first open and kept. The whole career is derived from
   files already in memory, so this is fast, but it runs once per
   coach rather than once per render. */
let CAREER_CACHE = null;

function careerData() {
  if (CAREER_CACHE) return CAREER_CACHE;
  const ready = typeof WeekCore !== "undefined" && WeekCore.computeH2H;
  CAREER_CACHE = {
    h2h: ready ? WeekCore.computeH2H(CAREER, { coachAliases: PEOPLE_ALIASES }) : new Map(),
    achievements: ready
      ? WeekCore.computeAchievements(CAREER, { coachAliases: PEOPLE_ALIASES })
      : new Map(),
    ranks: new Map(),
  };
  if (ready) {
    const week = WeekCore.latestH2HWeek(RANKING_DATA);
    const rows =
      week != null
        ? WeekCore.computeRankings(CAREER, { ...RANKING_OPTS, throughWeek: week })
        : [];
    rows.forEach((r) => CAREER_CACHE.ranks.set(r.key, r));
  }
  return CAREER_CACHE;
}

/* Everything the card needs for one coach, or null if the handle
   doesn't resolve. */
function coachCareerFor(name) {
  const data = careerData();
  const key = personKey(name);
  const h2h = data.h2h.get(key);
  const rank = data.ranks.get(key) || null;
  const ach = data.achievements.get(key) || null;

  const meetings = h2h
    ? h2h.opponents.reduce((all, o) => all.concat(o.meetings), [])
    : [];
  const played = meetings.filter((m) => m.played);

  const pf = played.reduce((s, m) => s + m.pf, 0);
  const pa = played.reduce((s, m) => s + m.pa, 0);
  const enoughForAverages = played.length >= MIN_GAMES_FOR_AVERAGES;

  /* Streak walks the timeline newest-first and stops at the first
     result that breaks it. Meetings inside an opponent are already
     sorted newest-first, but ACROSS opponents they are not, so this
     re-sorts the flat list rather than trusting the grouping. */
  const chron = played
    .slice()
    .sort((a, b) => b.year - a.year || b.sortKey - a.sortKey);
  let streak = null;
  if (chron.length) {
    const win = chron[0].win;
    let n = 0;
    for (const m of chron) {
      if (m.win !== win) break;
      n++;
    }
    streak = { win, n, label: `${win ? "W" : "L"}${n}` };
  }

  const seasons = new Set(meetings.map((m) => m.year).filter((y) => y != null));

  return {
    key,
    name: h2h ? h2h.name : String(name),
    wins: h2h ? h2h.wins : 0,
    losses: h2h ? h2h.losses : 0,
    playedGames: played.length,
    pf,
    pa,
    avgMargin: enoughForAverages ? (pf - pa) / played.length : null,
    streak, // a count, shown from the first game — see the note above
    seasons: seasons.size || (CAREER.length ? 1 : 0),
    opponents: h2h ? h2h.opponents : [],
    rank,
    achievements: ach && ach.any ? ach : null,
  };
}

/* Next fixture for a coach — league or CPU, whichever comes first.
   Reads the schedule directly rather than the H2H data, because the
   next game is very often against a CPU team and H2H can't see
   those. */
function nextGameFor(coach) {
  const team = SCHEDULES.find((t) => rosterKeyFor(t.team) === rosterKeyFor(coach.team));
  if (!team) return null;
  const from = SEASON.currentWeek === "PRESEASON" ? 0 : Number(SEASON.currentWeek) || 0;
  const upcoming = (team.weeks || [])
    .filter((w) => Number(w.week) >= from && w.opponent && w.teamScore == null)
    .sort((a, b) => Number(a.week) - Number(b.week))[0];
  if (!upcoming) return null;
  return {
    week: Number(upcoming.week),
    opponent: upcoming.opponent,
    at: upcoming.location === "at",
    /* A departed coach's school is a CPU opponent by the time anyone
       is looking at an upcoming week, so it gets no coach name. */
    coach: isLeagueTeam(upcoming.opponent, Number(upcoming.week))
      ? coachFor(upcoming.opponent)
      : "",
  };
}

function achievementsHtml(a) {
  if (!a) return ""; // no trophies -> no row at all, not an empty one
  const chips = [];
  if (a.natTitles)
    chips.push(
      `<span class="cm-ach cm-ach-nat">${"&#9733;".repeat(Math.min(a.natTitles, 5))} ${
        a.natTitles
      } NATIONAL</span>`
    );
  if (a.confTitles)
    chips.push(
      `<span class="cm-ach cm-ach-conf">${"&#9733;".repeat(Math.min(a.confTitles, 5))} ${
        a.confTitles
      } CONFERENCE</span>`
    );
  if (a.cfpAppearances)
    chips.push(`<span class="cm-ach cm-ach-cfp">${a.cfpAppearances} CFP APPS</span>`);
  return `<div class="cm-achievements">${chips.join("")}</div>`;
}

/* A stat tile. `tone` colours the figure; null values render an em
   dash in muted text and the tile keeps its slot, so the grid never
   reflows between one coach and the next. */
function statTile(label, value, tone) {
  const empty = value == null || value === "";
  return `
    <div class="cm-stat">
      <span class="cm-stat-label">${esc(label)}</span>
      <span class="cm-stat-value${empty ? " is-empty" : tone ? " " + tone : ""}">${
        empty ? "&ndash;" : esc(value)
      }</span>
    </div>`;
}

function h2hRowHtml(o) {
  const last = o.meetings.find((m) => m.played);
  const next = o.meetings.filter((m) => !m.played).sort((a, b) => a.sortKey - b.sortKey)[0];

  /* A year is shown on anything that ISN'T from the season being
     played. "Wk 5" on its own reads as this season, so an old result
     without a year is actively misleading — and on a career card most
     rows eventually are old. Tying it to the current season rather
     than to "does this pairing have more than one meeting" keeps a
     single historic meeting labelled correctly too. */
  const thisYear = SEASON.year ?? null;
  const stamp = (m) =>
    m.year != null && thisYear != null && m.year !== thisYear
      ? ` &rsquo;${String(m.year).slice(-2)}`
      : "";

  let right = "";
  if (last) {
    const cls = last.win ? "win" : "loss";
    const when =
      last.phase === "postseason"
        ? `${esc(last.label)}${stamp(last)}`
        : `Wk ${last.week}${stamp(last)}`;
    right = `<span class="cm-res ${cls}">${last.win ? "W" : "L"} ${last.pf}&ndash;${
      last.pa
    }</span> <span class="cm-when">${when}</span>${
      last.sim ? ' <span class="cm-sim">SIM</span>' : ""
    }`;
  } else if (next) {
    right = `<span class="cm-when">Wk ${next.week}${stamp(next)} &middot; ${
      next.home ? "vs" : "at"
    }</span>`;
  }

  return `
    <li class="cm-row">
      ${teamMarkHtml(o.meetings[0] ? o.meetings[0].oppTeam : o.name, "sm")}
      <span class="cm-row-text">
        <span class="cm-row-team">${esc(o.meetings[0] ? o.meetings[0].oppTeam : "")}</span>
        <span class="cm-row-coach">${esc(o.name)}</span>
      </span>
      <span class="cm-rec${o.played ? "" : " is-empty"}">${o.wins}&ndash;${o.losses}</span>
      <span class="cm-row-right">${right}</span>
    </li>`;
}

function coachModalHtml(coach) {
  const c = coachCareerFor(coach.name);
  const url = safeUrl(coach.twitch);
  const live = isLive(coach);
  const next = nextGameFor(coach);
  const margin =
    c.avgMargin == null
      ? null
      : `${c.avgMargin > 0 ? "+" : ""}${c.avgMargin.toFixed(1)}`;

  const rows = c.opponents.length
    ? c.opponents.map(h2hRowHtml).join("")
    : `<li class="cm-empty">No head-to-head matchups, played or scheduled &mdash; ${esc(
        coach.team
      )} plays a full CPU slate.</li>`;

  return `
    <div class="cm-head">
      ${teamMarkHtml(coach.team, "lg")}
      <div class="cm-id">
        <h2 class="cm-team" id="cm-title">${esc(coach.team)}</h2>
        <p class="cm-coach">${esc(coach.name)}</p>
      </div>
      <div class="cm-head-meta">
        ${coach.conference ? `<span class="r-conf">${esc(coach.conference)}</span>` : ""}
        ${live ? `<span class="live-badge"><span class="live-dot"></span>LIVE</span>` : ""}
        <button type="button" class="cm-close" aria-label="Close">&times;</button>
      </div>
    </div>
    ${achievementsHtml(c.achievements)}
    <div class="cm-stats">
      ${statTile("Career H2H", `${c.wins}-${c.losses}`)}
      ${statTile("Power rank", c.rank ? `#${c.rank.rank}` : null, "gold")}
      ${statTile("Avg margin", margin, c.avgMargin > 0 ? "win" : c.avgMargin < 0 ? "loss" : "")}
      ${statTile("Streak", c.streak ? c.streak.label : null, c.streak && c.streak.win ? "win" : "loss")}
      ${statTile("Total PF", c.playedGames ? c.pf.toLocaleString() : null)}
      ${statTile("Total PA", c.playedGames ? c.pa.toLocaleString() : null)}
      ${statTile("L5", c.rank ? c.rank.l5 : null)}
      ${statTile("Seasons", c.seasons || null)}
    </div>
    <h3 class="cm-section">Head-to-head</h3>
    <ul class="cm-list">${rows}</ul>
    <div class="cm-foot">
      <span class="cm-next">${
        next
          ? `Next: ${next.at ? "at" : "vs"} ${esc(next.opponent)}${
              next.coach ? ` (${esc(next.coach)})` : " (CPU)"
            } &mdash; Week ${next.week}`
          : "No games remaining"
      }</span>
      ${
        url
          ? /* Same .twitch-link the roster cards use — one button, one
               rule. It briefly had its own .cm-twitch style here, which
               was a quieter text link; two treatments of the same
               action is exactly the drift worth avoiding. The card-only
               layout bits live under `.roster-card .twitch-link`, so
               nothing leaks in the other direction. */
            `<a class="twitch-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Watch on Twitch &rarr;</a>`
          : ""
      }
    </div>`;
}

/* The element that had focus when the modal opened, so it can be
   given back on close. <dialog> restores focus itself, but the roster
   re-renders on every live-status refresh, so the original node may
   no longer be in the document by then — this re-finds it by key. */
let MODAL_OPENER_KEY = null;

function openCoachModal(key, { updateHash = true } = {}) {
  const dlg = document.getElementById("coach-modal");
  const body = document.getElementById("coach-modal-body");
  if (!dlg || !body) return;

  const coach = ROSTER.find((c) => personKey(c.name) === key);
  if (!coach) return;

  const color = safeHex(coach.color);
  dlg.style.setProperty("--team", color || "var(--gold)");
  body.innerHTML = coachModalHtml(coach);
  MODAL_OPENER_KEY = key;

  if (!dlg.open) dlg.showModal();
  if (updateHash) history.replaceState(null, "", `#roster/coach/${key}`);
}

function closeCoachModal() {
  const dlg = document.getElementById("coach-modal");
  if (dlg && dlg.open) dlg.close();
}

function setupCoachModal() {
  const dlg = document.getElementById("coach-modal");
  if (!dlg) return;

  /* Delegated, because renderRoster() replaces every card whenever
     live status refreshes — a listener bound to a card would be
     thrown away with it. */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest(".r-open");
    if (btn) openCoachModal(btn.dataset.coach);
  });

  dlg.addEventListener("click", (e) => {
    /* A click on the backdrop registers as a click on the dialog
       itself, never on its contents — which is why the body sits in a
       wrapper div. Without the wrapper every click would close it. */
    if (e.target === dlg) closeCoachModal();
    if (e.target.closest && e.target.closest(".cm-close")) closeCoachModal();
  });

  dlg.addEventListener("close", () => {
    if (location.hash.indexOf("#roster/coach/") === 0) {
      history.replaceState(null, "", "#roster");
    }
    /* Found by scanning rather than by building a selector: a coach
       handle is arbitrary text, and interpolating it into a selector
       would need CSS.escape — which throws if the key contains a
       quote and doesn't exist at all in some environments. A failure
       here would abort the rest of this handler and strand the hash,
       so it uses no selector parsing. */
    let back = null;
    if (MODAL_OPENER_KEY) {
      document.querySelectorAll(".r-open").forEach((b) => {
        if (b.dataset.coach === MODAL_OPENER_KEY) back = b;
      });
    }
    if (back) back.focus();
    MODAL_OPENER_KEY = null;
  });
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
        <span class="wg-team${awayWon ? " won" : g.played ? " lost" : ""}">${rankBadgeHtml(g.away, badgeWeekFor(g.played, week))}${esc(g.away)}</span>
        ${g.played ? `<span class="wg-score${awayWon ? " won" : " lost"}">${esc(g.awayScore)}</span>` : ""}
        <span class="wg-at">&#64;</span>
        <span class="wg-team${homeWon ? " won" : g.played ? " lost" : ""}">${rankBadgeHtml(g.home, badgeWeekFor(g.played, week))}${esc(g.home)}</span>
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

      /* As of THIS week — a coach who left after week 4 was a real
         opponent in weeks 0-4 and is CPU from week 5 on, so the rows
         above and below the departure read differently on purpose. */
      const isLeague = isLeagueTeam(w.opponent, Number(w.week));
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
            <span class="tsr-opp-name">${rankBadgeHtml(w.opponent, badgeWeekFor(played, w.week))}${esc(w.opponent)}</span>
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
        <span class="team-sched-name">${rankBadgeHtml(team.team, currentPollWeek())}${esc(team.team)}</span>
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

  /* Under prefers-reduced-motion the CSS turns the band into a real
     horizontal scroll container instead of a loop. A scroll container
     showing the two identical halves the -50% animation needs would
     read as the news repeating itself, so in that mode we render one
     copy, skip the fill-the-viewport padding, and leave the duration
     alone — there's no animation to time. */
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    /* A scroll container with no focusable children isn't reachable
       by keyboard in every engine, so the band itself becomes a stop.

       The markup carries aria-hidden because the looping track is the
       same content twice and every fact in it is already on the page
       below. Neither is true here — this is a single copy and it is
       the only way a keyboard user reaches it — and a focusable
       descendant of an aria-hidden node is a violation besides. So
       the hint comes off in exactly this mode. */
    const band = track.parentElement;
    if (band) {
      band.removeAttribute("aria-hidden");
      band.tabIndex = 0;
      band.setAttribute("role", "region");
      band.setAttribute("aria-label", "League ticker");
    }
    return;
  }

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
      /* Vacation Tracker. Same on every league, so it's a literal
         here rather than per-league data. */
      { label: "Vacation Tracker", url: "https://forms.gle/DSGCUREcdYovX6pi9" },
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
const TABS = ["home", "schedule", "rankings", "top25", "roster"];

/* ------------------------------------------------------------
   TABS THAT ONLY EXIST FOR SOME LEAGUES
   ------------------------------------------------------------
   All three leagues share this file and ship the same index.html
   skeleton, so the Top 25 tab is present in the markup everywhere —
   including in leagues that have never transcribed a poll. Rather
   than maintain a fourth variant of the page, the tab removes itself
   when there's nothing behind it.

   Removed, not disabled or emptied. A visible tab that says "nothing
   here yet" reads as a broken feature; an absent one reads as a
   feature this league doesn't run, which is the truth. The moment a
   first week is added to that league's top25-data.js the tab comes
   back on its own, with no markup change.

   Pruning TABS as well as the DOM matters: it's what makes a stale
   "#top25" link fall back to Home instead of selecting a tab that
   isn't there.
   ------------------------------------------------------------ */
function pruneEmptyTabs() {
  if (TOP25_DATA.length) return;

  document.querySelector('.tab-btn[data-tab="top25"]')?.remove();
  document.getElementById("top25")?.remove();

  const i = TABS.indexOf("top25");
  if (i !== -1) TABS.splice(i, 1);
}

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
  /* Before anything binds a listener or reads the hash — otherwise a
     "#top25" arrival would select a tab we're about to delete. */
  pruneEmptyTabs();

  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      if (location.hash.slice(1) === target) showTab(target);
      else location.hash = target; // hashchange listener finishes the job
    });
  });

  /* The hash carries two things now: the tab, and optionally a coach
     to open the modal on — "#roster/coach/projekt". showTab only ever
     sees the first segment, so a deep link still selects the right tab
     and an ordinary "#roster" is unaffected.

     Splitting here rather than teaching showTab about coaches keeps
     the tab system ignorant of the modal, which is the only reason
     both can be read at a glance. */
  const routeFromHash = (opts) => {
    const [tab, kind, key] = location.hash.slice(1).split("/");
    showTab(tab, opts);
    if (kind === "coach" && key) openCoachModal(decodeURIComponent(key), { updateHash: false });
    else closeCoachModal();
  };

  window.addEventListener("hashchange", () => routeFromHash());
  routeFromHash({ scroll: false });
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
  renderRankings();
  renderTop25();
  renderRoster();
  renderLiveNow();
  initLiveStatus();
  initSchedule();
  renderTicker();
  renderFooter();
  /* Before setupTabs — it reads the hash on load and may need to open
     the modal, which requires the listeners to already be attached. */
  setupCoachModal();
  setupTabs();
}

init();
