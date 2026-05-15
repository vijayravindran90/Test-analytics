ALTER TABLE projects
ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;