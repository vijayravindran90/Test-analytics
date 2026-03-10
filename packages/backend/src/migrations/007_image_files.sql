-- Store uploaded Playwright image artifacts (screenshots) for dashboard viewing
CREATE TABLE IF NOT EXISTS image_files (
  id UUID PRIMARY KEY,
  test_result_id UUID NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
  file_name VARCHAR(255),
  content_type VARCHAR(100),
  content_base64 TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(test_result_id)
);

CREATE INDEX IF NOT EXISTS idx_image_files_test_result_id ON image_files(test_result_id);