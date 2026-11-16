-- Migration 0001: Firebase Auth identity + email OTP records
--
-- The Worker used to authenticate with locally hashed passwords stored in
-- this table. Passwords are now owned by Firebase Authentication, so those
-- columns become optional and email_verified is added to track the custom
-- OTP verification flow.
--
-- users.id is the Firebase UID.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS users_migrated (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  postal_code TEXT,
  password_hash TEXT,
  password_salt TEXT,
  tier TEXT NOT NULL DEFAULT 'Member',
  bachs_customer_id TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO users_migrated (
  id, email, name, phone, country, postal_code, tier, bachs_customer_id, email_verified, created_at
)
SELECT
  id, email, name, phone, country, postal_code, tier, bachs_customer_id, 0, created_at
FROM users;

DROP TABLE IF EXISTS users;
ALTER TABLE users_migrated RENAME TO users;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- Temporary OTP records for the six digit email verification flow.
CREATE TABLE IF NOT EXISTS email_otps (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS email_otps_email_idx ON email_otps (email);
CREATE INDEX IF NOT EXISTS email_otps_expires_idx ON email_otps (expires_at);

-- In progress checkout sessions. Previously stored in Firestore.
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL,
  status TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS checkout_sessions_expires_idx ON checkout_sessions (expires_at);

PRAGMA foreign_keys = ON;
