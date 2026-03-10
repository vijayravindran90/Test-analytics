import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Download } from 'lucide-react';
import { useDashboardData, useProject, useTestRuns } from '../api/hooks';
import MetricCard from '../components/MetricCard';
import FlakyTestsList from '../components/FlakyTestsList';
import PerformanceAlerts from '../components/PerformanceAlerts';
import { TrendChart, DurationChart, MetricsOverviewChart } from '../components/Charts';
import { TestRunsList } from '../components/TestRunsList';
import { formatDuration, formatPercent } from '../utils/format';
import type { TestResult } from 'test-analytics-shared';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);

  if (!projectId) {
    return <div>Project not found</div>;
  }

  const { project, loading: projectLoading } = useProject(projectId);
  const { data: dashboardData, loading: dataLoading, error } = useDashboardData(projectId, days);
  const { runs: testRuns, loading: runsLoading } = useTestRuns(projectId, 20);

  if (projectLoading || dataLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-neutral-600">
          <button onClick={() => navigate(-1)} className="hover:text-neutral-900">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="card p-6 text-center">
          <p className="text-neutral-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-neutral-600">
          <button onClick={() => navigate(-1)} className="hover:text-neutral-900">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="card p-6 border-danger-200 bg-danger-50">
          <p className="text-danger-700">Error: {error || 'Failed to load dashboard'}</p>
        </div>
      </div>
    );
  }

  const { metrics, flakyTests, performanceAlerts, trends, recentTests } = dashboardData;

  // Transform trends data to convert Date to string
  const transformedTrends = trends.map((trend: any) => ({
    ...trend,
    date: typeof trend.date === 'string' ? trend.date : new Date(trend.date).toISOString().split('T')[0],
  }));

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const downloadHtmlReport = () => {
    const now = new Date();
    const generatedAt = now.toLocaleString();
    const safeProjectName = escapeHtml(project?.name || 'Project');
    const safeDescription = escapeHtml(project?.description || '');

    const recentRows = recentTests
      .slice(0, 30)
      .map(
        (test: TestResult) =>
          `<tr>
            <td>${escapeHtml(test.testName)}</td>
            <td>${escapeHtml(test.status)}</td>
            <td>${formatDuration(test.duration)}</td>
            <td>${test.retries}</td>
            <td>${escapeHtml(test.browser || 'unknown')}</td>
          </tr>`
      )
      .join('');

    const flakyRows = flakyTests
      .slice(0, 20)
      .map(
        (test: any) =>
          `<tr>
            <td>${escapeHtml(test.testName)}</td>
            <td>${formatPercent(test.flakinessPercentage)}</td>
            <td>${test.totalRuns}</td>
            <td>${escapeHtml(test.trend || 'stable')}</td>
          </tr>`
      )
      .join('');

    const alertRows = performanceAlerts
      .slice(0, 20)
      .map(
        (alert: any) =>
          `<tr>
            <td>${escapeHtml(alert.testName)}</td>
            <td>${formatDuration(alert.currentDuration)}</td>
            <td>${alert.percentageIncrease?.toFixed(2) || '0.00'}%</td>
            <td>${new Date(alert.alertedAt).toLocaleString()}</td>
          </tr>`
      )
      .join('');

    const runRows = testRuns
      .slice(0, 30)
      .map(
        (run: any) =>
          `<tr>
            <td>${new Date(run.startTime).toLocaleString()}</td>
            <td>${run.totalTests}</td>
            <td>${run.passedTests}</td>
            <td>${run.failedTests}</td>
            <td>${run.skippedTests}</td>
            <td>${formatPercent(run.passRate)}</td>
            <td>${formatDuration(run.totalDuration)}</td>
          </tr>`
      )
      .join('');

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeProjectName} - Test Analytics Report</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; color: #1f2937; }
      h1, h2 { margin: 0 0 12px; }
      .muted { color: #6b7280; margin-bottom: 20px; }
      .grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 12px; margin: 18px 0 24px; }
      .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background: #f9fafb; }
      .label { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
      .value { font-size: 22px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0 24px; font-size: 14px; }
      th, td { border: 1px solid #e5e7eb; text-align: left; padding: 8px; vertical-align: top; }
      th { background: #f3f4f6; }
      .section { margin-top: 24px; }
      @media (max-width: 900px) { .grid { grid-template-columns: repeat(2, minmax(120px, 1fr)); } }
    </style>
  </head>
  <body>
    <h1>${safeProjectName} - Test Analytics Report</h1>
    <p class="muted">Generated at ${generatedAt}. Range: last ${days} days.${safeDescription ? ` Description: ${safeDescription}` : ''}</p>

    <div class="grid">
      <div class="card"><div class="label">Pass Rate</div><div class="value">${formatPercent(metrics.passRate)}</div></div>
      <div class="card"><div class="label">Failure Rate</div><div class="value">${formatPercent(metrics.failureRate)}</div></div>
      <div class="card"><div class="label">Flakiness</div><div class="value">${formatPercent(metrics.flakinessPercentage)}</div></div>
      <div class="card"><div class="label">Stability</div><div class="value">${formatPercent(metrics.stability)}</div></div>
      <div class="card"><div class="label">Total Tests</div><div class="value">${metrics.totalTests}</div></div>
      <div class="card"><div class="label">Passed</div><div class="value">${metrics.passedTests}</div></div>
      <div class="card"><div class="label">Failed</div><div class="value">${metrics.failedTests}</div></div>
      <div class="card"><div class="label">Skipped</div><div class="value">${metrics.skippedTests}</div></div>
      <div class="card"><div class="label">Avg Duration</div><div class="value">${formatDuration(metrics.avgDuration)}</div></div>
      <div class="card"><div class="label">Total Duration</div><div class="value">${formatDuration(metrics.totalDuration)}</div></div>
      <div class="card"><div class="label">Trend Points</div><div class="value">${transformedTrends.length}</div></div>
      <div class="card"><div class="label">Test Runs</div><div class="value">${testRuns.length}</div></div>
    </div>

    <div class="section">
      <h2>Recent Tests</h2>
      <table>
        <thead><tr><th>Test</th><th>Status</th><th>Duration</th><th>Retries</th><th>Browser</th></tr></thead>
        <tbody>${recentRows || '<tr><td colspan="5">No recent tests</td></tr>'}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Flaky Tests</h2>
      <table>
        <thead><tr><th>Test</th><th>Flakiness</th><th>Total Runs</th><th>Trend</th></tr></thead>
        <tbody>${flakyRows || '<tr><td colspan="4">No flaky tests</td></tr>'}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Performance Alerts</h2>
      <table>
        <thead><tr><th>Test</th><th>Current Duration</th><th>Increase</th><th>Alerted At</th></tr></thead>
        <tbody>${alertRows || '<tr><td colspan="4">No alerts</td></tr>'}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Test Runs</h2>
      <table>
        <thead><tr><th>Run Start</th><th>Total</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Pass Rate</th><th>Duration</th></tr></thead>
        <tbody>${runRows || '<tr><td colspan="7">No test runs</td></tr>'}</tbody>
      </table>
    </div>
  </body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeFileBase = (project?.name || 'project-report').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    const datePart = now.toISOString().split('T')[0];
    link.href = url;
    link.download = `${safeFileBase || 'project-report'}-${datePart}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-neutral-100 transition"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">{project?.name || 'Project'}</h1>
            {project?.description && (
              <p className="text-neutral-600 mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={downloadHtmlReport}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg bg-white hover:bg-neutral-50 transition"
          >
            <Download className="w-4 h-4" />
            Download HTML
          </button>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          label="Pass Rate"
          value={formatPercent(metrics.passRate)}
          color="success"
        />
        <MetricCard
          label="Failure Rate"
          value={formatPercent(metrics.failureRate)}
          color="danger"
        />
        <MetricCard
          label="Flakiness"
          value={formatPercent(metrics.flakinessPercentage)}
          color="warning"
        />
        <MetricCard
          label="Stability"
          value={formatPercent(metrics.stability)}
          color="primary"
        />
      </div>

      {/* Test Counts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          label="Total Tests"
          value={metrics.totalTests}
        />
        <MetricCard
          label="Passed"
          value={metrics.passedTests}
          color="success"
        />
        <MetricCard
          label="Failed"
          value={metrics.failedTests}
          color="danger"
        />
        <MetricCard
          label="Skipped"
          value={metrics.skippedTests}
        />
      </div>

      {/* Duration Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          label="Average Test Duration"
          value={formatDuration(metrics.avgDuration)}
        />
        <MetricCard
          label="Total Test Duration"
          value={formatDuration(metrics.totalDuration)}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {transformedTrends.length > 0 && (
          <>
            <TrendChart
              data={transformedTrends}
              title="Pass Rate Trend"
              metric="passRate"
            />
            <DurationChart data={transformedTrends} />
            <TrendChart
              data={transformedTrends}
              title="Flakiness Trend"
              metric="flakinessPercentage"
            />
            <MetricsOverviewChart data={transformedTrends} />
          </>
        )}
      </div>

      {/* Flaky Tests */}
      <FlakyTestsList tests={flakyTests} />

      {/* Performance Alerts */}
      <PerformanceAlerts alerts={performanceAlerts} />

      {/* Test Runs */}
      <TestRunsList projectId={projectId} runs={testRuns} loading={runsLoading} projectName={project?.name} />
    </div>
  );
}
