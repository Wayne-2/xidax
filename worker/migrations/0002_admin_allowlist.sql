-- Migration 0002: Admin allowlist
--
-- A single source of truth for who may access the admin dashboard. The guard
-- checks the email from the verified Firebase ID token against this table,
-- so granting and revoking access takes effect immediately without requiring
-- the user to sign out and back in for a claim to refresh.

CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS admins_created_idx ON admins (created_at);
