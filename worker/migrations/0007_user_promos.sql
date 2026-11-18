-- Migration 0007: User promo codes
--
-- Promos are assigned to users by admins and apply to every purchase that
-- user makes, rather than being attached to a single product.

CREATE TABLE IF NOT EXISTS user_promos (
  uid TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS user_promos_code_idx ON user_promos (code);
