import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

interface TestResult {
  id: string;
  projectId: string;
  projectName: string;
  testId: string;
  testName: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'TIMEOUT';
  duration: number;
  retries: number;
  flakyAttempts: number;
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
  traceUrl?: string;
  tracePath?: string;
  traceDataBase64?: string;
  traceFileName?: string;
}

interface FlakyTest {
  testId: string;
  testName: string;
  flakinessPercentage: number;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  lastFlakeDate?: Date;
  trend: 'improving' | 'degrading' | 'stable';
}

interface PerformanceAlert {
  id: string;
  projectId: string;
  testId: string;
  testName: string;
  threshold: number;
  currentDuration: number;
  previousDuration?: number;
  percentageIncrease: number;
  alertedAt: Date;
}

interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number;
  avgDuration: number;
  totalDuration: number;
  flakinessPercentage: number;
  failureRate: number;
  stability: number;
}

export class TestService {
  async saveTestResults(results: TestResult[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const result of results) {
        // Check if trace columns exist by trying to insert with them first
        // If they don't exist, fall back to insert without them
        try {
          await client.query(
            `INSERT INTO test_results 
             (id, project_id, project_name, test_id, test_name, status, duration, retries, flaky_attempts, 
              start_time, end_time, error, tags, browser, os, environment, build_id, commit_hash, branch_name, author, trace_url, trace_path)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
            [
              result.id,
              result.projectId,
              result.projectName,
              result.testId,
              result.testName,
              result.status,
              result.duration,
              result.retries,
              result.flakyAttempts,
              result.startTime,
              result.endTime,
              result.error,
              result.tags || [],
              result.browser,
              result.os,
              result.environment,
              result.buildId,
              result.commitHash,
              result.branchName,
              result.author,
              result.traceUrl,
              result.tracePath,
            ]
          );
        } catch (insertError: any) {
          // If error is about missing columns, try without trace fields
          if (insertError.message?.includes('column') && (insertError.message?.includes('trace_url') || insertError.message?.includes('trace_path'))) {
            await client.query(
              `INSERT INTO test_results 
               (id, project_id, project_name, test_id, test_name, status, duration, retries, flaky_attempts, 
                start_time, end_time, error, tags, browser, os, environment, build_id, commit_hash, branch_name, author)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
              [
                result.id,
                result.projectId,
                result.projectName,
                result.testId,
                result.testName,
                result.status,
                result.duration,
                result.retries,
                result.flakyAttempts,
                result.startTime,
                result.endTime,
                result.error,
                result.tags || [],
                result.browser,
                result.os,
                result.environment,
                result.buildId,
                result.commitHash,
                result.branchName,
                result.author,
              ]
            );
          } else {
            throw insertError;
          }
        }

        if (result.traceDataBase64) {
          try {
            await client.query(
              `INSERT INTO trace_files (id, test_result_id, file_name, content_base64)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (test_result_id)
               DO UPDATE SET file_name = EXCLUDED.file_name, content_base64 = EXCLUDED.content_base64`,
              [uuidv4(), result.id, result.traceFileName || 'trace.zip', result.traceDataBase64]
            );
          } catch (traceStoreError: any) {
            // If migration not applied yet, skip storing trace blobs without failing ingestion.
            if (!traceStoreError.message?.includes('relation "trace_files" does not exist')) {
              throw traceStoreError;
            }
          }
        }
      }

