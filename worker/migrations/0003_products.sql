-- Migration 0003: Products catalog
--
-- A single source of truth for prebuild products. When `published` is 1 the
-- product appears on the prebuilds page. `featured` is reserved for a future
-- home-page featured section; the landing page currently uses its own
-- hardcoded catalogue and is unaffected by this table.

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  images TEXT NOT NULL DEFAULT '[]',
  brand TEXT NOT NULL,
  price REAL NOT NULL,
  original_price REAL NOT NULL,
  stock TEXT NOT NULL,
  flagship INTEGER NOT NULL DEFAULT 0,
  specs TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0,
  featured_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS products_published_idx ON products (published);
CREATE INDEX IF NOT EXISTS products_featured_idx ON products (featured, featured_order);
