import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useDashboardData, useProject, useBrowserMetrics, useBrowserTrends } from '../api/hooks';
import MetricCard from '../components/MetricCard';
import FlakyTestsList from '../components/FlakyTestsList';
import PerformanceAlerts from '../components/PerformanceAlerts';
import { TrendChart, DurationChart, MetricsOverviewChart } from '../components/Charts';
import { BrowserMetricsTable, BrowserMetricsChart } from '../components/BrowserMetrics';
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
  const { metrics: browserMetrics, loading: browserLoading } = useBrowserMetrics(projectId);
  const { trends: browserTrends } = useBrowserTrends(projectId, days);

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

      {/* Browser Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {browserMetrics && browserMetrics.length > 0 && (
          <>
            <BrowserMetricsChart
              data={browserMetrics}
              title="Tests by Browser"
            />
            {browserTrends && browserTrends.length > 0 && (
              <BrowserMetricsChart
                data={browserTrends}
                title="Browser Pass Rate Trend"
              />
            )}
          </>
        )}
      </div>

      {browserMetrics && browserMetrics.length > 0 && (
        <BrowserMetricsTable metrics={browserMetrics} title="Browser Performance Summary" />
      )}

      {/* Recent Tests */}
      <div className="card">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Recent Tests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-neutral-50">
                <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">
                  Test
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">
                  Browser
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">
                  Retries
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">
                  Branch
                </th>
              </tr>
            </thead>
            <tbody>
              {recentTests.slice(0, 10).map((test: TestResult) => (
                <tr key={test.id} className="border-b hover:bg-neutral-50">
                  <td className="px-6 py-3 text-sm">
                    <p className="font-medium text-neutral-900">{test.testName}</p>
                    <p className="text-xs text-neutral-500">{test.testId}</p>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        test.status === 'PASSED'
                          ? 'bg-success-50 text-success-700'
                          : test.status === 'FAILED'
                          ? 'bg-danger-50 text-danger-700'
                          : 'bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      {test.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-neutral-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {test.browser || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-neutral-900">
                    {formatDuration(test.duration)}
                  </td>
                  <td className="px-6 py-3 text-sm text-neutral-900">{test.retries}</td>
                  <td className="px-6 py-3 text-sm text-neutral-600">
                    {test.branchName || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
