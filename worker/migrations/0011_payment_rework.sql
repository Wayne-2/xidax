-- Migration 0011: Manual payment rework (card / crypto / wire)
--
-- Replaces the bachs gateway flows with admin-managed manual approval:
--   card   → masked summary, 15-minute window, admin approves
--   crypto → admin-managed wallets, 30-minute transfer window, admin approves
--   wire   → admin forwards bank details on request, 48-hour window, admin confirms
--
-- Full card numbers and CVVs are never stored — only a masked summary JSON.

CREATE TABLE IF NOT EXISTS crypto_wallets (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  network TEXT NOT NULL,
  currency TEXT NOT NULL,
  address TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS crypto_wallets_active_idx ON crypto_wallets (active);

-- Payment metadata on orders (also mirrored inside checkout_sessions.data).
ALTER TABLE orders ADD COLUMN card_summary TEXT;
ALTER TABLE orders ADD COLUMN wallet_id TEXT;
ALTER TABLE orders ADD COLUMN wire_details TEXT;
ALTER TABLE orders ADD COLUMN expires_at TEXT;
ALTER TABLE orders ADD COLUMN receipt_sent_at TEXT;

CREATE INDEX IF NOT EXISTS orders_expires_at_idx ON orders (expires_at);

-- Older rows may predate discount/promo columns that persistOrder writes.
-- Ignore failures when they already exist (D1 has no ADD COLUMN IF NOT EXISTS).
