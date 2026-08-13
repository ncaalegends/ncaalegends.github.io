/* ============================================================
   PICK'EM — D1 schema
   ------------------------------------------------------------
   Apply once:
     wrangler d1 execute ncaa-legends-pickem --remote \
       --file=worker/pickem-schema.sql

   TIMES ARE UNIX SECONDS, not milliseconds. Discord's own
   <t:1234567890:F> markup takes seconds, and the poll message
   renders its deadline that way so every coach sees it in their
   own timezone. Keeping one unit end to end removes the entire
   class of "off by a factor of 1000" bug.
   ============================================================ */

/* ------------------------------------------------------------
   POLLS
   Both sides are free text — a dynasty game carries coach names,
   an outside game carries team names, and `kind` exists only so
   the site can style them differently.
   ------------------------------------------------------------ */
CREATE TABLE IF NOT EXISTS polls (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  kind            TEXT    NOT NULL DEFAULT 'dynasty',
  option_a_label  TEXT    NOT NULL,
  option_b_label  TEXT    NOT NULL,
  note            TEXT,
  closes_at       INTEGER NOT NULL,
  channel_id      TEXT,
  message_id      TEXT,

  /* 'a' | 'b' | 'void' | NULL. NULL means Blood hasn't ruled yet,
     which scores for nobody and is NOT the same as 'void'. */
  outcome         TEXT,
  settled_at      INTEGER,

  created_by      TEXT,
  created_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_polls_closes  ON polls (closes_at);
CREATE INDEX IF NOT EXISTS idx_polls_outcome ON polls (outcome);

/* ------------------------------------------------------------
   VOTES
   UNIQUE(poll_id, user_id) is the one-vote rule. Not a check in
   a handler that could be raced or forgotten — a constraint the
   database will not let us violate.
   ------------------------------------------------------------ */
CREATE TABLE IF NOT EXISTS votes (
  poll_id        INTEGER NOT NULL,
  user_id        TEXT    NOT NULL,
  choice         TEXT    NOT NULL,
  first_cast_at  INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  UNIQUE (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_poll ON votes (poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes (user_id);

/* ------------------------------------------------------------
   VOTE HISTORY
   Append-only. Costs nothing and settles the argument when
   somebody insists they picked the other guy.
   ------------------------------------------------------------ */
CREATE TABLE IF NOT EXISTS vote_history (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id  INTEGER NOT NULL,
  user_id  TEXT    NOT NULL,
  choice   TEXT    NOT NULL,
  cast_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hist_poll ON vote_history (poll_id, user_id);

/* ------------------------------------------------------------
   VOTERS — a display cache, not an account.
   Every interaction carries the username and server nickname, so
   these refresh themselves on each vote. Nobody registers; a row
   appears the first time someone clicks.
   ------------------------------------------------------------ */
CREATE TABLE IF NOT EXISTS voters (
  user_id       TEXT PRIMARY KEY,
  handle        TEXT,
  nickname      TEXT,
  last_seen_at  INTEGER
);

/* ------------------------------------------------------------
   COACHES — Discord ID to league identity.
   Kept here rather than in league-data.js so sixteen Discord IDs
   don't get published to a public repo, and rather than in
   tools/config.json because the Worker cannot read that file.
   Resolution happens at RENDER time, never at write time: the
   snowflake is the permanent key, so a rename on either side
   updates the whole leaderboard retroactively.
   ------------------------------------------------------------ */
CREATE TABLE IF NOT EXISTS coaches (
  discord_id    TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1
);
