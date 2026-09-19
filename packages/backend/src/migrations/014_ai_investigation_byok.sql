ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ai_api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS ai_api_key_last4 VARCHAR(10);

-- Tracks how many AI investigations a user has run today using the platform's
-- shared key, so that usage can be capped per day. Users with their own key
-- configured never touch this table - their usage is unlimited (and billed to
-- their own provider account).
CREATE TABLE IF NOT EXISTS ai_shared_key_usage (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  investigation_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);