      // Update flaky tests and daily metrics
      if (results.length > 0) {
        const projectId = results[0].projectId;
        await this.updateFlakyTests(client, projectId, results);
        await this.updateDailyMetrics(client, projectId);
        await this.checkPerformanceAlerts(client, projectId, results);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async updateFlakyTests(
    client: any,
    projectId: string,
    results: TestResult[]
  ): Promise<void> {
    for (const result of results) {
      const existingFlaky = await client.query(
        `SELECT * FROM flaky_tests WHERE project_id = $1 AND test_id = $2`,
        [projectId, result.testId]
      );

      const isFlaky = result.flakyAttempts > 0;
      const testsPassed = result.status === 'PASSED';

      if (existingFlaky.rows.length > 0) {
        const prevRow = existingFlaky.rows[0];
        const totalRuns = prevRow.total_runs + 1;
        const passedRuns = testsPassed ? prevRow.passed_runs + 1 : prevRow.passed_runs;
        const failedRuns = testsPassed ? prevRow.failed_runs : prevRow.failed_runs + 1;
        const flakinessPercentage = (prevRow.passed_runs - passedRuns) / (totalRuns || 1) * 100;

        // Determine trend
        const prevFlakiness = prevRow.flakiness_percentage;
        let trend = 'stable';
        if (flakinessPercentage > prevFlakiness + 5) {
          trend = 'degrading';
        } else if (flakinessPercentage < prevFlakiness - 5) {
          trend = 'improving';
        }

        await client.query(
          `UPDATE flaky_tests 
           SET flakiness_percentage = $1, total_runs = $2, passed_runs = $3, failed_runs = $4, 
               trend = $5, last_flake_date = $6, updated_at = NOW()
           WHERE project_id = $7 AND test_id = $8`,
          [
            Math.max(0, flakinessPercentage),
            totalRuns,
            passedRuns,
            failedRuns,
            trend,
            isFlaky ? new Date() : prevRow.last_flake_date,
            projectId,
            result.testId,
          ]
        );
      } else if (isFlaky) {
        await client.query(
          `INSERT INTO flaky_tests 
           (id, project_id, test_id, test_name, flakiness_percentage, total_runs, passed_runs, failed_runs, trend)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            uuidv4(),
            projectId,
            result.testId,
            result.testName,
            100,
            1,
            0,
            1,
            'degrading',
          ]
        );
      }
    }
  }

  private async updateDailyMetrics(client: any, projectId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const metricsResult = await client.query(
      `SELECT 
        COUNT(*) as total_tests,
        SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as passed_tests,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_tests,
        SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped_tests,
        AVG(duration) as avg_duration,
        SUM(duration) as total_duration
       FROM test_results 
       WHERE project_id = $1 AND DATE(created_at) = $2`,
      [projectId, today]
    );

    const row = metricsResult.rows[0];
    const totalTests = parseInt(row.total_tests) || 0;
    const passedTests = parseInt(row.passed_tests) || 0;
    const passRate = (passedTests / totalTests) * 100 || 0;

    const flakyTestsResult = await client.query(
      `SELECT COUNT(*) as flaky_count FROM flaky_tests 
       WHERE project_id = $1 AND flakiness_percentage > 0`,
      [projectId]
    );

    const flakinessPercentage =
      (parseInt(flakyTestsResult.rows[0].flaky_count) / totalTests) * 100 || 0;
    const stability = 100 - flakinessPercentage;

    await client.query(
      `INSERT INTO daily_metrics 
       (id, project_id, date, total_tests, passed_tests, failed_tests, skipped_tests, pass_rate, avg_duration, total_duration, flakiness_percentage, stability)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (project_id, date) DO UPDATE SET
       total_tests = $4, passed_tests = $5, failed_tests = $6, skipped_tests = $7,
       pass_rate = $8, avg_duration = $9, total_duration = $10, 
       flakiness_percentage = $11, stability = $12, created_at = NOW()`,
      [
        uuidv4(),
        projectId,
        today,
        totalTests,
        passedTests,
        row.failed_tests || 0,
        row.skipped_tests || 0,
        passRate,
        row.avg_duration || 0,
        row.total_duration || 0,
        flakinessPercentage,
        stability,
      ]
    );
  }

  private async checkPerformanceAlerts(
    client: any,
    projectId: string,
    results: TestResult[]
  ): Promise<void> {
    const performanceThreshold = 5000; // 5 seconds - configurable

    for (const result of results) {
      if (result.duration > performanceThreshold) {
        const previousResult = await client.query(
          `SELECT duration FROM test_results 
           WHERE project_id = $1 AND test_id = $2 AND id != $3
           ORDER BY created_at DESC LIMIT 1`,
          [projectId, result.testId, result.id]
        );

        const previousDuration = previousResult.rows[0]?.duration;
        const percentageIncrease = previousDuration
          ? ((result.duration - previousDuration) / previousDuration) * 100
          : 0;

        if (percentageIncrease > 20 || result.duration > performanceThreshold) {
          await client.query(
            `INSERT INTO performance_alerts 
             (id, project_id, test_id, test_name, threshold, current_duration, previous_duration, percentage_increase)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidv4(),
              projectId,
              result.testId,
              result.testName,
              performanceThreshold,
              result.duration,
              previousDuration || null,
              percentageIncrease,
            ]
          );
        }
      }
    }
  }

  async getProjectMetrics(projectId: string, days: number = 30): Promise<TestMetrics> {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_tests,
        SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as passed_tests,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_tests,
        SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped_tests,
        AVG(duration) as avg_duration,
        SUM(duration) as total_duration
       FROM test_results 
       WHERE project_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`,
      [projectId]
    );

    const row = result.rows[0];
    const totalTests = parseInt(row.total_tests) || 0;
    const passedTests = parseInt(row.passed_tests) || 0;
    const failedTests = parseInt(row.failed_tests) || 0;

    const flakyTestsResult = await pool.query(
      `SELECT COUNT(*) as flaky_count FROM flaky_tests 
       WHERE project_id = $1 AND flakiness_percentage > 10`,
      [projectId]
    );

    const flakinessPercentage = (parseInt(flakyTestsResult.rows[0].flaky_count) / totalTests) * 100 || 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests: parseInt(row.skipped_tests) || 0,
      passRate: (passedTests / totalTests) * 100 || 0,
      avgDuration: parseFloat(row.avg_duration) || 0,
      totalDuration: parseInt(row.total_duration) || 0,
      flakinessPercentage,
      failureRate: (failedTests / totalTests) * 100 || 0,
      stability: 100 - flakinessPercentage,
    };
  }

  async getFlakyTests(projectId: string, limit: number = 10): Promise<FlakyTest[]> {
    const result = await pool.query(
      `SELECT id, test_id, test_name, flakiness_percentage, total_runs, passed_runs, failed_runs, last_flake_date, trend
       FROM flaky_tests 
       WHERE project_id = $1 AND flakiness_percentage > 0
       ORDER BY flakiness_percentage DESC
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows.map((row: any) => ({
      testId: row.test_id,
      testName: row.test_name,
      flakinessPercentage: parseFloat(row.flakiness_percentage),
      totalRuns: row.total_runs,
      passedRuns: row.passed_runs,
      failedRuns: row.failed_runs,
      lastFlakeDate: row.last_flake_date,
      trend: row.trend || 'stable',
    }));
  }

  async getPerformanceAlerts(projectId: string, limit: number = 10): Promise<PerformanceAlert[]> {
    const result = await pool.query(
      `SELECT id, test_id, test_name, threshold, current_duration, previous_duration, percentage_increase, alerted_at
       FROM performance_alerts 
       WHERE project_id = $1
       ORDER BY alerted_at DESC
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      projectId,
      testId: row.test_id,
      testName: row.test_name,
      threshold: row.threshold,
      currentDuration: row.current_duration,
      previousDuration: row.previous_duration,
      percentageIncrease: parseFloat(row.percentage_increase || 0),
      alertedAt: row.alerted_at,
    }));
  }

  async getMetricsTrend(projectId: string, days: number = 30): Promise<any[]> {
    const result = await pool.query(
      `SELECT date, total_tests, passed_tests, failed_tests, skipped_tests, pass_rate, avg_duration, 
              total_duration, flakiness_percentage, stability
       FROM daily_metrics 
       WHERE project_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY date ASC`,
      [projectId]
    );

    return result.rows.map((row: any) => ({
      date: row.date,
      metrics: {
        totalTests: row.total_tests,
        passedTests: row.passed_tests,
        failedTests: row.failed_tests,
        skippedTests: row.skipped_tests,
        passRate: parseFloat(row.pass_rate),
        avgDuration: parseFloat(row.avg_duration),
        totalDuration: row.total_duration,
        flakinessPercentage: parseFloat(row.flakiness_percentage),
        stability: parseFloat(row.stability),
        failureRate: 0,
      },
    }));
  }

  async getRecentTests(projectId: string, limit: number = 20): Promise<TestResult[]> {
    const result = await pool.query(
      `SELECT * FROM test_results 
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      testId: row.test_id,
      testName: row.test_name,
      status: row.status,
      duration: row.duration,
      retries: row.retries,
      flakyAttempts: row.flaky_attempts,
      startTime: row.start_time,
      endTime: row.end_time,
      error: row.error,
      tags: row.tags,
      browser: row.browser,
      os: row.os,
      environment: row.environment,
      buildId: row.build_id,
      commitHash: row.commit_hash,
      branchName: row.branch_name,
      author: row.author,
      traceUrl: row.trace_url,
      tracePath: row.trace_path,
    }));
  }

  async getBrowserMetrics(projectId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        browser,
        COUNT(*) as total_tests,
        SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as passed_tests,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_tests,
        SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped_tests,
        ROUND(AVG(duration)::numeric, 2) as avg_duration,
        SUM(duration) as total_duration,
        ROUND((SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100)::numeric, 2) as pass_rate
       FROM test_results 
       WHERE project_id = $1
       GROUP BY browser
       ORDER BY total_tests DESC`,
      [projectId]
    );

    return result.rows.map((row: any) => ({
      browser: row.browser,
      totalTests: parseInt(row.total_tests) || 0,
      passedTests: parseInt(row.passed_tests) || 0,
      failedTests: parseInt(row.failed_tests) || 0,
      skippedTests: parseInt(row.skipped_tests) || 0,
      avgDuration: parseFloat(row.avg_duration) || 0,
      totalDuration: parseInt(row.total_duration) || 0,
      passRate: parseFloat(row.pass_rate) || 0,
    }));
  }

  async getTestsByBrowser(projectId: string, browser: string, limit: number = 50): Promise<TestResult[]> {
    const result = await pool.query(
      `SELECT * FROM test_results 
       WHERE project_id = $1 AND COALESCE(browser, 'unknown') = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [projectId, browser, limit]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      testId: row.test_id,
      testName: row.test_name,
      status: row.status,
      duration: row.duration,
      retries: row.retries,
      flakyAttempts: row.flaky_attempts,
      startTime: row.start_time,
      endTime: row.end_time,
      error: row.error,
      tags: row.tags,
      browser: row.browser,
      os: row.os,
      environment: row.environment,
      buildId: row.build_id,
      commitHash: row.commit_hash,
      branchName: row.branch_name,
      author: row.author,
      traceUrl: row.trace_url,
      tracePath: row.trace_path,
    }));
  }

  async getBrowserMetricsTrend(projectId: string, days: number = 30): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        browser,
        COUNT(*) as total_tests,
        SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as passed_tests,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_tests,
        ROUND((SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100)::numeric, 2) as pass_rate
       FROM test_results 
       WHERE project_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at), browser
       ORDER BY date DESC, browser`,
      [projectId]
    );

    return result.rows.map((row: any) => ({
      date: row.date,
      browser: row.browser,
      totalTests: parseInt(row.total_tests) || 0,
      passedTests: parseInt(row.passed_tests) || 0,
      failedTests: parseInt(row.failed_tests) || 0,
      passRate: parseFloat(row.pass_rate) || 0,
    }));
  }

  async getTestRuns(projectId: string, limit: number = 20): Promise<any[]> {
    // Group tests by build_id if available, otherwise by 5-minute time windows
    const result = await pool.query(
      `SELECT 
        COALESCE(build_id, DATE_TRUNC('minute', created_at)::text) as run_id,
        MIN(created_at) as run_start_time,
        MAX(created_at) as run_end_time,
        COUNT(*) as total_tests,
        SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as passed_tests,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_tests,
        SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped_tests,
        SUM(duration) as total_duration,
        ROUND(AVG(duration)::numeric, 2) as avg_duration,
        ROUND((SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100)::numeric, 2) as pass_rate,
        branch_name,
        commit_hash,
        author
       FROM test_results
       WHERE project_id = $1
       GROUP BY COALESCE(build_id, DATE_TRUNC('minute', created_at)::text), branch_name, commit_hash, author
       ORDER BY run_start_time DESC
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows.map((row: any) => ({
      runId: row.run_id,
      startTime: row.run_start_time,
      endTime: row.run_end_time,
      totalTests: parseInt(row.total_tests) || 0,
      passedTests: parseInt(row.passed_tests) || 0,
      failedTests: parseInt(row.failed_tests) || 0,
      skippedTests: parseInt(row.skipped_tests) || 0,
      totalDuration: parseInt(row.total_duration) || 0,
      avgDuration: parseFloat(row.avg_duration) || 0,
      passRate: parseFloat(row.pass_rate) || 0,
      branchName: row.branch_name,
      commitHash: row.commit_hash,
      author: row.author,
    }));
  }

  async getTestsByRun(projectId: string, runId: string): Promise<TestResult[]> {
    // Get all tests from a specific run
    // runId can be either a build_id or a datetime string (from DATE_TRUNC)
    let query = `
      SELECT * FROM test_results 
      WHERE project_id = $1 AND (
        build_id = $2 OR 
        DATE_TRUNC('minute', created_at)::text = $2
      )
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [projectId, runId]);

    return result.rows.map((row: any) => this.mapRowToTestResult(row));
  }

  async getTraceFileByTestResultId(testResultId: string): Promise<{ fileName: string; contentBase64: string } | null> {
    let result;
    try {
      result = await pool.query(
        `SELECT file_name, content_base64 FROM trace_files WHERE test_result_id = $1 LIMIT 1`,
        [testResultId]
      );
    } catch (error: any) {
      if (error.message?.includes('relation "trace_files" does not exist')) {
        return null;
      }
      throw error;
    }

    if (result.rows.length === 0) {
      return null;
    }

    return {
      fileName: result.rows[0].file_name || 'trace.zip',
      contentBase64: result.rows[0].content_base64,
    };
  }

  private mapRowToTestResult(row: any): TestResult {
    return {
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      testId: row.test_id,
      testName: row.test_name,
      status: row.status,
      duration: row.duration,
      retries: row.retries,
      flakyAttempts: row.flaky_attempts,
      startTime: row.start_time,
      endTime: row.end_time,
      error: row.error,
      tags: row.tags,
      browser: row.browser,
      os: row.os,
      environment: row.environment,
      buildId: row.build_id,
      commitHash: row.commit_hash,
      branchName: row.branch_name,
      author: row.author,
      traceUrl: row.trace_url,
      tracePath: row.trace_path,
    };
  }
}

export default new TestService();
