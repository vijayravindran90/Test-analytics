-- Store uploaded Playwright trace zips for hosted viewing
CREATE TABLE IF NOT EXISTS trace_files (
  id UUID PRIMARY KEY,
  test_result_id UUID NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
  file_name VARCHAR(255),
  content_base64 TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(test_result_id)
);

CREATE INDEX IF NOT EXISTS idx_trace_files_test_result_id ON trace_files(test_result_id);
