/* ============================================================
   WEEK CORE — shared matchup logic
   ------------------------------------------------------------
   The one copy of "given the data files and a week number, what
   games are there, and what does scoring one imply?"

   WHY THIS FILE EXISTS AT THE ROOT

   It used to live entirely in tools/lib/league.js, which was fine
   while the only things asking the question were advance.js and
   scores.js — both Node. The admin page asks the same question
   from a browser. Reimplementing it there would have put the
   roster-matching rules in a third place, and the comment at the
   top of lib/league.js is explicit about why that's the failure
   mode to avoid: when it lived in two places, the risk was Discord
   and the site quietly describing the same game differently.

   So the pure logic moved here — no fs, no vm, no path, nothing
   Node-only — and both sides consume it:

     Node     const { buildWeek } = require("../week-core");
     Browser  <script src="../week-core.js"></script>  ->  WeekCore

   tools/lib/league.js re-exports everything below, so advance.js
   and scores.js did not change and don't need to know this moved.

   WHAT STAYED IN lib/league.js
   Anything that touches the disk or the process: resolveLeague,
   loadData, parseArgs, die, loadConfig. Those are Node-only by
   nature and the browser has no use for them.
   ============================================================ */

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WeekCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ------------------------------------------------------------
     NAME RESOLUTION — mirrors script.js exactly
     ------------------------------------------------------------
     A coach's `team` may carry alternates separated by "/", and
     schedule-data.js uses the in-game spelling, which the ALIASES
     table maps back onto the roster name. Both have to resolve to
     the same key or a game shows up as CPU when it's really H2H.
     ------------------------------------------------------------ */
  function makeResolver(data) {
    const COACHES = data.COACHES || [];
    const ALIASES = data.ALIASES || {};

    const normalize = (s) => String(s ?? "").trim().toLowerCase();

    const rosterKeys = new Set();
    COACHES.forEach((c) => {
      String(c.team)
        .split("/")
        .forEach((part) => {
          const k = normalize(part);
          if (k) rosterKeys.add(k);
        });
    });

    const rosterKeyFor = (scheduleName) => {
      const aliased = ALIASES[scheduleName];
      return aliased ? normalize(aliased) : normalize(scheduleName);
    };

    const isLeagueTeam = (n) => rosterKeys.has(rosterKeyFor(n));

    const entryFor = (n) => {
      const key = rosterKeyFor(n);
      return COACHES.find((c) =>
        String(c.team).split("/").some((part) => normalize(part) === key)
      );
    };

    const coachFor = (n) => (entryFor(n) || {}).name || "";

    /* Schedule-file team name for a name typed by a human.
       TEAM_SCHEDULES is keyed by the in-game name, but a
       commissioner typing fast will use whatever the roster calls
       it, so both have to resolve to the same entry. */
    const scheduleTeamFor = (input, TEAM_SCHEDULES) => {
      const key = rosterKeyFor(input);
      const list = TEAM_SCHEDULES || [];
      const direct = list.find((t) => normalize(t.team) === normalize(input));
      if (direct) return direct.team;
      const viaRoster = list.find((t) => rosterKeyFor(t.team) === key);
      return viaRoster ? viaRoster.team : null;
    };

    return { normalize, rosterKeyFor, isLeagueTeam, entryFor, coachFor, scheduleTeamFor };
  }

  /* ------------------------------------------------------------
     BUILD THE WEEK
     ------------------------------------------------------------
     An H2H (user vs user) game lives in BOTH coaches' schedules,
     so it has to be deduped down to one matchup. A CPU game only
     ever appears once, under the coach playing it.
     ------------------------------------------------------------ */
  function buildWeek(data, week) {
    const R = makeResolver(data);
    const league = new Map(); // pairKey -> matchup
    const cpu = [];
    const notes = []; // byes, Army-Navy, championship weeks
    const missing = []; // coaches with no entry for this week at all

    (data.TEAM_SCHEDULES || []).forEach((t) => {
      const entry = (t.weeks || []).find((w) => Number(w.week) === week);

      if (!entry) {
        missing.push(t.team);
        return;
      }

      if (entry.note || !entry.opponent) {
        notes.push({
          team: t.team,
          coach: R.coachFor(t.team),
          note: entry.note || "No game listed",
        });
        return;
      }

      const home = entry.location === "at" ? entry.opponent : t.team;
      const away = entry.location === "at" ? t.team : entry.opponent;

      if (R.isLeagueTeam(entry.opponent)) {
        const pairKey = [R.rosterKeyFor(t.team), R.rosterKeyFor(entry.opponent)]
          .sort()
          .join("::");
        if (!league.has(pairKey)) {
          league.set(pairKey, {
            home,
            away,
            homeCoach: R.coachFor(home),
            awayCoach: R.coachFor(away),
            stadium: entry.stadium || "",
            /* Scores are stored per-team, so the writer needs to
               know which schedule entry each half lives in. */
            teams: [t.team, entry.opponent],
            scored:
              entry.teamScore != null && entry.opponentScore != null
                ? entry.location === "at"
                  ? { home: entry.opponentScore, away: entry.teamScore }
                  : { home: entry.teamScore, away: entry.opponentScore }
                : null,
          });
        }
      } else {
        cpu.push({
          team: t.team,
          coach: R.coachFor(t.team),
          opponent: entry.opponent,
          location: entry.location,
          stadium: entry.stadium || "",
          teams: [t.team],
          scored:
            entry.teamScore != null && entry.opponentScore != null
              ? { team: entry.teamScore, opponent: entry.opponentScore }
              : null,
        });
      }
    });

    cpu.sort((a, b) => a.coach.localeCompare(b.coach));
    notes.sort((a, b) => a.coach.localeCompare(b.coach));

    return { league: [...league.values()], cpu, notes, missing };
  }

  /* ------------------------------------------------------------
     WEEK LABEL — matches the site's own naming
     ------------------------------------------------------------
     Kept in the parenthesised form the Discord announcements have
     always used. The site's own picker renders "Week 14 · Army-Navy"
     with a middot; that's a display choice local to the page and is
     deliberately not unified here, because changing this string
     would change every future Discord post.
     ------------------------------------------------------------ */
  function weekLabel(week) {
    if (week === 14) return "Week 14 (Army-Navy)";
    if (week === 15) return "Week 15 (Championships)";
    return `Week ${week}`;
  }

  /* ------------------------------------------------------------
     SCORE PARSING
     ------------------------------------------------------------
     Accepts 27-24, 27 24, 27:24. Returns either {team, opponent},
     or {error} for something that parsed but can't be a real
     result, or null for something unreadable.
     ------------------------------------------------------------ */
  function parseScore(input) {
    const m = String(input == null ? "" : input)
      .trim()
      .match(/^(\d{1,3})\s*[-:\s]\s*(\d{1,3})$/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = Number(m[2]);
    /* Ties don't exist in college football — overtime settles every
       game — so an equal score is a typo every time, not a result. */
    if (a === b) return { error: "that's a tie; college games can't end tied" };
    if (a > 200 || b > 200) return { error: "score over 200 — check the digits" };
    return { team: a, opponent: b };
  }

  /* ------------------------------------------------------------
     GAME LIST FOR A WEEK
     ------------------------------------------------------------
     One flat list of everything scoreable, H2H and CPU alike, in
     the order a commissioner reads a results screen. The admin
     page renders straight from this, which is what guarantees the
     rows on screen are the same games scores.js will accept.
     ------------------------------------------------------------ */
  function scoreableGames(wk) {
    const games = [];

    wk.league.forEach((m) => {
      games.push({
        kind: "h2h",
        label: `${m.away} at ${m.home}`,
        subtitle: [m.awayCoach, m.homeCoach].filter(Boolean).join("  vs  "),
        /* Prompt from the away team's perspective — that's the order
           a scoreboard reads, "away at home". */
        perspective: m.away,
        other: m.home,
        teams: m.teams,
        scored: m.scored ? `${m.away} ${m.scored.away}-${m.scored.home} ${m.home}` : null,
        scoredPair: m.scored ? { team: m.scored.away, opponent: m.scored.home } : null,
      });
    });

    wk.cpu.forEach((g) => {
      games.push({
        kind: "cpu",
        label: `${g.team} ${g.location === "at" ? "at" : "vs"} ${g.opponent}`,
        subtitle: g.coach ? `${g.coach} (CPU opponent)` : "CPU opponent",
        perspective: g.team,
        other: g.opponent,
        teams: [g.team],
        scored: g.scored ? `${g.team} ${g.scored.team}-${g.scored.opponent}` : null,
        scoredPair: g.scored ? { team: g.scored.team, opponent: g.scored.opponent } : null,
      });
    });

    return games;
  }

  /* Turn one answered game into the one or two file edits it
     implies. H2H games write both sides, mirrored — the entire
     reason scores.js exists. */
  function editsFor(game, week, score, data) {
    const R = makeResolver(data);
    const out = [
      { team: game.perspective, week, teamScore: score.team, opponentScore: score.opponent },
    ];

    if (game.kind === "h2h") {
      const otherName = R.scheduleTeamFor(game.other, data.TEAM_SCHEDULES) || game.other;
      out.push({
        team: otherName,
        week,
        teamScore: score.opponent,
        opponentScore: score.team,
      });
    }

    return out;
  }

  return {
    makeResolver,
    buildWeek,
    weekLabel,
    parseScore,
    scoreableGames,
    editsFor,
  };
});
