ALTER TABLE users
  ADD COLUMN IF NOT EXISTS api_key_prefix VARCHAR(255);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS api_key_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_api_key_prefix ON users(api_key_prefix);
