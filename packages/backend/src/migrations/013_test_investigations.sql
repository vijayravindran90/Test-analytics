CREATE TABLE IF NOT EXISTS test_investigations (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  test_name TEXT,
  root_cause_analysis TEXT NOT NULL,
  short_term_fix TEXT NOT NULL,
  long_term_fix TEXT NOT NULL,
  code_location TEXT NOT NULL,
  suggested_solution TEXT NOT NULL,
  model_used VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_test_investigations_project_test ON test_investigations(project_id, test_id);
