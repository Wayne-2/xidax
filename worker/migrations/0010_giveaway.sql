-- Migration 0010: Giveaway entries
--
-- One entry per Firebase user (or per guest identifier). The closing date is
-- held as a Worker var so the countdown is consistent for everyone.

CREATE TABLE IF NOT EXISTS giveaway_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  guest_id TEXT,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS giveaway_entries_user_idx
  ON giveaway_entries (user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS giveaway_entries_guest_idx
  ON giveaway_entries (guest_id) WHERE guest_id IS NOT NULL;
