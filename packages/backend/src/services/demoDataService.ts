import { v4 as uuidv4 } from 'uuid';
import pool from '../db';

// Generates a realistic-looking demo project (multiple modules, browsers, ~3
// weeks of history, one deliberately-flaky module, and a recent performance
// regression) so a test/demo account has something worth screenshotting for
// every dashboard feature - trends, heatmap, flaky tests, guardrails,
// confidence score, performance alerts - without needing a real CI pipeline.

interface ModuleSpec {
  folder: string;
  tests: string[];
  flakiness: number; // baseline probability a run fails before any retry
}

const MODULES: ModuleSpec[] = [
  { folder: 'tests/auth', tests: ['login.spec.ts', 'signup.spec.ts', 'logout.spec.ts', 'password-reset.spec.ts'], flakiness: 0.02 },
  { folder: 'tests/checkout', tests: ['cart.spec.ts', 'payment.spec.ts', 'shipping.spec.ts'], flakiness: 0.27 },
  { folder: 'tests/search', tests: ['filters.spec.ts', 'results.spec.ts', 'autocomplete.spec.ts'], flakiness: 0.09 },
  { folder: 'tests/profile', tests: ['settings.spec.ts', 'notifications.spec.ts'], flakiness: 0.015 },
  { folder: 'tests/orders', tests: ['order-history.spec.ts', 'tracking.spec.ts'], flakiness: 0.05 },
];

const BROWSERS = ['chromium', 'firefox', 'webkit'];
const DAYS = 21;
const RECENT_DAYS = 3;
const REGRESSION_MODULE = 'tests/checkout';
const REGRESSION_DAYS = 2;

export const DEFAULT_DEMO_PROJECT_NAME = 'ShopWave E2E Suite';

interface DailyAgg {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  totalDuration: number;
}

interface TestAgg {
  testName: string;
  total: number;
  passed: number;
  failed: number;
  recentTotal: number;
  recentFailed: number;
}

