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
    const ALL_COACHES = data.COACHES || [];
    const ALIASES = data.ALIASES || {};

    const normalize = (s) => String(s ?? "").trim().toLowerCase();

    /* ----------------------------------------------------------
       DEPARTURES — two flavours, one comparison.

       `active: false` is a coach on the books but not playing (left
       for another dynasty, may return) with no played games worth
       keeping. They are absent from the league everywhere something
       is derived: their team stops being a coach-vs-coach team, their
       games fall back to CPU, and their own schedule block is skipped
       in buildWeek.

       `departedAfterWeek: N` is a coach who left PART WAY THROUGH a
       season they had already played games in. Weeks 0..N are history
       and must stay head-to-head — those games happened, and the
       opponent's record and power-poll window depend on them. From
       week N+1 the team behaves exactly like an `active: false` team.

       Both collapse to one number: the last week this team counts as
       a league team. `active: false` is -1 ("no week qualifies"), an
       ordinary coach is Infinity. Every question below is then a
       single comparison and `active: false` needs no special case.

       Whether a coach gets a POWER POLL ROW is a different question,
       answered by the current roster in computeRankings — see the
       note there. A departed coach keeps their games forever and
       loses their row; the two are deliberately not the same switch.

       All the data stays in the file either way. Remove the flag to
       bring a coach back exactly as they were.
       ---------------------------------------------------------- */
    const departureWeek = (c) => {
      if (c.active === false) return -1;
      if (c.departedAfterWeek != null) return Number(c.departedAfterWeek);
      return Infinity;
    };

    /* Team key -> last week that team is a league team. A coach whose
       `team` carries slash alternates contributes every one of them.
       On a collision the later cutoff wins, so a team handed from a
       departing coach to an active one stays live. */
    const teamCutoff = new Map();
    ALL_COACHES.forEach((c) => {
      const until = departureWeek(c);
      String(c.team)
        .split("/")
        .forEach((part) => {
          const k = normalize(part);
          if (!k) return;
          const prev = teamCutoff.has(k) ? teamCutoff.get(k) : -Infinity;
          teamCutoff.set(k, Math.max(prev, until));
        });
    });

    /* A departed coach must still resolve to a roster entry, or their
       already-played weeks render with an empty coach name — the exact
       failure documented in docs/coach-modal-spec.md section 10. An
       `active: false` coach has no games to attribute and stays
       unresolvable, which is the behaviour that shipped. */
    const RESOLVABLE = ALL_COACHES.filter((c) => c.active !== false);

    const rosterKeyFor = (scheduleName) => {
      const aliased = ALIASES[scheduleName];
      return aliased ? normalize(aliased) : normalize(scheduleName);
    };

    /* `week` defaults to "now". A caller asking about the league as it
       stands today (a roster grid, a dropdown, the postseason) passes
       nothing and gets the current answer; a caller rendering or
       scoring a specific week passes it and gets the answer that was
       true at the time. Infinity is later than every cutoff, so the
       default reads as "after all departures have happened".

       A team no coach has ever claimed isn't in the map at all, so it
       is neither a league team nor an inactive one — a plain CPU
       opponent, as before. */
    const isLeagueTeam = (n, week) => {
      const until = teamCutoff.get(rosterKeyFor(n));
      return until !== undefined && (week === undefined ? Infinity : week) <= until;
    };
    const isInactiveTeam = (n, week) => {
      const until = teamCutoff.get(rosterKeyFor(n));
      return until !== undefined && (week === undefined ? Infinity : week) > until;
    };

    const entryFor = (n) => {
      const key = rosterKeyFor(n);
      return RESOLVABLE.find((c) =>
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

    return {
      normalize,
      rosterKeyFor,
      isLeagueTeam,
      isInactiveTeam,
      entryFor,
      coachFor,
      scheduleTeamFor,
    };
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
      /* Skip a departed coach's own schedule block — their games still
         appear (as CPU) on the schedules of whoever they played, so
         leaving their block in would double-list those matchups and
         resurrect a By-Team page they no longer have.

         Week-scoped: a coach who left after week 4 still owns weeks
         0-4, and those weeks must keep producing league matchups or
         the results vanish from their opponents' records. */
      if (R.isInactiveTeam(t.team, week)) return;

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

      if (R.isLeagueTeam(entry.opponent, week)) {
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
     league games only). Force-sims / forfeits are kept out of the
     SCORE — a game nobody actually played says nothing about how
     good a coach is — but they still count in the win-loss RECORD.

     The record shown next to each team is that head-to-head record
     within this dynasty: wins and losses against other coaches only.
     CPU results never appear in it, so a coach who beats their one
     league opponent reads 1-0 here even if they've also piled up
     wins against the computer.

     Ported from the original Google-Form power-ranking math:

       - Strength of schedule. Reward beating higher-ranked teams,
         using each opponent's in-game AP Top 25 rank in the week the
         game was played (data.TOP25, transcribed per week). Unranked
         opponents count as rank 26. If no poll has been entered for a
         game's week yet, that opponent is treated as unranked, so SoS
         simply contributes nothing until the poll is filled in.

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
      strengthOfSchedule: 1.5, // per rank of average opponent quality
      roadWinBonus: 3, // per away win
    },
    // Rank assigned to an opponent outside the Top 25 (or one whose
    // week has no poll yet). Matches the original .gs sheet: the SoS
    // bonus is (unrankedRank - avgOppRank) * weight, so beating
    // ranked teams pays and losing SoS credit for cupcakes is zero.
    unrankedRank: 26,
    // Blowouts past this many points stop adding scoring value, so a
    // 70-0 isn't worth three times a 21-0.
    maxMarginPerGame: 21,
    // Only the most recent N *played* H2H games per team feed the
    // score. 0 / null uses full history.
    gamesWindow: 5,
  };

  function clampMargin(margin, cap) {
    return Math.max(-cap, Math.min(cap, margin));
  }

  /* The latest week that has any scored coach-vs-coach result —
     simmed ones included, because they still move the win-loss
     record and so belong inside the poll's range. This is the week
     the live poll represents; the previous week's poll (for the
     up/down arrows) is this minus one. Returns null when no
     coach-vs-coach game has been recorded yet.

     Note this can be non-null while the poll itself is still empty:
     if every H2H game so far was a sim, there's a record to show but
     nothing scoreable yet, and computeRankings returns no rows. */
  function latestH2HWeek(data) {
    let latest = null;
    for (let week = 0; week <= 15; week++) {
      const wk = buildWeek(data, week);
      if (wk.league.some((m) => m.scored)) latest = week;
    }
    return latest;
  }

  /* ============================================================
     POWER RANKINGS — a rolling window that spans seasons
     ------------------------------------------------------------
     THE ENTITY IS THE COACH, NOT THE TEAM.

     The poll ranks the last N head-to-head games a COACH has played,
     regardless of which in-game year they happened in or which school
     the coach was at when they played them. A coach who takes over a
     new program carries their window with them; the row shows their
     CURRENT team, and the games behind the number may have been won
     somewhere else.

     That is a deliberate answer to a real question. This dynasty runs
     8-10 seasons per league, so a strict per-season poll would reset
     every autumn and spend the first month of each year ranking
     nobody. A window that follows the person is live all the time.

     It does mean the poll is not a pure team ranking, and the row for
     a coach who has just moved will look surprising for about ten
     games. The alternative — resetting on a move — breaks the window
     exactly when a coach is most interesting to look at.

     WHAT COUNTS

       window     the last cfg.gamesWindow PLAYED, NON-SIM
                  coach-vs-coach games, ordered across seasons.
                  0 / null means "whole career".
       record     career H2H, sims included. It is the coach's total
                  against other humans, ever.
       season     the same for the most recent season only, so the UI
                  can show "this year" beside the career number.
       CPU games  never counted, in any of the above.

     SEASON INPUT. Takes the same shape computeH2H does: one season's
     data object, or an array of them oldest-first. A single object is
     treated as a one-season career, which is what every caller passed
     before this became season-aware, so old calls keep working.
     ============================================================ */

  /* Rank an opponent for strength-of-schedule.

     REGULAR SEASON: the AP poll for the week the game was played, in
     the season it was played. Frozen history — the same rule the "#N"
     badges on schedules use, so the poll and the badges can never
     disagree about how good someone was at the time.

     POSTSEASON: there is no week, so there is no weekly poll to read.
     Postseason opponents are by definition strong, and scoring a
     national championship win as if it were against an unranked
     cupcake would be actively wrong — it would make winning the title
     lower a coach's rating. So a season may carry a CFP_POLL, which
     is what the in-game playoff rankings become once they are
     released:

       const CFP_POLL = { teams: [ { rank: 1, team: "Georgia" }, ... ] };

     or, if the in-game rankings are transcribed weekly as they update,
     an array — the last entry wins, because that is the bracket the
     postseason was actually seeded from:

       const CFP_POLL = [ { week: 12, teams: [...] },
                          { week: 14, teams: [...] } ];

     FALLBACK ORDER when a postseason game needs a rank:
       1. CFP_POLL for that season
       2. that season's LAST available AP week — better than nothing,
          and it is the most recent measurement that exists
       3. cfg.unrankedRank

     No league has a CFP_POLL today. Step 2 is what runs, and it is
     the reason a missing file degrades quietly instead of punishing
     playoff teams. */
  function makePollLookup(data, R, cfg) {
    const byWeek = new Map();
    (data.TOP25 || []).forEach((p) => {
      const m = new Map();
      (p.teams || []).forEach((t) => {
        const k = R.rosterKeyFor(t.team);
        if (k) m.set(k, Number(t.rank));
      });
      byWeek.set(Number(p.week), m);
    });

    const lastApWeek = byWeek.size ? Math.max(...byWeek.keys()) : null;

    // CFP_POLL: accept a single poll object or a list of them.
    let cfp = null;
    const raw = data.CFP_POLL;
    if (raw) {
      const chosen = Array.isArray(raw) ? raw[raw.length - 1] : raw;
      if (chosen && Array.isArray(chosen.teams)) {
        cfp = new Map();
        chosen.teams.forEach((t) => {
          const k = R.rosterKeyFor(t.team);
          if (k) cfp.set(k, Number(t.rank));
        });
      }
    }

    return function rankOf(meeting, oppTeamKey) {
      if (meeting.phase === "postseason") {
        if (cfp && cfp.has(oppTeamKey)) return cfp.get(oppTeamKey);
        if (lastApWeek != null) {
          const m = byWeek.get(lastApWeek);
          const r = m && m.get(oppTeamKey);
          if (r) return r;
        }
        return cfg.unrankedRank;
      }
      const m = byWeek.get(Number(meeting.week));
      const r = m && m.get(oppTeamKey);
      return r ? r : cfg.unrankedRank;
    };
  }

  function computeRankings(input, opts) {
    opts = opts || {};
    const seasons = Array.isArray(input) ? input : [input];
    const cfg = Object.assign({}, DEFAULT_RANKING_CONFIG, opts.config || {});
    const W = Object.assign(
      {},
      DEFAULT_RANKING_CONFIG.weights,
      (opts.config && opts.config.weights) || {}
    );
    const windowSize = cfg.gamesWindow;
    const cap = cfg.maxMarginPerGame;
    const coachKey = coachKeyer(opts.coachAliases);

    const lastSeason = seasons[seasons.length - 1];
    const lastYear = lastSeason ? (lastSeason.SEASON || {}).year ?? null : null;

    // coachKey -> aggregate. Team is filled per season and the newest
    // one wins, so the row shows where the coach is NOW.
    const coaches = new Map();
    const ensure = (name) => {
      const k = coachKey(name);
      if (!coaches.has(k)) {
        coaches.set(k, {
          key: k,
          coach: String(name || "").trim(),
          team: "",
          teamYear: -Infinity,
          games: [], // played, non-sim — feeds the score
          recW: 0,
          recL: 0, // career H2H, sims included
          seasonW: 0,
          seasonL: 0, // most recent season only
        });
      }
      const c = coaches.get(k);
      if (name) c.coach = String(name).trim();
      return c;
    };

    seasons.forEach((data, i) => {
      if (!data) return;
      const R = makeResolver(data);
      const rankOf = makePollLookup(data, R, cfg);
      const last = i === seasons.length - 1;
      const year = (data.SEASON || {}).year ?? null;

      const meetings = seasonMeetings(data, {
        year,
        throughWeek: last ? opts.throughWeek : 15,
      });

      meetings.forEach((m) => {
        if (!m.scored) return; // unplayed games never touch the poll
        if (!m.homeCoach || !m.awayCoach) return;
        if (coachKey(m.homeCoach) === coachKey(m.awayCoach)) return;

        [
          { me: m.homeCoach, myTeam: m.home, opp: m.away, pf: m.scored.home, pa: m.scored.away, home: true },
          { me: m.awayCoach, myTeam: m.away, opp: m.home, pf: m.scored.away, pa: m.scored.home, home: false },
        ].forEach((s) => {
          const c = ensure(s.me);

          /* Newest season wins the displayed team. Uses -Infinity as
             the seed so a career with no SEASON.year anywhere still
             picks up a team from the first season it sees.

             ROSTER name, not schedule name. schedule-data.js uses the
             in-game spelling ("California", "Florida State") and the
             roster uses the league's own ("Cal", "FSU") — that gap is
             what SCHEDULE_TEAM_ALIASES exists to bridge. The poll sits
             next to roster cards and logos, so it has to match them. */
          const y = year == null ? 0 : year;
          if (y >= c.teamYear) {
            c.teamYear = y;
            const entry = R.entryFor(s.myTeam);
            c.team = (entry && entry.team) || s.myTeam;
          }

          const win = s.pf > s.pa;
          if (win) c.recW++;
          else c.recL++;
          if (last) {
            if (win) c.seasonW++;
            else c.seasonL++;
          }

          // Sims move the record but are not evidence of how a coach
          // plays, so they stop here.
          if (m.sim) return;

          c.games.push({
            year: year == null ? 0 : year,
            sortKey: m.sortKey,
            pf: s.pf,
            pa: s.pa,
            win,
            /* A neutral-site postseason game is nobody's road game.
               Crediting a road win for a title played at a neutral
               venue would quietly inflate every playoff team. */
            roadWin: win && !s.home && !m.neutral,
            oppRank: rankOf(m, R.rosterKeyFor(s.opp)),
          });
        });
      });
    });

    /* CURRENT IDENTITY beats inferred identity.

       Everything above is derived from PLAYED games, so a coach whose
       most recent result is two seasons old would otherwise be shown
       under the handle and school they had back then — wrong on both
       counts if they have since moved or renamed. The live roster is
       the authority on who someone is right now; the game log is only
       the authority on what they did.

       A coach who has left the league entirely isn't in the current
       roster, so they keep their last known identity, which is the
       correct answer for them. */
    if (lastSeason) {
      const R = makeResolver(lastSeason);
      (lastSeason.COACHES || [])
        .filter((c) => c.active !== false)
        .forEach((rc) => {
          const c = coaches.get(coachKey(rc.name));
          if (!c) return;
          c.coach = String(rc.name).trim();
          const entry = R.entryFor(rc.team);
          c.team = (entry && entry.team) || rc.team;
        });
    }

    /* ------------------------------------------------------------
       WHO GETS A ROW — the current roster, not the game log.

       Two different questions, and they must not share a switch:

         Did this game happen between two humans?
           A fact about the past. Permanent. Nothing that happens
           later can change it. This is what `c.games` holds, and it
           is what computeH2H reports — see the note there.

         Should this coach have a row in the poll?
           A statement about the league right now. Answered here.

       Everything above builds `coaches` from MEETINGS, so without
       this gate a coach who left in 2026 still holds a row in 2029:
       the window is "the last N games regardless of season", so if
       they never play again those same games sit there forever and it
       never ages out on its own. The poll would drift into being part
       current league, part ghosts.

       The gate is applied HERE and not at ingest, and that placement
       is the whole trick. A departed coach's games are the same
       objects that feed their OPPONENTS' windows — filtering earlier
       would take a still-active coach's result down with them, which
       is exactly the bug this replaced (marking a coach `active:
       false` mid-season used to erase their opponent's loss).

       So: aggregate everyone, rank only the current roster.

       Empty roster -> no gate, rather than an empty poll. A data file
       that failed to load should degrade to the old behaviour, not
       silently blank the page. */
    const rosterKeys = new Set(
      ((lastSeason && lastSeason.COACHES) || [])
        .filter((c) => c.active !== false && c.departedAfterWeek == null)
        .map((c) => coachKey(c.name))
    );

    const ranked = [];
    coaches.forEach((c) => {
      if (rosterKeys.size && !rosterKeys.has(c.key)) return;

      /* Newest first, then take the window off the front. Ordering is
         (year, sortKey), and sortKey already places the postseason
         after every regular week — so a title game counts as more
         recent than week 15, which is what it is. */
      let games = c.games
        .slice()
        .sort((a, b) => b.year - a.year || b.sortKey - a.sortKey);
      if (windowSize) games = games.slice(0, windowSize);

      const n = games.length;
      if (!n) return; // nothing scoreable yet -> unranked

      const wins = games.filter((g) => g.win).length;
      const winPct = wins / n;
      const avgMargin =
        games.reduce((s, g) => s + clampMargin(g.pf - g.pa, cap), 0) / n;
      const avgOppRank = games.reduce((s, g) => s + g.oppRank, 0) / n;
      const roadWins = games.filter((g) => g.roadWin).length;

      const sosBonus = (cfg.unrankedRank - avgOppRank) * W.strengthOfSchedule;
      const powerScore =
        winPct * W.winPct + avgMargin * W.avgMargin + sosBonus + roadWins * W.roadWinBonus;

      ranked.push({
        key: c.key, // coach key — was the roster key before this became career-wide
        team: c.team,
        coach: c.coach,
        powerScore,
        playedGames: n, // games inside the window (sims excluded)
        h2hWins: c.recW, // career H2H, sims included
        h2hLosses: c.recL,
        record: `${c.recW}-${c.recL}`, // career
        seasonRecord: `${c.seasonW}-${c.seasonL}`, // most recent season
        seasonYear: lastYear,
        /* Record over the rolling window that feeds the score — the
           "L5" column. Spans seasons, so it can read 4-1 in week 1. */
        l5: `${wins}-${n - wins}`,
        windowSpansSeasons: new Set(games.map((g) => g.year)).size > 1,
      });
    });

    ranked.sort((a, b) => b.powerScore - a.powerScore || a.team.localeCompare(b.team));
    ranked.forEach((r, i) => (r.rank = i + 1));
    return ranked;
  }

  /* ============================================================
     HEAD-TO-HEAD — career meetings between two coaches
     ------------------------------------------------------------
     WHY THIS IS NOT PART OF computeRankings

     The power poll answers "how good is this team right now". It
     looks at one season, drops unplayed games, drops sims, keys
     everything on the TEAM, and slides a 5-game window over the
     result. Every one of those choices is wrong for a career H2H
     record, which has to answer "what has happened between these two
     people, ever":

       - all seasons, not the current one
       - unplayed games included (an upcoming matchup is the only
         content that exists in week 2 of season 1)
       - sims included and labelled (they count, they just don't
         count the same)
       - keyed on the COACH, not the team, because coaches change
         schools between seasons and the whole point of a career
         record is that it follows the person
       - no window; the tenth meeting matters as much as the first

     So it's a separate traversal that happens to reuse the same
     matchup builders. It deliberately does NOT reuse computeRankings'
     aggregation, because making one function serve both would mean a
     pile of flags and the two would drift.

     COACH KEY vs ROSTER KEY

     Everywhere else in this file, the join key is the TEAM
     (rosterKeyFor). Here it's the coach's handle, normalised the same
     way people.js does it: trimmed, lowercased, then run through an
     optional alias map for someone who changed handles between
     seasons. This mirrors personKey() in people.js on purpose — that
     file is the site's identity authority, but it isn't loaded in
     Node, so the rule is restated rather than imported. If you change
     one, change the other; they are two copies of one decision and
     the alias table is the seam where they meet.
     ============================================================ */

  function coachKeyer(aliases) {
    const map = aliases || {};
    const keys = Object.keys(map);
    return function coachKey(name) {
      const raw = String(name == null ? "" : name).trim();
      const hit = keys.find((k) => k.toLowerCase() === raw.toLowerCase());
      return (hit ? map[hit] : raw).toLowerCase();
    };
  }

  /* ------------------------------------------------------------
     POSTSEASON — conference championships, CFP, bowls
     ------------------------------------------------------------
     The regular season is stored per TEAM (each team owns a 16-entry
     week list, and a league game appears twice — once on each side).
     The postseason is stored per GAME instead:

       const POSTSEASON = {
         rounds: [
           { id: "ccg", label: "Conference Championships", games: [
             { home: "Georgia", away: "Texas", stadium: "...",
               title: "SEC Championship", neutral: true,
               homeScore: 31, awayScore: 24 },
           ]},
           { id: "cfp-r1",  label: "CFP First Round",         games: [...] },
           { id: "cfp-qf",  label: "CFP Quarterfinal",        games: [...] },
           { id: "cfp-sf",  label: "CFP Semifinal",           games: [...] },
           { id: "cfp-nc",  label: "National Championship",   games: [...] },
           { id: "bowl",    label: "Bowl Games",              games: [...] },
         ],
       };

     WHY A DIFFERENT SHAPE. Postseason games are one-off events at
     neutral sites, and there are a handful of them, not 24 x 16. The
     per-team shape's redundancy is a liability here: writing a game
     twice is how home/away disagreements and half-entered scores get
     in, and the regular-season file already needs hand-deduping (see
     the header of any schedule-data.js). One row per game removes the
     entire class of error.

     `neutral: true` means "no true home team" — the `home`/`away`
     fields still decide which score is which, and the site renders it
     as "vs" at a named site rather than "at". Most CFP and bowl games
     are neutral; CFP first-round games are not.

     ROUNDS ARE ORDERED BY THEIR POSITION IN THE ARRAY, not by an
     explicit order field, so inserting a round means putting it in
     the right place. `id` is the stable machine name (never render
     it); `label` is what the site shows; `title` on an individual
     game is the specific name ("SEC Championship", "Rose Bowl").

     ABSENT IS A VALID STATE. No POSTSEASON key, an empty object, or
     empty rounds all mean "this season didn't have one yet" and
     return []. That's the state all three leagues are in today — this
     is built now so the archive format is fixed before the first
     season is rolled over, not because there's data waiting.
     ------------------------------------------------------------ */
  function buildPostseason(data) {
    const R = makeResolver(data);
    const post = (data && data.POSTSEASON) || {};
    const rounds = Array.isArray(post.rounds) ? post.rounds : [];
    const out = [];

    rounds.forEach((round, order) => {
      (round.games || []).forEach((g) => {
        if (!g || !g.home || !g.away) return;

        /* Both sides must be current league teams. A coach-vs-CPU
           bowl game is real, but it isn't head-to-head, and this
           function exists to feed H2H — same rule buildWeek applies
           to the regular season. */
        if (!R.isLeagueTeam(g.home) || !R.isLeagueTeam(g.away)) return;
        if (R.isInactiveTeam(g.home) || R.isInactiveTeam(g.away)) return;

        const scored =
          g.homeScore != null && g.awayScore != null
            ? { home: Number(g.homeScore), away: Number(g.awayScore) }
            : null;

        out.push({
          home: g.home,
          away: g.away,
          homeCoach: R.coachFor(g.home),
          awayCoach: R.coachFor(g.away),
          stadium: g.stadium || "",
          neutral: g.neutral === true,
          title: g.title || round.label || "",
          roundId: round.id || `round-${order}`,
          roundLabel: round.label || round.id || `Round ${order + 1}`,
          roundOrder: order,
          teams: [g.home, g.away],
          scored,
          sim: g.sim === true,
        });
      });
    });

    return out;
  }

  /* ------------------------------------------------------------
     auditScheduleSides — do the two halves of a game agree?
     ------------------------------------------------------------
     A league game is written TWICE in schedule-data.js, once on each
     team's week list, and the two copies are transcribed by hand from
     two different coaches' screenshots.

     buildWeek does not reconcile them. It takes whichever side it
     reaches first (TEAM_SCHEDULES order) and ignores the other
     entirely, except for OR-ing in `sim`. So if Michigan says it won
     24-14 and Oklahoma says it lost 14-41, the site shows one of
     those, silently, based on which team is listed first in the file
     — and which one that is has nothing to do with which is right.

     That is tolerable for a live scoreboard and NOT tolerable for a
     career record, which is permanent and is the thing this whole
     H2H feature exists to display. Hence this: a read-only audit that
     reads the raw week entries rather than the built matchups, so it
     can see the disagreement buildWeek hides.

     Returns [] when every game agrees. Each problem is
     { week, teams:[a,b], kind, detail } where kind is one of:

       "missing"    one side lists the game, the other doesn't
       "location"   both call it home, or both call it away
       "score"      the two sides report different scores
       "half"       one side has a score, the other doesn't
       "sim"        only one side is flagged as a sim

     Deliberately NOT wired into the site's render path — a mismatch
     should be fixed in the data, not papered over at display time.
     Run it from tools/h2h.js --check.
     ------------------------------------------------------------ */
  function auditScheduleSides(data) {
    const R = makeResolver(data);
    const problems = [];
    const seen = new Set();

    const entriesFor = (teamName) => {
      const t = (data.TEAM_SCHEDULES || []).find(
        (x) => R.rosterKeyFor(x.team) === R.rosterKeyFor(teamName)
      );
      return t ? t.weeks || [] : null;
    };

    (data.TEAM_SCHEDULES || []).forEach((t) => {
      (t.weeks || []).forEach((e) => {
        if (!e || !e.opponent) return;

        /* Week-scoped, so a departed coach's played weeks are still
           audited for agreement and their abandoned ones are not. */
        const week = Number(e.week);
        if (R.isInactiveTeam(t.team, week)) return;
        if (!R.isLeagueTeam(e.opponent, week)) return;

        const aKey = R.rosterKeyFor(t.team);
        const bKey = R.rosterKeyFor(e.opponent);
        const pair = [aKey, bKey].sort().join("::") + "@" + week;
        if (seen.has(pair)) return; // only compare each game once
        seen.add(pair);

        const add = (kind, detail) =>
          problems.push({ week, teams: [t.team, e.opponent], kind, detail });

        const oppWeeks = entriesFor(e.opponent);
        if (!oppWeeks) return add("missing", `${e.opponent} has no schedule block`);

        const back = oppWeeks.find(
          (w) =>
            Number(w.week) === week &&
            w.opponent &&
            R.rosterKeyFor(w.opponent) === aKey
        );
        if (!back) {
          return add(
            "missing",
            `${t.team} lists ${e.opponent} in week ${week}, but ${e.opponent} does not list ${t.team}`
          );
        }

        // "vs"/"at" must be opposites.
        const aLoc = e.location === "at" ? "at" : "vs";
        const bLoc = back.location === "at" ? "at" : "vs";
        if (aLoc === bLoc) {
          add("location", `both list the game as "${aLoc}" — one of them is wrong`);
        }

        const aHas = e.teamScore != null && e.opponentScore != null;
        const bHas = back.teamScore != null && back.opponentScore != null;

        if (aHas !== bHas) {
          add(
            "half",
            `${aHas ? t.team : e.opponent} has a score, ${aHas ? e.opponent : t.team} does not`
          );
        } else if (aHas && bHas) {
          // Each side stores its OWN points first.
          if (Number(e.teamScore) !== Number(back.opponentScore) ||
              Number(e.opponentScore) !== Number(back.teamScore)) {
            add(
              "score",
              `${t.team} says ${e.teamScore}-${e.opponentScore}, ` +
                `${e.opponent} says ${back.teamScore}-${back.opponentScore}`
            );
          }
        }

        if ((e.sim === true) !== (back.sim === true)) {
          add("sim", `only ${e.sim === true ? t.team : e.opponent} is flagged sim`);
        }
      });
    });

    return problems.sort((a, b) => a.week - b.week);
  }

  /* ------------------------------------------------------------
     NORMALISED MEETINGS — one flat list of coach-vs-coach games
     ------------------------------------------------------------
     Flattens one season (regular weeks + postseason) into records
     that no longer care which storage shape they came from. This is
     the seam: everything downstream of here treats a week-3 league
     game and a national championship identically apart from their
     labels, which is what lets the H2H card show a career without
     branching on phase.

     `sortKey` orders meetings within a season. Regular-season weeks
     are 0-15; the postseason continues from 100 so it always sorts
     after any regular week and there's room to add rounds without
     renumbering. It is an ordering device only — never display it.

     THROUGHWEEK GATES THE POSTSEASON TOO. Capping at week 6 has to
     mean "the season as it stood in week 6", and in week 6 no bowl has
     been played. Including postseason games regardless would let a
     mid-season poll count a national championship that, from the
     caller's point of view, hasn't happened — and the previous-week
     poll behind the up/down arrows is exactly such a call. So the
     postseason is included only when the regular season is complete.
     ------------------------------------------------------------ */
  function seasonMeetings(data, opts) {
    opts = opts || {};
    const year = opts.year != null ? opts.year : (data.SEASON || {}).year ?? null;
    const throughWeek = opts.throughWeek == null ? 15 : opts.throughWeek;
    const includePostseason = throughWeek >= 15;
    const out = [];

    for (let week = 0; week <= throughWeek; week++) {
      buildWeek(data, week).league.forEach((m) => {
        out.push({
          year,
          phase: "regular",
          week,
          roundId: null,
          roundLabel: null,
          label: weekLabel(week),
          sortKey: week,
          home: m.home,
          away: m.away,
          homeCoach: m.homeCoach,
          awayCoach: m.awayCoach,
          stadium: m.stadium || "",
          neutral: false,
          scored: m.scored,
          sim: m.sim === true,
        });
      });
    }

    (includePostseason ? buildPostseason(data) : []).forEach((m) => {
      out.push({
        year,
        phase: "postseason",
        week: null,
        roundId: m.roundId,
        roundLabel: m.roundLabel,
        label: m.title || m.roundLabel,
        sortKey: 100 + m.roundOrder,
        home: m.home,
        away: m.away,
        homeCoach: m.homeCoach,
        awayCoach: m.awayCoach,
        stadium: m.stadium,
        neutral: m.neutral,
        scored: m.scored,
        sim: m.sim,
      });
    });

    return out;
  }

  /* ------------------------------------------------------------
     computeH2H — the career record, across every season given
     ------------------------------------------------------------
     NO ROSTER GATE, DELIBERATELY. computeRankings drops coaches who
     are no longer on the current roster, because a poll is a claim
     about the league today. This function is the opposite: it is the
     annals. A game played between two humans in 2026 belongs in both
     their career records forever, whether either of them is still
     around in 2029. Do not "fix" the asymmetry by filtering here.

     INPUT. Either a single season's data object, or an array of them
     ordered however you like:

       computeH2H(data)                      // just this season
       computeH2H([older, data])             // a career

     Each element is the same shape buildWeek takes, plus an optional
     SEASON.year. Pass RAW COACHES arrays — this calls makeResolver,
     which does its own `active: false` filtering, and handing it a
     pre-filtered list silently disables that (see the note at
     RANKING_DATA in script.js).

     A coach's team is resolved PER SEASON, from that season's own
     roster. That's the whole reason each season keeps its own
     league-data.js: someone who coached Oregon in 2026 and Texas in
     2027 shows the right school on each meeting.

     OPTIONS
       coachAliases  {"OldHandle": "NewHandle"} for a coach who
                     changed handles between seasons. Same table
                     shape as PEOPLE_ALIASES in people.js.
       throughWeek   cap the regular season of the LAST entry only,
                     for previewing a week mid-season. Earlier
                     seasons are always taken whole.

     OUTPUT
       Map(coachKey -> {
         coachKey, name, teams: [{year, team}],
         played, wins, losses,          // decided meetings, sims incl.
         opponents: [{
           coachKey, name, wins, losses, played, upcoming,
           meetings: [ ... newest first ... ]
         }]
       })

     Each meeting carries: year, phase, week, roundLabel, label, team,
     oppTeam, home, neutral, played, sim, pf, pa, win, margin, stadium.
     ------------------------------------------------------------ */
  function computeH2H(input, opts) {
    opts = opts || {};
    const seasons = Array.isArray(input) ? input : [input];
    const coachKey = coachKeyer(opts.coachAliases);
    const byCoach = new Map();

    const ensure = (name) => {
      const key = coachKey(name);
      if (!byCoach.has(key)) {
        byCoach.set(key, {
          coachKey: key,
          name: String(name || "").trim(),
          teams: [],
          played: 0,
          wins: 0,
          losses: 0,
          opponents: new Map(),
        });
      }
      const c = byCoach.get(key);
      // Display name tracks the most recent season a coach appears in,
      // matching people.js: the league you're looking at decides the
      // spelling, never a historical file.
      if (name) c.name = String(name).trim();
      return c;
    };

    const side = (c, oppName) => {
      const key = coachKey(oppName);
      if (!c.opponents.has(key)) {
        c.opponents.set(key, {
          coachKey: key,
          name: String(oppName || "").trim(),
          wins: 0,
          losses: 0,
          played: 0,
          upcoming: 0,
          meetings: [],
        });
      }
      const o = c.opponents.get(key);
      if (oppName) o.name = String(oppName).trim();
      return o;
    };

    seasons.forEach((data, i) => {
      if (!data) return;
      const last = i === seasons.length - 1;
      const R = makeResolver(data);
      /* Roster spelling, resolved against THIS season's roster, so a
         2026 meeting says "Cal" and not the schedule file's
         "California". Per season matters: a coach who moved schools
         gets the right name on each side of the move. */
      const teamName = (n) => {
        const e = R.entryFor(n);
        return (e && e.team) || n;
      };
      const meetings = seasonMeetings(data, {
        throughWeek: last ? opts.throughWeek : 15,
      });

      meetings.forEach((m) => {
        if (!m.homeCoach || !m.awayCoach) return;
        // A coach cannot meet themselves; guards against an alias
        // table that accidentally merges two active handles.
        if (coachKey(m.homeCoach) === coachKey(m.awayCoach)) return;

        [
          { me: m.homeCoach, myTeam: m.home, opp: m.awayCoach, oppTeam: m.away, home: true },
          { me: m.awayCoach, myTeam: m.away, opp: m.homeCoach, oppTeam: m.home, home: false },
        ].forEach((s) => {
          const c = ensure(s.me);
          const o = side(c, s.opp);
          const myTeam = teamName(s.myTeam);
          const oppTeam = teamName(s.oppTeam);

          if (!c.teams.some((t) => t.year === m.year && t.team === myTeam)) {
            c.teams.push({ year: m.year, team: myTeam });
          }

          const played = !!m.scored;
          const pf = played ? (s.home ? m.scored.home : m.scored.away) : null;
          const pa = played ? (s.home ? m.scored.away : m.scored.home) : null;
          const win = played ? pf > pa : null;

          if (played) {
            o.played++;
            c.played++;
            if (win) {
              o.wins++;
              c.wins++;
            } else {
              o.losses++;
              c.losses++;
            }
          } else {
            o.upcoming++;
          }

          o.meetings.push({
            year: m.year,
            phase: m.phase,
            week: m.week,
            roundLabel: m.roundLabel,
            label: m.label,
            sortKey: m.sortKey,
            team: myTeam,
            oppTeam,
            home: s.home,
            neutral: m.neutral,
            stadium: m.stadium,
            played,
            sim: m.sim,
            pf,
            pa,
            win,
            margin: played ? pf - pa : null,
          });
        });
      });
    });

    /* Meetings newest first — most recent season, latest round. An
       unplayed game sorts alongside a played one at the same point in
       the calendar, which is what you want: the card reads as a
       timeline, not two separate lists. */
    const byRecency = (a, b) => b.year - a.year || b.sortKey - a.sortKey;

    byCoach.forEach((c) => {
      c.opponents.forEach((o) => {
        o.meetings.sort(byRecency);
        /* Resolve the opponent's display name against the canonical
           entry rather than leaving whatever the last meeting spelled
           it. Without this, a coach who changed handles reads
           correctly in their own card and under their OLD handle in
           the card of anyone they haven't faced since the change —
           the same record, two names, depending on where you looked.
           people.js's rule is that the newest spelling always wins. */
        const canon = byCoach.get(o.coachKey);
        if (canon && canon.name) o.name = canon.name;
      });
      c.teams.sort((a, b) => b.year - a.year);
      /* Opponents with history first, then the most-played. That puts
         the coaches you've actually faced above the ones you're merely
         scheduled to meet, which in season 1 is nearly everyone.

         Opponents you have NOT played are then ordered by when you
         next play them. Falling through to alphabetical here looked
         arbitrary on the card — a coach with three upcoming fixtures
         read "Wk 4, Wk 6, Wk 3", which is noise. Chronological turns
         that tail into a schedule. */
      const nextSort = (o) => {
        const up = o.meetings.filter((m) => !m.played);
        if (!up.length) return Infinity;
        return up.reduce(
          (best, m) => Math.min(best, m.year * 1000 + m.sortKey),
          Infinity
        );
      };
      c.opponents = [...c.opponents.values()].sort(
        (a, b) =>
          b.played - a.played ||
          b.meetings.length - a.meetings.length ||
          nextSort(a) - nextSort(b) ||
          a.name.localeCompare(b.name)
      );
    });

    return byCoach;
  }

  /* ------------------------------------------------------------
     ACHIEVEMENTS — derived, never hand-maintained
     ------------------------------------------------------------
     Conference titles, CFP appearances and national championships are
     not a field anyone types in. They are facts about the postseason
     block, and computing them means they can never disagree with the
     games they came from — no "update the trophy count" step to
     forget after a title game.

     THE RULES, keyed off round `id`:
       ccg      winning a game in this round  -> a conference title
       cfp-*    APPEARING in any round        -> a CFP appearance
       cfp-nc   winning this round            -> a national title
       bowl     counted, not celebrated

     So round ids matter. A round whose id doesn't start with "ccg",
     "cfp" or "bowl" is still rendered on schedules and still counts
     for H2H — it just earns no trophy. That's the safe default: a new
     round type silently produces no achievement rather than a wrong
     one.

     CFP appearance counts SEASONS, not games. Playing a quarterfinal
     and a semifinal in one year is one appearance.

     Only coach-vs-coach postseason games exist in buildPostseason, so
     a title won over a CPU team is invisible here. That is consistent
     with everything else on the site, which only ever counts H2H —
     and it is worth knowing before someone asks why their bowl win
     didn't show up.
     ------------------------------------------------------------ */
  function computeAchievements(input, opts) {
    opts = opts || {};
    const seasons = Array.isArray(input) ? input : [input];
    const coachKey = coachKeyer(opts.coachAliases);
    const out = new Map();

    const ensure = (name) => {
      const k = coachKey(name);
      if (!out.has(k)) {
        out.set(k, {
          coachKey: k,
          confTitles: 0,
          natTitles: 0,
          cfpYears: new Set(),
          bowlWins: 0,
          titleYears: [],
          confYears: [],
        });
      }
      return out.get(k);
    };

    seasons.forEach((data) => {
      if (!data) return;
      const year = (data.SEASON || {}).year ?? null;

      buildPostseason(data).forEach((g) => {
        const id = String(g.roundId || "").toLowerCase();
        const isCfp = id.indexOf("cfp") === 0;
        const isCcg = id.indexOf("ccg") === 0;
        const isFinal = id === "cfp-nc";

        [
          { coach: g.homeCoach, won: g.scored ? g.scored.home > g.scored.away : null },
          { coach: g.awayCoach, won: g.scored ? g.scored.away > g.scored.home : null },
        ].forEach((s) => {
          if (!s.coach) return;
          const a = ensure(s.coach);

          // An appearance needs no result — reaching the bracket counts.
          if (isCfp) a.cfpYears.add(year);

          if (s.won !== true) return;
          if (isCcg) {
            a.confTitles++;
            a.confYears.push(year);
          }
          if (isFinal) {
            a.natTitles++;
            a.titleYears.push(year);
          }
          if (id.indexOf("bowl") === 0) a.bowlWins++;
        });
      });
    });

    out.forEach((a) => {
      a.cfpAppearances = a.cfpYears.size;
      delete a.cfpYears;
      /* `any` is what the card checks. The trophy row is hidden
         entirely for a coach with nothing, rather than shown empty —
         an empty trophy case reads as a failure state. */
      a.any = a.confTitles > 0 || a.natTitles > 0 || a.cfpAppearances > 0;
    });

    return out;
  }

  return {
    makeResolver,
    buildWeek,
    buildPostseason,
    computeAchievements,
    seasonMeetings,
    computeH2H,
    auditScheduleSides,
    weekLabel,
    parseScore,
    scoreableGames,
    editsFor,
    computeRankings,
    latestH2HWeek,
    DEFAULT_RANKING_CONFIG,
  };
});
