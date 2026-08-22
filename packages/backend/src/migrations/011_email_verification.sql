ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS verification_email_sent_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_verification_token_hash ON users(verification_token_hash) WHERE verification_token_hash IS NOT NULL;

-- Grandfather in accounts that existed before this feature so nobody already
-- using the app gets locked out by the new default-FALSE column.
UPDATE users SET email_verified = TRUE WHERE email_verified IS NOT TRUE;
