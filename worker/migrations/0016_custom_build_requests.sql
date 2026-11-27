CREATE TABLE IF NOT EXISTS custom_build_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  contact TEXT,
  budget TEXT,
  request_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  quote_amount REAL,
  quote_currency TEXT DEFAULT 'USD',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS custom_build_requests_status_idx ON custom_build_requests (status, created_at);
CREATE INDEX IF NOT EXISTS custom_build_requests_email_idx ON custom_build_requests (email);
