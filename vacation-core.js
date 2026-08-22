/* ============================================================
   VACATION CORE — shared vacation logic
   ------------------------------------------------------------
   The one copy of "who is away today, who is away soon, and is
   this submission a real one?"

   Same reason week-core.js sits at the root and the same shape:
   three different things ask these questions and none of them may
   be allowed to answer differently.

     Node     const V = require("../vacation-core");   (tools/nudge.js)
     Browser  <script src="../vacation-core.js"></script>  ->  VacationCore

   WHY IT LIVES HERE AND NOT IN tools/
   The vacation page has to decide "is Salzy away right now" to
   render a card, tools/nudge.js has to decide the identical thing
   to write the morning message, and tools/apply.js has to decide
   whether a submitted range is sane before writing it to disk. A
   second implementation of "does this range cover today" is exactly
   how the site ends up showing a beach icon for somebody the nudge
   thinks is available.

   DATES ARE STRINGS, ON PURPOSE
   Every date here is a plain "YYYY-MM-DD" day, compared with `<`
   and `>` as text. That is not laziness — it's the whole reason
   this file has no timezone bugs. A vacation is a span of DAYS in
   the coach's own life, not an instant; the moment you put one
   through `new Date()` you have invented a time (midnight UTC,
   usually) and Aug 21 starts reading as Aug 20 for everyone west
   of Greenwich. ISO day strings sort and compare correctly as
   text, so none of that arises.

   The single exception is today(), which genuinely does need a
   clock, and pins itself to Eastern — the league's timezone,
   the same one deadline.js uses.

   INCLUSIVE AT BOTH ENDS. A vacation of "21st to the 24th" covers
   the 21st and the 24th. That's what a person means when they say
   it, and it's what the form has always collected.
   ============================================================ */

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.VacationCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DAY = /^\d{4}-\d{2}-\d{2}$/;

  /* The league's timezone, matching deadline.js. Everything else in
     this file is timezone-free; this is the one line that isn't. */
  const ZONE = "America/New_York";

  /* Ceilings on a submission. Generous enough that no real trip is
     refused, tight enough that a typo'd year can't put someone on
     the beach until 2035. */
  const MAX_DAYS = 45;
  const MAX_AHEAD_DAYS = 400;

  /* How long a finished vacation stays in the file. Long enough to
     answer "was he away when that game was force-won?" for a whole
     season, short enough that the file doesn't grow forever. */
  const KEEP_PAST_DAYS = 180;

  /* ------------------------------------------------------------
     TODAY
     ------------------------------------------------------------
     "YYYY-MM-DD" for the current day in Eastern, whatever the
     clock of the machine asking. The site runs in browsers all over
     the country and the nudge runs on a GitHub runner set to UTC —
     without this, a nudge firing at 10 AM Eastern would already be
     on tomorrow's date and would drop somebody's last day.
     ------------------------------------------------------------ */
  function today(now) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now || new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  /* ------------------------------------------------------------
     DAY ARITHMETIC
     ------------------------------------------------------------
     Only ever used on whole days, and only through UTC so no
     daylight-saving hour can shift a date across a boundary. The
     strings go in and come out unchanged in meaning.
     ------------------------------------------------------------ */
  function isDay(s) {
    if (typeof s !== "string" || !DAY.test(s)) return false;
    /* Catches 2026-02-31 and friends: the round trip only survives
       if the date genuinely exists. */
    const d = new Date(`${s}T00:00:00Z`);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }

  function addDays(day, n) {
    const d = new Date(`${day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  /* Whole days from a to b. Both are midnight UTC so the difference
     is always an exact multiple of a day. */
  function daysBetween(a, b) {
    return Math.round(
      (new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000
    );
  }

  /* ------------------------------------------------------------
     IDENTITY
     ------------------------------------------------------------
     Coach names are matched case-insensitively after trimming —
     the same rule people.js uses to decide that "ronricofsu" in
     main and "RonRicoFSU" in 3-star are one person, and the same
     rule tools/config.json relies on for Discord pings.

     personKey() from people.js is not reachable here (this file is
     loaded by Node tools that never load people.js, and by pages
     that load both), so the rule is restated rather than imported.
     If PEOPLE_ALIASES ever gains an entry, this has to learn about
     it — see the note in people.js.
     ------------------------------------------------------------ */
  function key(name) {
    return String(name == null ? "" : name).trim().toLowerCase();
  }

  /* ------------------------------------------------------------
     PREDICATES
     ------------------------------------------------------------
     One definition of active/upcoming/past, used by the site, the
     nudge and the writer alike.
     ------------------------------------------------------------ */
  function isActive(v, day) {
    return !!v && v.start <= day && day <= v.end;
  }

  function isUpcoming(v, day) {
    return !!v && v.start > day;
  }

  function isPast(v, day) {
    return !!v && v.end < day;
  }

  /* Two ranges touching at all. Used to spot a duplicate submission
     rather than to refuse one — see mergeInto(). */
  function overlaps(a, b) {
    return a.start <= b.end && b.start <= a.end;
  }

  /* ------------------------------------------------------------
     READING THE LIST
     ------------------------------------------------------------ */
  function normalise(list) {
    return (Array.isArray(list) ? list : [])
      .filter((v) => v && isDay(v.start) && isDay(v.end) && key(v.coach))
      .map((v) => ({
        coach: String(v.coach).trim(),
        start: v.start,
        end: v.end,
        added: isDay(v.added) ? v.added : "",
      }))
      .sort((a, b) => a.start.localeCompare(b.start) || key(a.coach).localeCompare(key(b.coach)));
  }

  function active(list, day) {
    return normalise(list).filter((v) => isActive(v, day));
  }

  function upcoming(list, day) {
    return normalise(list).filter((v) => isUpcoming(v, day));
  }

  /* ------------------------------------------------------------
     ACTIVE FOR ONE LEAGUE
     ------------------------------------------------------------
     THE POINT OF THE WHOLE DESIGN. Vacations are stored per PERSON,
     with no league on them, because a person is on vacation from
     every dynasty at once — Salzy plays in the 1-star and the
     3-star, and a trip he takes is a trip from both. Which leagues
     a vacation shows up in is therefore never submitted, never
     stored and never able to drift: it is derived, here, by asking
     each league's own roster whether it contains that person.

     `roster` is a league's COACHES array. Anyone already off the
     roster grid is skipped for the same reason they're skipped in
     the picker's coach count and in ROSTER in script.js: a coach
     who stepped away (`active: false`) or quit mid-season
     (`departedAfterWeek`) has no games to be away from.
     ------------------------------------------------------------ */
  function rosterNames(roster) {
    return (Array.isArray(roster) ? roster : [])
      .filter((c) => c && c.active !== false && c.departedAfterWeek == null)
      .map((c) => c.name);
  }

  function activeForRoster(list, roster, day) {
    const names = new Set(rosterNames(roster).map(key));
    return active(list, day).filter((v) => names.has(key(v.coach)));
  }

  /* Is this particular coach away today? The nudge asks it once per
     unplayed game, so it takes the already-filtered active list
     rather than re-scanning the file each time. */
  function awayNow(activeList, name) {
    const k = key(name);
    return (activeList || []).some((v) => key(v.coach) === k);
  }

  /* ------------------------------------------------------------
     VALIDATION
     ------------------------------------------------------------
     Returns a human-readable problem, or null when the entry is
     fine. Deliberately returns the sentence rather than a code:
     every caller — the page, the Worker, apply.js — shows it to a
     person, and one wording means the three can't contradict each
     other about why something was refused.

     `known` is the list of every roster name across all three
     leagues. Passing it is what turns a free-text name box into a
     closed set: the Google Form this replaces accepted "Sazly",
     and nothing downstream could tell that from a real coach.
     Omit it (undefined) to skip the check — the page validates
     before it has loaded the rosters, and apply.js is the one that
     enforces it for real.
     ------------------------------------------------------------ */
  function validate(entry, opts) {
    const o = opts || {};
    const day = o.today || today();

    if (!entry || typeof entry !== "object") return "No vacation was submitted.";

    const coach = String(entry.coach == null ? "" : entry.coach).trim();
    if (!coach) return "Pick your name.";
    if (coach.length > 40) return "That name is too long to be a coach name.";

    if (Array.isArray(o.known)) {
      const names = o.known.map(key);
      if (!names.includes(key(coach))) {
        return `"${coach}" isn't on any of the three rosters. Pick your name from the list.`;
      }
    }

    if (!isDay(entry.start)) return "Start date needs to be a real date.";
    if (!isDay(entry.end)) return "End date needs to be a real date.";
    if (entry.end < entry.start) return "The end date is before the start date.";

    const span = daysBetween(entry.start, entry.end) + 1; // inclusive
    if (span > MAX_DAYS) {
      return `That's ${span} days. Anything over ${MAX_DAYS} should be a chat with a commissioner, not a vacation form.`;
    }

    /* A vacation that's already over can't be recorded. This is a
       tracker for force-win decisions being made now, not a diary —
       and a backdated entry is the one shape that could rewrite a
       call somebody already made. */
    if (entry.end < day) return "That vacation has already ended.";

    if (daysBetween(day, entry.start) > MAX_AHEAD_DAYS) {
      return "That start date is more than a year out — check the year.";
    }

    return null;
  }

  /* ------------------------------------------------------------
     WRITING
     ------------------------------------------------------------
     Adding is append-and-tidy, never replace. Two rules:

     A submission identical to one already on file is a no-op, not
     an error. People double-tap Submit, and a form that answers
     "you already said that" with a red box teaches them their
     first attempt failed.

     An overlapping-but-different range from the same coach REPLACES
     the overlapping one. That's the "actually I'm back a day early"
     correction, which is the common edit, and it means a coach can
     fix a date without needing a commissioner. Non-overlapping
     ranges stack up happily — Salzy has two on file today.
     ------------------------------------------------------------ */
  function mergeInto(list, entry, day) {
    const current = normalise(list);
    const add = {
      coach: String(entry.coach).trim(),
      start: entry.start,
      end: entry.end,
      added: entry.added && isDay(entry.added) ? entry.added : day || today(),
    };
    const k = key(add.coach);

    const duplicate = current.some(
      (v) => key(v.coach) === k && v.start === add.start && v.end === add.end
    );
    if (duplicate) return { list: current, changed: false, replaced: null };

    const replaced = current.find((v) => key(v.coach) === k && overlaps(v, add)) || null;
    const kept = current.filter((v) => v !== replaced);

    return { list: normalise([...kept, add]), changed: true, replaced };
  }

  function removeFrom(list, entry) {
    const current = normalise(list);
    const k = key(entry.coach);
    const gone = current.find(
      (v) => key(v.coach) === k && v.start === entry.start && v.end === entry.end
    );
    if (!gone) return { list: current, changed: false, removed: null };
    return { list: current.filter((v) => v !== gone), changed: true, removed: gone };
  }

  /* Drop entries that ended long enough ago to be nobody's business.
     Runs on every write rather than on a schedule, so there's no
     second job to forget about. */
  function prune(list, day) {
    const cutoff = addDays(day || today(), -KEEP_PAST_DAYS);
    return normalise(list).filter((v) => v.end >= cutoff);
  }

  /* ------------------------------------------------------------
     DISPLAY
     ------------------------------------------------------------ */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function dayName(d) {
    return DOW[new Date(`${d}T00:00:00Z`).getUTCDay()];
  }

  function shortDate(d) {
    const [, m, dd] = d.split("-");
    return `${MONTHS[Number(m) - 1]} ${Number(dd)}`;
  }

  /* "Aug 21 – Aug 24", or "Aug 21" for a single day. */
  function formatRange(v) {
    return v.start === v.end ? shortDate(v.start) : `${shortDate(v.start)} – ${shortDate(v.end)}`;
  }

  /* What a person actually wants to know at a glance: when do they
     get their opponent back. "back Tuesday" beats "ends 2026-08-24". */
  function backOn(v) {
    const back = addDays(v.end, 1);
    return `${dayName(back)} ${shortDate(back)}`;
  }

  function daysRemaining(v, day) {
    return daysBetween(day || today(), v.end);
  }

  return {
    ZONE,
    MAX_DAYS,
    MAX_AHEAD_DAYS,
    KEEP_PAST_DAYS,
    today,
    isDay,
    addDays,
    daysBetween,
    key,
    isActive,
    isUpcoming,
    isPast,
    overlaps,
    normalise,
    active,
    upcoming,
    rosterNames,
    activeForRoster,
    awayNow,
    validate,
    mergeInto,
    removeFrom,
    prune,
    shortDate,
    dayName,
    formatRange,
    backOn,
    daysRemaining,
  };
});
