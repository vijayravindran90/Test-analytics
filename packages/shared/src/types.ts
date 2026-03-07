// Test execution types
export interface TestResult {
  id: string;
  projectId: string;
  projectName: string;
  testId: string;
  testName: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'TIMEOUT';
  duration: number; // milliseconds
  retries: number;
  flakyAttempts: number; // number of retries before pass
  startTime: Date;
  endTime: Date;
  error?: string;
  tags?: string[];
  browser?: string;
  os?: string;
  environment?: string;
  buildId?: string;
  commitHash?: string;
  branchName?: string;
  author?: string;
  traceUrl?: string; // URL to Playwright trace file
  tracePath?: string; // Local path to trace file
  traceDataBase64?: string; // Base64 encoded trace zip (optional, for hosted viewing)
  traceFileName?: string; // Original trace zip file name
}

export interface TestSuite {
  id: string;
  projectId: string;
  projectName: string;
  testFile: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  startTime: Date;
  endTime: Date;
  results: TestResult[];
  buildId?: string;
  commitHash?: string;
  branchName?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics types
export interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number;
  avgDuration: number;
  totalDuration: number;
  flakinessPercentage: number;
  failureRate: number;
  stability: number; // 0-100, higher is better
}

export interface FlakyTest {
  testId: string;
  testName: string;
  flakinessPercentage: number;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  lastFlakeDate?: Date;
  trend: 'improving' | 'degrading' | 'stable';
}

export interface PerformanceAlert {
  id: string;
  projectId: string;
  testId: string;
  testName: string;
  threshold: number; // milliseconds
  currentDuration: number;
  previousDuration: number;
  percentageIncrease: number;
  alertedAt: Date;
}

export interface DashboardData {
  metrics: TestMetrics;
  flakyTests: FlakyTest[];
  performanceAlerts: PerformanceAlert[];
  recentTests: TestResult[];
  trends: {
    date: Date;
    metrics: TestMetrics;
  }[];
}
