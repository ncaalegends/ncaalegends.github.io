/* ============================================================
   DEADLINE — the one place real-world time is understood
   ------------------------------------------------------------
   SEASON.nextAdvance used to be free text: "Tuesday, August 11th
   - 6:00 PM EDT". That reads well and is impossible to compute
   with. Nothing could ask "is the advance today?", which is
   exactly the question the advance-day heads-up post has to
   answer every morning.

   So the deadline is now stored twice, and only one of the two is
   authored:

     nextAdvanceAt  "2026-08-11T18:00:00-04:00"   the real value
     nextAdvance    "Tuesday, August 11th - 6:00 PM EDT"   derived

   The display string stays in league-data.js so script.js, the
   advance announcement and the nudge all keep rendering it with no
   changes — but nobody types it any more. formatDeadline() below
   writes it, from the timestamp, every time the timestamp changes.
   If the two ever disagree, the timestamp is right.

   WHY EVERYTHING IS PINNED TO EASTERN
   The league runs on Eastern and always has; every deadline ever
   written in this file's history ends in EDT or EST. So a
   commissioner picks a date and a wall-clock time, and that pair
   means Eastern — not the timezone of whichever laptop or CI
   runner happens to be doing the writing. GitHub Actions runners
   are UTC, phones are wherever the coach is standing, and neither
   should be able to shift a deadline by five hours.

   WHY THE OFFSET IS COMPUTED AND NOT HARDCODED
   -04:00 in August, -05:00 in December. Writing either one down
   permanently guarantees a wrong answer for half the year, and the
   dynasty runs through the DST changeover twice a season. Every
   conversion below asks Intl what Eastern's offset actually was at
   that instant.

     Node     const { formatDeadline } = require("./deadline");
     Browser  <script src="../deadline.js"></script>  ->  Deadline

   Same dual-export shape as week-core.js, and for the same reason:
   the admin page and the tools have to agree, so there is one copy.
   No fs, no path, nothing Node-only.
   ============================================================ */

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Deadline = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ZONE = "America/New_York";

  /* What time of day a deadline written as a bare date means. See the
     long note in parseAt below — it is deliberately late in the
     evening, and it never appears on the site. */
  const DEFAULT_HOUR = 22; // 10 PM Eastern

  /* ------------------------------------------------------------
     WHAT WAS EASTERN'S OFFSET AT THIS INSTANT
     ------------------------------------------------------------
     Format the instant as Eastern wall-clock, then read those same
     numbers back as if they were UTC. The gap between that and the
     real instant is the offset. It's a roundabout way to ask, but
     it's the only one that works in both Node and every browser
     without a timezone library, and it gets DST right by
     construction — Intl already knows when the rules changed.
     ------------------------------------------------------------ */
  const PARTS = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  function zoneParts(date) {
    const out = {};
    for (const p of PARTS.formatToParts(date)) {
      if (p.type !== "literal") out[p.type] = p.value;
    }
    /* Some engines render midnight as hour 24 rather than 00. */
    if (out.hour === "24") out.hour = "00";
    return out;
  }

  function offsetMs(date) {
    const p = zoneParts(date);
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    /* Milliseconds don't survive the round trip through the
       formatter, so compare against a whole-second instant. */
    return asUtc - Math.floor(date.getTime() / 1000) * 1000;
  }

  function offsetString(date) {
    const mins = Math.round(offsetMs(date) / 60000);
    const sign = mins < 0 ? "-" : "+";
    const abs = Math.abs(mins);
    return (
      sign +
      String(Math.floor(abs / 60)).padStart(2, "0") +
      ":" +
      String(abs % 60).padStart(2, "0")
    );
  }

  /* ------------------------------------------------------------
     EASTERN WALL CLOCK -> INSTANT
     ------------------------------------------------------------
     "2026-08-11" + "18:00" means 6 PM in New York, whatever the
     caller's own clock says.

     The two-pass correction is not belt and braces. Guess the
     instant using an offset, and if that guess lands on the other
     side of a DST boundary from the answer, the offset used was the
     wrong one — so the second pass re-asks at the corrected instant.
     Twice is enough for a one-hour shift; a third pass could only
     matter for a zone that changed offset twice within an hour,
     which Eastern never has.

     Two boundary hours behave the way a calendar app behaves:

       Spring forward. 2:30 AM on the second Sunday in March never
       happens. Both passes land on a time that isn't the one asked
       for, so the first-pass guess wins and the deadline moves
       FORWARD to 3:30 AM EDT. Snapping backwards to 1:30 AM would
       quietly make the deadline an hour earlier than written.

       Fall back. 1:30 AM on the first Sunday in November happens
       twice. The earlier one (still EDT) is used, matching every
       other calendar.

     Neither is a realistic advance time. They're handled anyway
     because the alternative is a silent off-by-an-hour in a value
     that goes out to 24 people.
     ------------------------------------------------------------ */
  function instantFromZoneLocal(y, mo, d, hh, mm) {
    const naive = Date.UTC(y, mo - 1, d, hh, mm, 0);
    const first = naive - offsetMs(new Date(naive));
    const second = naive - offsetMs(new Date(first));

    /* Did we actually land on the requested wall clock? In the
       spring-forward gap no instant can, and `second` is the pass
       that went backwards — so keep `first`. */
    const p = zoneParts(new Date(second));
    const landed =
      +p.year === y && +p.month === mo && +p.day === d && +p.hour === hh && +p.minute === mm;

    return new Date(landed ? second : first);
  }

  /* Does this Y-M-D actually exist? Date.UTC rolls February 31st
     over into March rather than complaining. */
  function isRealDate(y, mo, d) {
    const probe = new Date(Date.UTC(y, mo - 1, d));
    return (
      probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d
    );
  }

  /* ------------------------------------------------------------
     PARSING
     ------------------------------------------------------------
     Two shapes are accepted, and the difference between them is
     whether the string carries its own offset:

       2026-08-11T18:00:00-04:00   absolute. Trusted as written —
                                   this is what we store, so
                                   re-reading our own field is
                                   lossless even if the DST rules
                                   change under us.
       2026-08-11 18:00           wall clock. Interpreted as
       2026-08-11T18:00           Eastern, per the note up top.

     Anything else — including the old free-text deadlines — returns
     null rather than a plausible-looking wrong date. Callers treat
     null as "no machine-readable deadline" and degrade to silence,
     which is the only safe failure for something that posts to
     Discord unattended.
     ------------------------------------------------------------ */
  const ABSOLUTE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})$/;
  const WALL = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2})?)?$/;

  function parseAt(value) {
    const s = String(value ?? "").trim();
    if (!s) return null;

    const abs = ABSOLUTE.exec(s);
    if (abs) {
      const d = new Date(s.replace(" ", "T"));
      return isNaN(d.getTime()) ? null : d;
    }

    const wall = WALL.exec(s);
    if (wall) {
      const [, y, mo, d, hh, mm] = wall;
      if (!isRealDate(+y, +mo, +d)) return null;
      /* A bare date with no time resolves to LATE that evening, not
         midnight and not the middle of the day. Two things depend on
         where this lands and they pull in opposite directions:

           too early   the deadline reads as already passed while the
                       advance is still hours away, and the heads-up
                       goes quiet on the morning it was meant to fire
           midnight    the day rolls over first, so a deadline set
                       for "Tuesday" is never ahead on Tuesday at all

         DEFAULT_HOUR is late enough to cover an evening advance —
         these happen at night, after everyone's home — and still on
         the correct calendar day. A league that wants an exact time
         sets one; this is only what a bare date means. */
      const hour = hh === undefined ? DEFAULT_HOUR : +hh;
      const min = mm === undefined ? 0 : +mm;
      if (hour > 23 || min > 59) return null;

      const dt = instantFromZoneLocal(+y, +mo, +d, hour, min);
      return isNaN(dt.getTime()) ? null : dt;
    }

    return null;
  }

  /* Canonical storage form. Always seconds, always with an explicit
     offset, so the stored value can never be re-read as local time
     by something less careful than parseAt. */
  function toIso(date) {
    const p = zoneParts(date);
    return (
      `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}` + offsetString(date)
    );
  }

  /* ------------------------------------------------------------
     DISPLAY
     ------------------------------------------------------------
     Matches the string the commissioner used to type by hand, down
     to the ordinal suffix — the site, the advance post and the
     nudge all render this and none of them changed.

       Tuesday, August 11th - 6:00 PM EDT

     Times are stated in Eastern with the abbreviation attached, so a
     coach in another timezone can see it's not their 6 PM.
     ------------------------------------------------------------ */
  const DAY_FMT = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const TIME_FMT = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  function ordinal(n) {
    const rem100 = n % 100;
    if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
    return `${n}${["th", "st", "nd", "rd"][n % 10] || "th"}`;
  }

  /* Is this stored value deliberately date-only? "2026-08-12" is
     how a league that sets a day but not a clock time records its
     deadline — 1-star has always read "Wednesday, August 12th" with
     no time, and generating "- 6:00 PM EDT" onto it would put words
     in that commissioner's mouth. The 6 PM default still exists
     internally (see parseAt) because the heads-up needs SOME instant
     to compare against; it just isn't shown. */
  function isDateOnly(value) {
    if (value instanceof Date) return false;
    const m = WALL.exec(String(value ?? "").trim());
    return Boolean(m && m[4] === undefined);
  }

  function formatDeadline(value) {
    const d = value instanceof Date ? value : parseAt(value);
    if (!d) return "";

    const day = {};
    for (const p of DAY_FMT.formatToParts(d)) day[p.type] = p.value;

    const dayText = `${day.weekday}, ${day.month} ${ordinal(+day.day)}`;
    if (isDateOnly(value)) return dayText;

    /* "6:00 PM EDT" — the formatter gives "6:00 PM EDT" already, but
       with a narrow no-break space between the time and AM/PM in
       some ICU builds, which looks like a stray character once it's
       sitting in a JS string literal in a data file. Normalised. */
    const time = TIME_FMT.format(d).replace(/ | /g, " ");

    return `${dayText} - ${time}`;
  }

  /* ------------------------------------------------------------
     "IS IT TODAY?"
     ------------------------------------------------------------
     Compared as Eastern calendar days, never as a 24-hour window.
     A runner firing at 14:00 UTC is 10 AM in New York, and the
     deadline it's asking about is 6 PM the same Eastern day — eight
     hours apart, same date, which is the whole point. Subtracting
     timestamps would get this right in August and wrong in
     November.
     ------------------------------------------------------------ */
  function dayKey(date) {
    const p = zoneParts(date);
    return `${p.year}-${p.month}-${p.day}`;
  }

  function isSameZoneDay(a, b) {
    return dayKey(a) === dayKey(b);
  }

  /* True when `value` names a deadline that falls today, Eastern,
     and hasn't passed yet. Both halves matter: a heads-up posted
     after the advance already happened is worse than none, because
     the matchups it lists are the ones people are already playing. */
  function isDeadlineToday(value, now = new Date()) {
    const d = parseAt(value);
    if (!d) return false;
    return isSameZoneDay(d, now) && d.getTime() > now.getTime();
  }

  function hoursUntil(value, now = new Date()) {
    const d = parseAt(value);
    if (!d) return null;
    return (d.getTime() - now.getTime()) / 3600000;
  }

  /* ------------------------------------------------------------
     CANONICAL FORM
     ------------------------------------------------------------
     What actually gets written into league-data.js. Anything
     parseable is accepted on the way in — "2026-08-14 18:00" typed
     at a prompt is perfectly clear — but only two shapes are ever
     stored, so the file stays consistent and diffs stay readable:

       2026-08-14T18:00:00-04:00   a day and a time
       2026-08-14                  a day, no time shown

     Returns "" for an empty value (a deliberately cleared deadline)
     and null for an unparseable one, so a caller can tell the two
     apart instead of writing a blank where a mistake was made.
     ------------------------------------------------------------ */
  function canonical(value) {
    const s = String(value ?? "").trim();
    if (!s) return "";
    const d = parseAt(s);
    if (!d) return null;
    return isDateOnly(s) ? dayKey(d) : toIso(d);
  }

  /* For prefilling a date+time picker from a stored value. Returns
     the Eastern wall-clock halves the inputs expect. */
  function toPickerFields(value) {
    const d = parseAt(value);
    if (!d) return { date: "", time: "" };
    const p = zoneParts(d);
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
  }

  /* The inverse: what a date input and a time input add up to.
     Returns null for an incomplete or nonsense pair so the caller
     can say so rather than storing a broken timestamp. */
  function fromPickerFields(dateStr, timeStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr ?? "").trim());
    if (!m) return null;
    const t = /^(\d{2}):(\d{2})$/.exec(String(timeStr ?? "").trim());
    if (!t) return null;
    const d = instantFromZoneLocal(+m[1], +m[2], +m[3], +t[1], +t[2]);
    return isNaN(d.getTime()) ? null : toIso(d);
  }

  return {
    ZONE,
    DEFAULT_HOUR,
    parseAt,
    toIso,
    canonical,
    isDateOnly,
    formatDeadline,
    dayKey,
    isSameZoneDay,
    isDeadlineToday,
    hoursUntil,
    toPickerFields,
    fromPickerFields,
    offsetString,
  };
});