export async function seedDemoProject(
  userId: string,
  userEmail: string,
  projectName: string = DEFAULT_DEMO_PROJECT_NAME
): Promise<{ projectId: string; projectName: string; testResultCount: number }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM projects WHERE user_id = $1 AND name = $2', [userId, projectName]);

    let projectId: string;
    if (existing.rows.length > 0) {
      projectId = existing.rows[0].id;
      // Clean re-seed: wipe this project's previous demo data (cascades to trace/image files).
      await client.query('DELETE FROM test_results WHERE project_id = $1', [projectId]);
      await client.query('DELETE FROM flaky_tests WHERE project_id = $1', [projectId]);
      await client.query('DELETE FROM daily_metrics WHERE project_id = $1', [projectId]);
      await client.query('DELETE FROM performance_alerts WHERE project_id = $1', [projectId]);
    } else {
      projectId = uuidv4();
      await client.query(
        `INSERT INTO projects (id, name, description, owner, user_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [projectId, projectName, 'Demo project with sample data for exploring the dashboard', userEmail, userId]
      );
    }

    const dailyAgg = new Map<string, DailyAgg>();
    const testAgg = new Map<string, TestAgg>();
    const perfAlertCandidates: { testId: string; testName: string; duration: number; previousDuration: number }[] = [];

    const now = Date.now();
    let testResultCount = 0;

    for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
      const dayDate = new Date(now - dayOffset * 24 * 60 * 60 * 1000);
      const dateKey = dayDate.toISOString().split('T')[0];
      const isRecentDay = dayOffset < RECENT_DAYS;
      const isRegressionDay = dayOffset < REGRESSION_DAYS;
      // One commit per day, like a real CI build - not one per test result, which
      // would fragment "Test Runs" into a separate run per individual test.
      const commitHash = Math.random().toString(16).slice(2, 10);

      for (const mod of MODULES) {
        for (const testFile of mod.tests) {
          for (const browser of BROWSERS) {
            // Not every test runs on every browser every day - keep chromium as the
            // primary lane, thin out firefox/webkit a bit for realism.
            if (browser !== 'chromium' && Math.random() < 0.35) continue;

            const testId = `${mod.folder}/${testFile}::should behave correctly`;
            const testName = 'should behave correctly';
            const isRegression = isRegressionDay && mod.folder === REGRESSION_MODULE;

            const failProbability = mod.flakiness + (isRegression ? 0.25 : 0);
            const firstAttemptFailed = Math.random() < failProbability;
            const retriedToPass = firstAttemptFailed && Math.random() < 0.5;
            const finalStatus: 'PASSED' | 'FAILED' = firstAttemptFailed && !retriedToPass ? 'FAILED' : 'PASSED';
            const retries = firstAttemptFailed ? 1 : 0;
            const flakyAttempts = firstAttemptFailed ? 1 : 0;

            const baseDuration = 800 + Math.random() * 2200;
            const duration = Math.round(baseDuration * (isRegression ? 2 + Math.random() * 0.6 : 1));

            // For "today" (dayOffset 0), a forward offset from dayDate (which is ~now)
            // could land in the future - keep today's runs strictly in the past instead.
            const startTime =
              dayOffset === 0
                ? new Date(now - Math.random() * 8 * 60 * 60 * 1000)
                : new Date(dayDate.getTime() + Math.random() * 8 * 60 * 60 * 1000);
            const endTime = new Date(startTime.getTime() + duration);

            await client.query(
              `INSERT INTO test_results
               (id, project_id, project_name, test_id, test_name, status, duration, retries, flaky_attempts,
                start_time, end_time, tags, browser, os, environment, build_id, commit_hash, branch_name, author, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
              [
                uuidv4(),
                projectId,
                projectName,
                testId,
                testName,
                finalStatus,
                duration,
                retries,
                flakyAttempts,
                startTime,
                endTime,
                [],
                browser,
                browser === 'webkit' ? 'macOS' : 'linux',
                'ci',
                `build-${dateKey}`,
                commitHash,
                'main',
                'ci-bot',
                startTime,
              ]
            );
            testResultCount += 1;

            const daily = dailyAgg.get(dateKey) || { total: 0, passed: 0, failed: 0, skipped: 0, totalDuration: 0 };
            daily.total += 1;
            if (finalStatus === 'PASSED') daily.passed += 1;
            else daily.failed += 1;
            daily.totalDuration += duration;
            dailyAgg.set(dateKey, daily);

            const t = testAgg.get(testId) || { testName, total: 0, passed: 0, failed: 0, recentTotal: 0, recentFailed: 0 };
            t.total += 1;
            if (finalStatus === 'PASSED') t.passed += 1;
            else t.failed += 1;
            if (isRecentDay) {
              t.recentTotal += 1;
              if (finalStatus === 'FAILED') t.recentFailed += 1;
            }
            testAgg.set(testId, t);

            if (isRegression && dayOffset === 0) {
              perfAlertCandidates.push({ testId, testName, duration, previousDuration: Math.round(duration / 2.3) });
            }
          }
        }
      }
    }

    for (const [dateKey, agg] of dailyAgg) {
      const passRate = (agg.passed / agg.total) * 100;
      const avgDuration = agg.totalDuration / agg.total;
      const flakinessPercentage = (agg.failed / agg.total) * 100;

      await client.query(
        `INSERT INTO daily_metrics
         (id, project_id, date, total_tests, passed_tests, failed_tests, skipped_tests, pass_rate, avg_duration, total_duration, flakiness_percentage, stability)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (project_id, date) DO UPDATE SET
           total_tests = $4, passed_tests = $5, failed_tests = $6, skipped_tests = $7,
           pass_rate = $8, avg_duration = $9, total_duration = $10, flakiness_percentage = $11, stability = $12`,
        [uuidv4(), projectId, dateKey, agg.total, agg.passed, agg.failed, agg.skipped, passRate, avgDuration, agg.totalDuration, flakinessPercentage, passRate]
      );
    }

    for (const [testId, t] of testAgg) {
      if (t.failed === 0) continue;

      const flakinessPercentage = (t.failed / t.total) * 100;
      let trend: 'improving' | 'degrading' | 'stable' = 'stable';
      if (t.recentTotal > 0) {
        const recentRate = (t.recentFailed / t.recentTotal) * 100;
        if (recentRate > flakinessPercentage + 5) trend = 'degrading';
        else if (recentRate < flakinessPercentage - 5) trend = 'improving';
      }

      await client.query(
        `INSERT INTO flaky_tests
         (id, project_id, test_id, test_name, flakiness_percentage, total_runs, passed_runs, failed_runs, trend, last_flake_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW())
         ON CONFLICT (project_id, test_id) DO UPDATE SET
           flakiness_percentage = $5, total_runs = $6, passed_runs = $7, failed_runs = $8, trend = $9, updated_at = CURRENT_TIMESTAMP`,
        [uuidv4(), projectId, testId, t.testName, flakinessPercentage, t.total, t.passed, t.failed, trend]
      );
    }

    for (const alert of perfAlertCandidates.slice(0, 4)) {
      const percentageIncrease = ((alert.duration - alert.previousDuration) / alert.previousDuration) * 100;
      await client.query(
        `INSERT INTO performance_alerts
         (id, project_id, test_id, test_name, threshold, current_duration, previous_duration, percentage_increase)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uuidv4(), projectId, alert.testId, alert.testName, 5000, alert.duration, alert.previousDuration, percentageIncrease]
      );
    }

    await client.query('COMMIT');
    return { projectId, projectName, testResultCount };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
