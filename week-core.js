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
            /* A force-sim / forfeit is still a real result (it counts
               toward records), but it wasn't a genuine coach-vs-coach
               game, so the power rankings exclude it. The flag lives on
               the schedule entry; either side carrying it marks the
               matchup, so it's OR'd in when the second side is seen. */
            sim: entry.sim === true,
          });
        } else if (entry.sim === true) {
          league.get(pairKey).sim = true;
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
        /* Whether this finished game was a force-sim / forfeit. Only
           meaningful for H2H games (CPU games never enter the poll),
           and only set once a result exists. Lets the admin page
           pre-check the "Force sim" box when re-opening a game. */
        sim: m.sim === true,
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
  function editsFor(game, week, score, data, sim) {
    const R = makeResolver(data);

    /* sim is threaded through only when the caller actually has an
       opinion. Left undefined (the CLI's default path), the flag is
       simply absent from the edit and the writer leaves whatever the
       file already says untouched — so scoring a game from the
       command line never silently clears a force-sim mark. */
    const withSim = (edit) => {
      if (sim !== undefined) edit.sim = sim === true;
      return edit;
    };

    const out = [
      withSim({ team: game.perspective, week, teamScore: score.team, opponentScore: score.opponent }),
    ];

    if (game.kind === "h2h") {
      const otherName = R.scheduleTeamFor(game.other, data.TEAM_SCHEDULES) || game.other;
      out.push(
        withSim({ team: otherName, week, teamScore: score.opponent, opponentScore: score.team })
      );
    }

    return out;
  }

  /* ------------------------------------------------------------
     POWER RANKINGS
     ------------------------------------------------------------
     Ranks coaches by the quality of their COACH-VS-COACH games.
     CPU games never count (the site has always said the poll is
     league games only), and force-sims / forfeits are excluded too
     — they still show up in a team's win-loss record, but a game
     nobody actually played can't say anything about how good a
     coach is, so it's kept out of the score.

     Ported from the original Google-Form power-ranking math. Two
     inputs from that version don't exist on this site and are
     adapted here:

       - Strength of schedule. The form asked the submitter for each
         opponent's AP rank at kickoff; nothing here records that. So
         SoS is derived instead from how each opponent has actually
         done in league play (their H2H win %). Beating teams that
         win a lot is worth more than beating teams that don't.

       - Road/neutral wins. The schedule only knows home vs away, so
         a road win is simply the away coach winning. There's no
         neutral-site flag to reward separately.

     Everything is tunable through RANKING_CONFIG (see below). A
     league can override any weight by defining a RANKING_CONFIG
     object in its league-data.js; nothing here needs editing to
     retune the poll.
     ------------------------------------------------------------ */
  const DEFAULT_RANKING_CONFIG = {
    weights: {
      winPct: 50, // full weight of a perfect record
      avgMargin: 1.5, // per point of (capped) average margin
      strengthOfSchedule: 30, // scales the opponent-quality swing
      roadWinBonus: 3, // per away win
    },
    // Neutral opponent quality: a team whose opponents are exactly
    // .500 gets no SoS adjustment either way.
    sosBaseline: 0.5,
    // Blowouts past this many points stop adding scoring value, so a
    // 70-0 isn't worth three times a 21-0.
    maxMarginPerGame: 21,
    // Only the most recent N *played* H2H games per team feed the
    // score. 0 / null uses full history.
    gamesWindow: 10,
  };

  function clampMargin(margin, cap) {
    return Math.max(-cap, Math.min(cap, margin));
  }

  /* The latest week that has at least one played (non-sim) H2H
     result. This is the week the live poll represents; the previous
     week's poll (for the up/down arrows) is this minus one. Returns
     null when no coach-vs-coach game has been played yet. */
  function latestH2HWeek(data) {
    let latest = null;
    for (let week = 0; week <= 15; week++) {
      const wk = buildWeek(data, week);
      if (wk.league.some((m) => m.scored && !m.sim)) latest = week;
    }
    return latest;
  }

  function computeRankings(data, opts) {
    opts = opts || {};
    const R = makeResolver(data);
    const cfg = Object.assign({}, DEFAULT_RANKING_CONFIG, opts.config || {});
    const W = Object.assign(
      {},
      DEFAULT_RANKING_CONFIG.weights,
      (opts.config && opts.config.weights) || {}
    );
    const window = cfg.gamesWindow;
    const cap = cfg.maxMarginPerGame;
    const throughWeek = opts.throughWeek == null ? 15 : opts.throughWeek;

    // rosterKey -> aggregate for one coach's team.
    const teams = new Map();
    const ensure = (name) => {
      const key = R.rosterKeyFor(name);
      if (!teams.has(key)) {
        const entry = R.entryFor(name);
        teams.set(key, {
          key,
          team: (entry && entry.team) || name,
          coach: R.coachFor(name),
          h2h: [], // played (non-sim) coach-vs-coach games
          overallW: 0, // record shown to users — includes sims AND cpu
          overallL: 0,
        });
      }
      return teams.get(key);
    };

    for (let week = 0; week <= throughWeek; week++) {
      const wk = buildWeek(data, week);

      wk.league.forEach((m) => {
        if (!m.scored) return;
        const hs = m.scored.home;
        const as = m.scored.away;
        const home = ensure(m.home);
        const away = ensure(m.away);

        // Record counts every finished game, simmed or not.
        if (hs > as) {
          home.overallW++;
          away.overallL++;
        } else {
          away.overallW++;
          home.overallL++;
        }

        // Scoring log skips sims.
        if (m.sim) return;
        home.h2h.push({ pf: hs, pa: as, win: hs > as, oppKey: away.key, roadWin: false, week });
        away.h2h.push({ pf: as, pa: hs, win: as > hs, oppKey: home.key, roadWin: as > hs, week });
      });

      // CPU results only touch the visible record, never the poll.
      wk.cpu.forEach((g) => {
        if (!g.scored) return;
        const t = ensure(g.team);
        if (g.scored.team > g.scored.opponent) t.overallW++;
        else t.overallL++;
      });
    }

    // Each team's league win% over ALL its played H2H games — this is
    // the opponent-quality figure SoS reads, so it's computed before
    // any windowing.
    teams.forEach((t) => {
      const w = t.h2h.filter((g) => g.win).length;
      t.h2hW = w;
      t.h2hL = t.h2h.length - w;
      t.leagueWinPct = t.h2h.length ? w / t.h2h.length : cfg.sosBaseline;
    });

    const ranked = [];
    teams.forEach((t) => {
      let games = t.h2h.slice().sort((a, b) => b.week - a.week);
      if (window) games = games.slice(0, window);

      const n = games.length;
      if (!n) return; // no played H2H games -> can't be ranked yet

      const wins = games.filter((g) => g.win).length;
      const winPct = wins / n;
      const avgMargin =
        games.reduce((s, g) => s + clampMargin(g.pf - g.pa, cap), 0) / n;
      const avgOppWinPct =
        games.reduce(
          (s, g) => s + (teams.has(g.oppKey) ? teams.get(g.oppKey).leagueWinPct : cfg.sosBaseline),
          0
        ) / n;
      const roadWins = games.filter((g) => g.roadWin).length;

      const sosBonus = (avgOppWinPct - cfg.sosBaseline) * W.strengthOfSchedule;
      const powerScore =
        winPct * W.winPct + avgMargin * W.avgMargin + sosBonus + roadWins * W.roadWinBonus;

      ranked.push({
        key: t.key,
        team: t.team,
        coach: t.coach,
        powerScore,
        playedGames: n,
        h2hWins: t.h2hW,
        h2hLosses: t.h2hL,
        overallWins: t.overallW,
        overallLosses: t.overallL,
        record: `${t.overallW}-${t.overallL}`,
      });
    });

    ranked.sort((a, b) => b.powerScore - a.powerScore || a.team.localeCompare(b.team));
    ranked.forEach((r, i) => (r.rank = i + 1));
    return ranked;
  }

  return {
    makeResolver,
    buildWeek,
    weekLabel,
    parseScore,
    scoreableGames,
    editsFor,
    computeRankings,
    latestH2HWeek,
    DEFAULT_RANKING_CONFIG,
  };
});
