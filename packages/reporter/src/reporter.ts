import { Reporter, TestCase, TestResult, FullConfig } from '@playwright/test/reporter';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { TestResult as AnalyticsTestResult, TestSuite } from '@test-analytics/shared';

interface ReporterConfig {
  backendUrl: string;
  projectId: string;
  projectName: string;
  apiKey?: string;
  enabled?: boolean;
  batchSize?: number;
}

class PlaywrightAnalyticsReporter implements Reporter {
  private config: ReporterConfig;
  private testResults: AnalyticsTestResult[] = [];
  private startTime: Date = new Date();
  private testRetries: Map<string, number> = new Map();
  private testStartTimes: Map<string, Date> = new Map();

  constructor(config: ReporterConfig) {
    this.config = {
      batchSize: 50,
      enabled: true,
      ...config,
    };
  }

  async onBegin(config: FullConfig): Promise<void> {
    if (this.config.enabled) {
      console.log(`[Analytics] Starting test run for project: ${this.config.projectName}`);
    }
  }

  async onTestBegin(test: TestCase): Promise<void> {
    const testId = this.generateTestId(test);
    this.testStartTimes.set(testId, new Date());
    this.testRetries.set(testId, 0);
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    if (!this.config.enabled) return;

    const testId = this.generateTestId(test);
    const startTime = this.testStartTimes.get(testId) || new Date();
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    const retries = this.testRetries.get(testId) || 0;
    this.testRetries.set(testId, retries + 1);

    // Map Playwright status to our status format
    const status = this.mapPlaywrightStatus(result.status);

    const testAnalyticsResult: AnalyticsTestResult = {
      id: uuidv4(),
      projectId: this.config.projectId,
      projectName: this.config.projectName,
      testId,
      testName: test.title,
      status,
      duration,
      retries: result.retry,
      flakyAttempts: result.retry > 0 ? result.retry : 0,
      startTime,
      endTime,
      error: result.error?.message || result.message || undefined,
      tags: test.tags || [],
      browser: result.worker?.parallelIndex ? `worker-${result.worker.parallelIndex}` : 'unknown',
      environment: process.env.TEST_ENV || 'unknown',
      buildId: process.env.CI_BUILD_ID || process.env.GITHUB_RUN_ID,
      branchName: process.env.CI_COMMIT_BRANCH || process.env.GITHUB_REF_NAME || 'unknown',
      commitHash: process.env.CI_COMMIT_SHA || process.env.GITHUB_SHA,
      author: process.env.CI_COMMIT_AUTHOR || process.env.GITHUB_ACTOR,
    };

    this.testResults.push(testAnalyticsResult);

    // Send batch if we've reached batch size
    if (this.testResults.length >= (this.config.batchSize || 50)) {
      await this.sendTestResults();
    }
  }

  async onEnd(): Promise<void> {
    if (!this.config.enabled) return;

    // Send remaining results
    if (this.testResults.length > 0) {
      await this.sendTestResults();
    }

    console.log(`[Analytics] Test run completed. Results sent to ${this.config.backendUrl}`);
  }

  private async sendTestResults(): Promise<void> {
    if (this.testResults.length === 0) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      await axios.post(`${this.config.backendUrl}/api/tests/batch`, {
        results: this.testResults,
        projectId: this.config.projectId,
        projectName: this.config.projectName,
        timestamp: new Date(),
      }, { headers });

      console.log(`[Analytics] Sent ${this.testResults.length} test results`);
      this.testResults = [];
    } catch (error) {
      console.error('[Analytics] Failed to send test results:', error);
      // Don't throw - we don't want failed analytics to break tests
    }
  }

  private generateTestId(test: TestCase): string {
    return `${test.file}::${test.title}`;
  }

  private mapPlaywrightStatus(
    status: 'passed' | 'failed' | 'timedout' | 'skipped' | 'interrupted'
  ): AnalyticsTestResult['status'] {
    const statusMap = {
      passed: 'PASSED' as const,
      failed: 'FAILED' as const,
      timedout: 'TIMEOUT' as const,
      skipped: 'SKIPPED' as const,
      interrupted: 'FAILED' as const,
    };
    return statusMap[status];
  }
}

export default PlaywrightAnalyticsReporter;
