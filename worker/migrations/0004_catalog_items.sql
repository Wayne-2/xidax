-- Migration 0004: Catalog items (laptops and consoles)
--
-- Stores laptop and console products as JSON documents. The storefront falls
-- back to hardcoded data when a table is empty, so the site is never blank.

CREATE TABLE IF NOT EXISTS laptops (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS laptops_published_idx ON laptops (published);

CREATE TABLE IF NOT EXISTS consoles (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS consoles_published_idx ON consoles (published);
