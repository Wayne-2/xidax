ALTER TABLE custom_build_requests ADD COLUMN user_id TEXT;
ALTER TABLE custom_build_requests ADD COLUMN quote_message TEXT;
ALTER TABLE custom_build_requests ADD COLUMN quote_items TEXT;
CREATE INDEX IF NOT EXISTS custom_build_requests_user_idx ON custom_build_requests (user_id, created_at);
