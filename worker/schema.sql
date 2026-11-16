CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  postal_code TEXT,
  method TEXT NOT NULL,
  network TEXT,
  subtotal REAL NOT NULL,
  shipping REAL NOT NULL,
  total REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (email);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);

CREATE TABLE IF NOT EXISTS order_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  order_number TEXT NOT NULL,
  purchased_on TEXT,
  label_number TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS registrations_email_idx ON registrations (email);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  postal_code TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Member',
  bachs_customer_id TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions (user_id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  order_updates INTEGER NOT NULL DEFAULT 1,
  drop_notifications INTEGER NOT NULL DEFAULT 1,
  marketing_emails INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'English (Nigeria)',
  currency TEXT NOT NULL DEFAULT 'USD ($)'
);

CREATE TABLE IF NOT EXISTS user_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  total REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  method TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS user_orders_user_idx ON user_orders (user_id);

CREATE TABLE IF NOT EXISTS user_products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  order_number TEXT NOT NULL,
  purchased_on TEXT,
  label_number TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS user_products_user_idx ON user_products (user_id);

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
