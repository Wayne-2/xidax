-- Migration 0012: Bank accounts (wire) + payment proof
--
-- 1. bank_accounts — reusable wire destinations managed on the admin
--    Payments page. Per-order wire details are copied from one of these
--    (or typed manually) when the admin forwards bank details.
-- 2. orders.payment_proof — JSON { txHash, note?, submittedAt } written
--    when the customer submits proof of payment on the checkout proof step.
-- 3. Legacy wallets recorded as network "usdt" are relabelled to the
--    explicit TRC20 key so USDT-TRC20 and USDT-ERC20 can coexist.

CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  beneficiary TEXT NOT NULL,
  routing TEXT,
  swift TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS bank_accounts_active_idx ON bank_accounts (active);

ALTER TABLE orders ADD COLUMN payment_proof TEXT;

UPDATE crypto_wallets SET network = 'usdt_trc20' WHERE network = 'usdt';
