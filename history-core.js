/* ============================================================
   HISTORY CORE — every game and every poll, all seasons, flat
   ------------------------------------------------------------
   The History tab searches the whole dynasty: every season the page
   has loaded (the archives in seasons/<year>/ plus the live one).
   This file turns that list of seasons into two flat arrays the tab
   can filter without knowing anything about how a season is stored:

     games  one row per PLAYED game — coach vs coach, coach vs CPU,
            and the CPU-only playoff games from postseason-data.js
     polls  one row per team per weekly poll (AP Top 25, then CFP)

   NOTHING NEW IS DECIDED HERE. Who coached which team in which week,
   which games are head-to-head, how a league game written twice is
   deduped — all of that is WeekCore.buildWeek / makeResolver, the
   same code the schedule, the power poll and Discord use. This file
   only walks it across seasons. If a game reads wrong in History it
   reads wrong everywhere, and the fix belongs in the data.

   WHAT ISN'T HERE, AND CAN'T BE. A regular-season game between two
   CPU teams was never transcribed, so it doesn't exist to search.
   History is complete for coached teams and for the polls; a CPU
   team's history is only the games it played against coaches, plus
   any playoff games.

     Node     const HistoryCore = require("../history-core");
     Browser  <script src="../history-core.js"></script>  ->  HistoryCore

   Needs WeekCore. In Node it requires it; in the browser it must be
   loaded first.
   ============================================================ */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./week-core"));
  } else {
    root.HistoryCore = factory(root.WeekCore);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (WeekCore) {
  "use strict";

  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

  /* Same mapping as script.js's seasonIndex(): an archived season is
     sitting in the offseason, i.e. complete; a live season in
     preseason has played nothing. */
  function seasonCap(season) {
    const cw = season && season.currentWeek;
    if (cw === "PRESEASON") return 0;
    if (cw === "OFFSEASON") return WeekCore.FINAL_WEEK;
    const n = Number(cw);
    return Number.isFinite(n) ? n : WeekCore.FINAL_WEEK;
  }

  /* What KIND of game a row is, for the type filter. Read off the
     machine-readable `round` first — never parsed out of the title. */
  function gameType(round, week) {
    if (round === "ccg") return "ccg";
    if (round && String(round).indexOf("cfp") === 0) return "cfp";
    if (round && String(round).indexOf("bowl") === 0) return "bowl";
    if (week > WeekCore.REGULAR_FINAL_WEEK) return "bowl";
    return "regular";
  }

  function whenLabel(week, round, title) {
    if (title) return title;
    if (round) return WeekCore.roundLabel(round);
    if (week === WeekCore.REGULAR_FINAL_WEEK) return "Week 15";
    if (week > WeekCore.REGULAR_FINAL_WEEK) return `Bowl Week ${week - WeekCore.REGULAR_FINAL_WEEK}`;
    return `Week ${week}`;
  }

  /* ------------------------------------------------------------
     buildHistory(career, opts)

     career  the same list script.js calls CAREER: oldest season
             first, live season last, each in RANKING_DATA's shape.
     opts.coachKey(name) -> stable person key, so a coach who renamed
             their handle is one person across seasons. Pass
             personKey from people.js. Defaults to lower-case.

     Returns { games, polls, seasons, coaches, teams }.
     ------------------------------------------------------------ */
  function buildHistory(career, opts) {
    const o = opts || {};
    const coachKey = o.coachKey || norm;
    const list = Array.isArray(career) ? career : [];

    const games = [];
    const polls = [];
    const coachNames = new Map(); // key -> latest display name
    const teamSet = new Map(); // norm team -> { name, coached }
    const years = [];

    const noteTeam = (name, coached) => {
      const k = norm(name);
      if (!k) return;
      const cur = teamSet.get(k);
      if (!cur) teamSet.set(k, { name, coached: !!coached });
      else if (coached) cur.coached = true;
    };

    list.forEach((data, idx) => {
      const S = (data && data.SEASON) || {};
      const year = S.year != null ? Number(S.year) : null;
      if (year != null && years.indexOf(year) === -1) years.push(year);
      const cap = seasonCap(S);
      const R = WeekCore.makeResolver(data);

      /* ---- this season's polls, on one week axis ---- */
      const blocks = new Map(); // week -> { kind, teams }
      (data.TOP25 || []).forEach((p) => {
        if (p && p.week != null) blocks.set(Number(p.week), { kind: "ap", teams: p.teams || [] });
      });
      (Array.isArray(data.CFP_POLL) ? data.CFP_POLL : []).forEach((p) => {
        if (p && p.week != null) blocks.set(Number(p.week), { kind: "cfp", teams: p.teams || [] });
      });
      const pollWeeks = [...blocks.keys()].filter((w) => w <= cap).sort((a, b) => a - b);
      const rankMaps = new Map();
      pollWeeks.forEach((w) => {
        const m = new Map();
        blocks.get(w).teams.forEach((t) => {
          if (t && t.team) m.set(R.rosterKeyFor(t.team), Number(t.rank));
        });
        rankMaps.set(w, m);
      });

      /* A played game shows the rank each team held WHEN it was
         played — the latest poll at or before that week, exactly as
         the schedule's badges do. */
      const rankAt = (team, week) => {
        let at = null;
        for (const w of pollWeeks) if (w <= week) at = w;
        if (at == null) return null;
        const r = rankMaps.get(at).get(R.rosterKeyFor(team));
        return r != null ? r : null;
      };

      const side = (team, coach, score, week) => {
        const c = coach || "";
        const key = c ? coachKey(c) : "";
        if (key) coachNames.set(key, c);
        noteTeam(team, !!c);
        return { team, coach: c, coachKey: key, score: Number(score), rank: rankAt(team, week) };
      };

      const seen = new Set();
      const pairId = (week, a, b) =>
        `${week}|${[R.rosterKeyFor(a), R.rosterKeyFor(b)].sort().join("::")}`;

      const push = (g) => {
        g.h2h = !!(g.home.coach && g.away.coach);
        g.cpuOnly = !g.home.coach && !g.away.coach;
        g.type = gameType(g.round, g.week);
        g.postseason = g.type !== "regular";
        g.label = whenLabel(g.week, g.round, g.title);
        g.seasonIndex = idx;
        g.id = `${year}-${g.week}-${R.rosterKeyFor(g.home.team)}-${R.rosterKeyFor(g.away.team)}`;
        games.push(g);
      };

      /* ---- schedule rows: every game a coached team played ---- */
      for (let week = 0; week <= Math.min(cap, WeekCore.FINAL_WEEK); week++) {
        const wk = WeekCore.buildWeek(data, week);

        wk.league.forEach((m) => {
          if (!m.scored) return;
          seen.add(pairId(week, m.home, m.away));
          push({
            year, week,
            round: m.round || null,
            title: m.title || "",
            neutral: !!m.neutral,
            stadium: m.stadium || "",
            sim: !!m.sim,
            home: side(m.home, m.homeCoach, m.scored.home, week),
            away: side(m.away, m.awayCoach, m.scored.away, week),
          });
        });

        wk.cpu.forEach((c) => {
          if (!c.scored) return;
          const away = c.location === "at";
          seen.add(pairId(week, c.team, c.opponent));
          const mine = side(c.team, c.coach, c.scored.team, week);
          const theirs = side(c.opponent, "", c.scored.opponent, week);
          push({
            year, week,
            round: c.round || null,
            title: c.title || "",
            neutral: !!c.neutral,
            stadium: c.stadium || "",
            sim: false,
            home: away ? theirs : mine,
            away: away ? mine : theirs,
          });
        });
      }

      /* ---- postseason-data.js: the CPU-only playoff games ----
         Coached postseason games are schedule rows (above). Anything
         here not already seen is a game no coach played — kept, so a
         season's bracket can be read end to end. If an older season
         ever kept a coached game only here, it still resolves its
         coach rather than vanishing. */
      const post = (data.POSTSEASON && data.POSTSEASON.rounds) || [];
      post.forEach((round) => {
        const week = WeekCore.roundWeek(round.id);
        if (week > cap) return;
        (round.games || []).forEach((g) => {
          if (!g || !g.home || !g.away) return;
          if (g.homeScore == null || g.awayScore == null) return;
          const id = pairId(week, g.home, g.away);
          if (seen.has(id)) return;
          seen.add(id);
          const coachOf = (t) => (R.isLeagueTeam(t, week) ? R.coachFor(t, week) : "");
          push({
            year, week,
            round: round.id || null,
            title: g.title || "",
            neutral: g.neutral === true,
            stadium: g.stadium || "",
            sim: g.sim === true,
            home: side(g.home, coachOf(g.home), g.homeScore, week),
            away: side(g.away, coachOf(g.away), g.awayScore, week),
          });
        });
      });

      /* ---- poll rows ---- */
      pollWeeks.forEach((w) => {
        const b = blocks.get(w);
        b.teams.forEach((t) => {
          if (!t || !t.team) return;
          const coach = R.isLeagueTeam(t.team, w) ? R.coachFor(t.team, w) : "";
          const key = coach ? coachKey(coach) : "";
          if (key) coachNames.set(key, coach);
          noteTeam(t.team, !!coach);
          polls.push({
            year, week: w, kind: b.kind,
            rank: Number(t.rank),
            team: t.team,
            record: String(t.record == null ? "" : t.record),
            coach, coachKey: key,
            seasonIndex: idx,
          });
        });
      });
    });

    const coaches = [...coachNames.entries()]
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    const teams = [...teamSet.entries()]
      .map(([key, v]) => ({ key, name: v.name, coached: v.coached }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { games, polls, seasons: years.sort((a, b) => a - b), coaches, teams };
  }

  /* ------------------------------------------------------------
     filterGames(history, f)

     f: { season, coach, team, opp, type, result, ranked, q }
       season  year, or "" for all
       coach   person key — the SUBJECT coach
       team    normalised team name — the SUBJECT team
       opp     "" | "coach" (any coach) | "cpu" | a person key
       type    "" | "regular" | "post" | "ccg" | "cfp" | "bowl"
       result  "" | "w" | "l"      (needs a subject)
       ranked  true -> the opponent was ranked (with a subject), or
               either team was (without one)
       q       free text across teams, coaches, game names, stadiums

     Each returned row is { game, me, them } — `me` is the subject's
     side when there is a subject, otherwise the winner, so a list
     with no subject still reads "winner first" like a scoreboard.
     ------------------------------------------------------------ */
  function filterGames(history, f) {
    const F = f || {};
    const hasSubject = !!(F.coach || F.team);
    const q = norm(F.q);
    const out = [];

    const sideMatches = (s) =>
      (!F.coach || s.coachKey === F.coach) && (!F.team || norm(s.team) === F.team);

    history.games.forEach((g) => {
      if (F.season && String(g.year) !== String(F.season)) return;
      if (F.type) {
        if (F.type === "post" ? !g.postseason : g.type !== F.type) return;
      }

      let me, them;
      if (hasSubject) {
        if (sideMatches(g.home)) { me = g.home; them = g.away; }
        else if (sideMatches(g.away)) { me = g.away; them = g.home; }
        else return;
      } else {
        const homeWon = g.home.score >= g.away.score;
        me = homeWon ? g.home : g.away;
        them = homeWon ? g.away : g.home;
      }

      if (F.opp) {
        if (hasSubject) {
          if (F.opp === "coach" && !them.coach) return;
          if (F.opp === "cpu" && them.coach) return;
          if (F.opp !== "coach" && F.opp !== "cpu" && them.coachKey !== F.opp) return;
        } else {
          if (F.opp === "coach" && !g.h2h) return;
          if (F.opp === "cpu" && g.h2h) return;
          if (F.opp !== "coach" && F.opp !== "cpu" &&
              g.home.coachKey !== F.opp && g.away.coachKey !== F.opp) return;
        }
      }

      if (F.result && hasSubject) {
        const won = me.score > them.score;
        const lost = me.score < them.score;
        if (F.result === "w" && !won) return;
        if (F.result === "l" && !lost) return;
      }

      if (F.ranked) {
        if (hasSubject ? them.rank == null : g.home.rank == null && g.away.rank == null) return;
      }

      if (q) {
        const hay = norm(
          [g.home.team, g.away.team, g.home.coach, g.away.coach, g.title, g.label, g.stadium, g.year].join(" ")
        );
        if (q.split(/\s+/).some((w) => hay.indexOf(w) === -1)) return;
      }

      out.push({ game: g, me, them, subject: hasSubject });
    });

    return out;
  }

  /* Record and scoring summary over filtered rows (subject view). */
  function summarize(rows) {
    const s = { games: rows.length, w: 0, l: 0, t: 0, pf: 0, pa: 0,
      h2h: { w: 0, l: 0, t: 0 }, cpu: { w: 0, l: 0, t: 0 }, post: { w: 0, l: 0, t: 0 } };
    rows.forEach((r) => {
      const d = r.me.score - r.them.score;
      const k = d > 0 ? "w" : d < 0 ? "l" : "t";
      s[k]++;
      s.pf += r.me.score;
      s.pa += r.them.score;
      (r.game.h2h ? s.h2h : s.cpu)[k]++;
      if (r.game.postseason) s.post[k]++;
    });
    return s;
  }

  return { buildHistory, filterGames, summarize, gameType };
});
