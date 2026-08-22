ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS guardrail_min_pass_rate DECIMAL(5,2) NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS guardrail_max_flakiness DECIMAL(5,2) NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS guardrail_max_avg_duration_ms INTEGER;
