-- Migration 0008: Server-backed carts
--
-- Carts are keyed by a client-generated cart id (sent as x-cart-id). When a
-- user is signed in, the cart is also associated with their Firebase UID so
-- it can be restored on another device.

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  items TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS carts_user_idx ON carts (user_id);
