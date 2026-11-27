CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  country TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_email_idx ON messages (email);
