-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  owner VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test results table
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_name VARCHAR(255) NOT NULL,
  test_id VARCHAR(500) NOT NULL,
  test_name VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL,
  duration INTEGER NOT NULL,
  retries INTEGER DEFAULT 0,
  flaky_attempts INTEGER DEFAULT 0,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  error TEXT,
  tags TEXT[],
  browser VARCHAR(100),
  os VARCHAR(100),
  environment VARCHAR(100),
  build_id VARCHAR(255),
  commit_hash VARCHAR(255),
  branch_name VARCHAR(255),
  author VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test suites table for grouping test results
CREATE TABLE IF NOT EXISTS test_suites (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_name VARCHAR(255) NOT NULL,
  test_file VARCHAR(500) NOT NULL,
  total_tests INTEGER NOT NULL,
  passed_tests INTEGER NOT NULL,
  failed_tests INTEGER NOT NULL,
  skipped_tests INTEGER NOT NULL,
  total_duration INTEGER NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  build_id VARCHAR(255),
  commit_hash VARCHAR(255),
  branch_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily metrics for trend analysis
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_tests INTEGER NOT NULL,
  passed_tests INTEGER NOT NULL,
  failed_tests INTEGER NOT NULL,
  skipped_tests INTEGER NOT NULL,
  pass_rate DECIMAL(5,2) NOT NULL,
  avg_duration DECIMAL(10,2) NOT NULL,
  total_duration BIGINT NOT NULL,
  flakiness_percentage DECIMAL(5,2) NOT NULL,
  stability DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, date)
);

-- Flaky tests tracking
CREATE TABLE IF NOT EXISTS flaky_tests (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  test_id VARCHAR(500) NOT NULL,
  test_name VARCHAR(500) NOT NULL,
  flakiness_percentage DECIMAL(5,2) NOT NULL,
  total_runs INTEGER NOT NULL,
  passed_runs INTEGER NOT NULL,
  failed_runs INTEGER NOT NULL,
  last_flake_date TIMESTAMP,
  trend VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, test_id)
);

-- Performance alerts
CREATE TABLE IF NOT EXISTS performance_alerts (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  test_id VARCHAR(500) NOT NULL,
  test_name VARCHAR(500) NOT NULL,
  threshold INTEGER NOT NULL,
  current_duration INTEGER NOT NULL,
  previous_duration INTEGER,
  percentage_increase DECIMAL(5,2),
  alerted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_results_project_id ON test_results(project_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at);
CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
CREATE INDEX IF NOT EXISTS idx_test_suites_project_id ON test_suites(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_project_date ON daily_metrics(project_id, date);
CREATE INDEX IF NOT EXISTS idx_flaky_tests_project_id ON flaky_tests(project_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_project_id ON performance_alerts(project_id);
