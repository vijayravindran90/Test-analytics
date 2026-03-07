-- Add trace file support for failed tests
-- This migration adds trace_url column to store links to Playwright trace files

-- Add trace_url column to test_results table
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS trace_url TEXT;

-- Add trace_path column for local file storage
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS trace_path TEXT;

-- Add index for queries filtering by status with traces
CREATE INDEX IF NOT EXISTS idx_test_results_status_trace ON test_results(status, trace_url) WHERE trace_url IS NOT NULL;

-- Add index for failed tests with traces
CREATE INDEX IF NOT EXISTS idx_test_results_failed_with_trace ON test_results(project_id, status) WHERE status = 'FAILED' AND trace_url IS NOT NULL;
