-- Add browser metrics tracking
-- This migration adds indexes and a new table for browser-specific metrics

-- Add index on browser column for faster filtering
CREATE INDEX IF NOT EXISTS idx_test_results_browser ON test_results(browser);

-- Add composite index for browser and status for quick aggregations
CREATE INDEX IF NOT EXISTS idx_test_results_browser_status ON test_results(browser, status);

-- Add composite index for project and browser for dashboard queries
CREATE INDEX IF NOT EXISTS idx_test_results_project_browser ON test_results(project_id, browser);

-- Browser metrics table for tracking test statistics by browser
CREATE TABLE IF NOT EXISTS browser_metrics (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  browser VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  failed_tests INTEGER NOT NULL DEFAULT 0,
  skipped_tests INTEGER NOT NULL DEFAULT 0,
  pass_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  avg_duration DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_duration BIGINT NOT NULL DEFAULT 0,
  flakiness_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  stability DECIMAL(5,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, browser, date)
);

-- Index for browser metrics queries
CREATE INDEX IF NOT EXISTS idx_browser_metrics_project_date ON browser_metrics(project_id, date);
CREATE INDEX IF NOT EXISTS idx_browser_metrics_browser ON browser_metrics(browser);
