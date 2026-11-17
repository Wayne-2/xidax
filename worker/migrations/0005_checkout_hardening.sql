-- Migration 0005: Checkout hardening
--
-- The orders table is missing checkout_id even though the worker writes and
-- queries it. checkout_sessions also needs an INSERT path so session lookups
-- and "I have sent payment" work.

ALTER TABLE orders ADD COLUMN checkout_id TEXT;

CREATE INDEX IF NOT EXISTS orders_checkout_id_idx ON orders (checkout_id);

-- Idempotency for payment webhooks: replayed events must not overwrite
-- later fulfilment statuses.
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT,
  created_at TEXT NOT NULL
);
