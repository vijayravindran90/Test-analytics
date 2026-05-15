import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, ChevronDown } from 'lucide-react';
import { useDashboardData, useProject, useTestRuns, updateProject } from '../api/hooks';
import MetricCard from '../components/MetricCard';
import FlakyTestsList from '../components/FlakyTestsList';
import PerformanceAlerts from '../components/PerformanceAlerts';
import { TrendChart, DurationChart, MetricsOverviewChart } from '../components/Charts';
import { TestRunsList } from '../components/TestRunsList';
import { formatDuration, formatPercent } from '../utils/format';
import type { TestResult } from 'test-analytics-shared';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [isWebhookVisible, setIsWebhookVisible] = useState(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [webhookSaveError, setWebhookSaveError] = useState<string | null>(null);
  const [webhookSaveSuccess, setWebhookSaveSuccess] = useState<string | null>(null);

  if (!projectId) {
    return <div>Project not found</div>;
  }

  const { project, loading: projectLoading } = useProject(projectId);
  const { data: dashboardData, loading: dataLoading, error } = useDashboardData(projectId, days);
  const { runs: testRuns, loading: runsLoading } = useTestRuns(projectId, 20);

  React.useEffect(() => {
    if (project?.slackWebhookUrl) {
      setSlackWebhookUrl(project.slackWebhookUrl);
    }
  }, [project]);

  const saveSlackWebhook = async () => {
    setWebhookSaveError(null);
    setWebhookSaveSuccess(null);
    setIsSavingWebhook(true);

    try {
      await updateProject(projectId, { slackWebhookUrl: slackWebhookUrl.trim() || null });
      setWebhookSaveSuccess('Slack webhook saved successfully.');
    } catch (err: any) {
      setWebhookSaveError(err?.response?.data?.error || err?.message || 'Failed to save Slack webhook');
    } finally {
      setIsSavingWebhook(false);
    }
  };

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

  const downloadCsvReport = () => {
    const now = new Date();
    const safeFileBase = (project?.name || 'project-report').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    const datePart = now.toISOString().split('T')[0];

    const escapeCsv = (value: string | number | boolean | null | undefined): string => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const csvContent = [
      // Header Info
      `Project Report - ${project?.name || 'Project'}`,
      `Generated at,${now.toLocaleString()}`,
      `Range,Last ${days} days`,
      '',
      // Metrics Summary
      'METRICS SUMMARY',
      `Metric,Value`,
      `Pass Rate,${formatPercent(metrics.passRate)}`,
      `Failure Rate,${formatPercent(metrics.failureRate)}`,
      `Flakiness,${formatPercent(metrics.flakinessPercentage)}`,
      `Stability,${formatPercent(metrics.stability)}`,
      `Total Tests,${metrics.totalTests}`,
      `Passed Tests,${metrics.passedTests}`,
      `Failed Tests,${metrics.failedTests}`,
      `Skipped Tests,${metrics.skippedTests}`,
      `Average Duration,${formatDuration(metrics.avgDuration)}`,
      `Total Duration,${formatDuration(metrics.totalDuration)}`,
      '',
      // Recent Tests
      'RECENT TESTS',
      'Test Name,Status,Duration,Retries,Browser',
      ...recentTests.slice(0, 30).map(
        (test: TestResult) =>
          `${escapeCsv(test.testName)},${escapeCsv(test.status)},${formatDuration(test.duration)},${test.retries},${escapeCsv(test.browser || 'unknown')}`
      ),
      '',
      // Flaky Tests
      'FLAKY TESTS',
      'Test Name,Flakiness Percentage,Total Runs,Trend',
      ...flakyTests.slice(0, 20).map(
        (test: any) =>
          `${escapeCsv(test.testName)},${formatPercent(test.flakinessPercentage)},${test.totalRuns},${escapeCsv(test.trend || 'stable')}`
      ),
      '',
      // Performance Alerts
      'PERFORMANCE ALERTS',
      'Test Name,Current Duration,Increase Percentage,Alerted At',
      ...performanceAlerts.slice(0, 20).map(
        (alert: any) =>
          `${escapeCsv(alert.testName)},${formatDuration(alert.currentDuration)},${alert.percentageIncrease?.toFixed(2) || '0.00'}%,${new Date(alert.alertedAt).toLocaleString()}`
      ),
      '',
      // Test Runs
      'TEST RUNS',
      'Run Start,Total Tests,Passed,Failed,Skipped,Pass Rate,Total Duration',
      ...testRuns.slice(0, 30).map(
        (run: any) =>
          `${new Date(run.startTime).toLocaleString()},${run.totalTests},${run.passedTests},${run.failedTests},${run.skippedTests},${formatPercent(run.passRate)},${formatDuration(run.totalDuration)}`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFileBase || 'project-report'}-${datePart}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadJsonReport = () => {
    const now = new Date();
    const safeFileBase = (project?.name || 'project-report').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    const datePart = now.toISOString().split('T')[0];

    const jsonData = {
      project: {
        name: project?.name,
        description: project?.description,
        projectId,
      },
      generatedAt: now.toISOString(),
      timeRange: {
        days,
        period: `Last ${days} days`,
      },
      metrics: {
        passRate: metrics.passRate,
        failureRate: metrics.failureRate,
        flakinessPercentage: metrics.flakinessPercentage,
        stability: metrics.stability,
        totalTests: metrics.totalTests,
        passedTests: metrics.passedTests,
        failedTests: metrics.failedTests,
        skippedTests: metrics.skippedTests,
        avgDuration: metrics.avgDuration,
        totalDuration: metrics.totalDuration,
      },
      recentTests: recentTests.slice(0, 30).map((test: TestResult) => ({
        testName: test.testName,
        status: test.status,
        duration: test.duration,
        retries: test.retries,
        browser: test.browser,
      })),
      flakyTests: flakyTests.slice(0, 20).map((test: any) => ({
        testName: test.testName,
        flakinessPercentage: test.flakinessPercentage,
        totalRuns: test.totalRuns,
        trend: test.trend,
      })),
      performanceAlerts: performanceAlerts.slice(0, 20).map((alert: any) => ({
        testName: alert.testName,
        currentDuration: alert.currentDuration,
        percentageIncrease: alert.percentageIncrease,
        alertedAt: alert.alertedAt,
      })),
      testRuns: testRuns.slice(0, 30).map((run: any) => ({
        startTime: run.startTime,
        totalTests: run.totalTests,
        passedTests: run.passedTests,
        failedTests: run.failedTests,
        skippedTests: run.skippedTests,
        passRate: run.passRate,
        totalDuration: run.totalDuration,
      })),
      trends: transformedTrends,
    };

    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFileBase || 'project-report'}-${datePart}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPdfReport = async () => {
    try {
      const now = new Date();
      const safeFileBase = (project?.name || 'project-report').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
      const datePart = now.toISOString().split('T')[0];
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const safeProjectName = project?.name || 'Project';
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const lineHeight = 7;
      let yPosition = margin;

      const addNewPageIfNeeded = (heightNeeded: number) => {
        if (yPosition + heightNeeded > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Title
      pdf.setFontSize(24);
      pdf.text(`${safeProjectName} - Test Analytics Report`, margin, yPosition);
      yPosition += 10;

      // Generation Info
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated: ${now.toLocaleString()} | Range: Last ${days} days`, margin, yPosition);
      yPosition += 8;
      pdf.setTextColor(0, 0, 0);

      // Metrics Summary
      addNewPageIfNeeded(40);
      pdf.setFontSize(14);
      pdf.text('METRICS SUMMARY', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      const metricsData = [
        [`Pass Rate: ${formatPercent(metrics.passRate)}`, `Failure Rate: ${formatPercent(metrics.failureRate)}`],
        [`Flakiness: ${formatPercent(metrics.flakinessPercentage)}`, `Stability: ${formatPercent(metrics.stability)}`],
        [`Total Tests: ${metrics.totalTests}`, `Passed: ${metrics.passedTests}`],
        [`Failed: ${metrics.failedTests}`, `Skipped: ${metrics.skippedTests}`],
        [`Avg Duration: ${formatDuration(metrics.avgDuration)}`, `Total Duration: ${formatDuration(metrics.totalDuration)}`],
      ];

      for (const row of metricsData) {
        addNewPageIfNeeded(lineHeight);
        pdf.text(`  ${row[0]}`, margin, yPosition);
        pdf.text(`  ${row[1]}`, margin + (pageWidth - 2 * margin) / 2, yPosition);
        yPosition += lineHeight;
      }

      yPosition += 4;

      // Recent Tests Table
      addNewPageIfNeeded(30);
      pdf.setFontSize(12);
      pdf.text('RECENT TESTS (Top 10)', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(9);
      const recentTestsSlice = recentTests.slice(0, 10);
      for (const test of recentTestsSlice) {
        addNewPageIfNeeded(lineHeight + 2);
        pdf.text(`• ${test.testName} - ${test.status} (${formatDuration(test.duration)})`, margin + 5, yPosition);
        yPosition += lineHeight;
      }

      // Flaky Tests
      addNewPageIfNeeded(20);
      yPosition += 4;
      pdf.setFontSize(12);
      pdf.text('FLAKY TESTS (Top 10)', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(9);
      const flakyTestsSlice = flakyTests.slice(0, 10);
      for (const test of flakyTestsSlice) {
        addNewPageIfNeeded(lineHeight + 2);
        pdf.text(`• ${test.testName} - Flakiness: ${formatPercent(test.flakinessPercentage)} (${test.totalRuns} runs)`, margin + 5, yPosition);
        yPosition += lineHeight;
      }

      // Performance Alerts
      addNewPageIfNeeded(20);
      yPosition += 4;
      pdf.setFontSize(12);
      pdf.text('PERFORMANCE ALERTS (Top 10)', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(9);
      const alertsSlice = performanceAlerts.slice(0, 10);
      for (const alert of alertsSlice) {
        addNewPageIfNeeded(lineHeight + 2);
        pdf.text(`• ${alert.testName} - ${alert.percentageIncrease?.toFixed(2) || 0}% increase`, margin + 5, yPosition);
        yPosition += lineHeight;
      }

      pdf.save(`${safeFileBase || 'project-report'}-${datePart}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report');
    }
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
          {/* Download Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsDownloadOpen(!isDownloadOpen);
                setIsIntegrationOpen(false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg bg-white hover:bg-neutral-50 transition"
            >
              <Download className="w-4 h-4" />
              Download
              <ChevronDown className="w-4 h-4" />
            </button>
            {isDownloadOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border rounded-lg shadow-lg z-10">
                <button
                  type="button"
                  onClick={() => {
                    downloadHtmlReport();
                    setIsDownloadOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-neutral-50 first:rounded-t-lg"
                >
                  📄 Download as HTML
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCsvReport();
                    setIsDownloadOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-neutral-50"
                >
                  📊 Download as CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadJsonReport();
                    setIsDownloadOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-neutral-50"
                >
                  🔗 Download as JSON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadPdfReport();
                    setIsDownloadOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-neutral-50 last:rounded-b-lg"
                >
                  📑 Download as PDF
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsIntegrationOpen(!isIntegrationOpen);
              setIsDownloadOpen(false);
            }}
            className="inline-flex items-center justify-center px-4 py-2 border rounded-lg bg-white hover:bg-neutral-50 transition"
          >
            Integration
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

      {isIntegrationOpen && (
        <div className="card p-6 border border-neutral-200 bg-white shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Slack Integration</h2>
              <p className="text-sm text-neutral-600">Configure a Slack incoming webhook to receive performance alert notifications.</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-neutral-700">Slack Webhook URL</label>
            <div className="relative">
              <input
                type={isWebhookVisible ? 'url' : 'password'}
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 pr-24 focus:border-primary-500 focus:outline-none"
                placeholder="https://hooks.slack.com/services/YOUR_TEAM_ID/YOUR_CHANNEL_ID/YOUR_WEBHOOK_TOKEN"
              />
              <button
                type="button"
                onClick={() => setIsWebhookVisible((visible) => !visible)}
                className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                {isWebhookVisible ? 'Hide' : 'Show'}
              </button>
            </div>
            {webhookSaveError && <p className="text-sm text-danger-700">{webhookSaveError}</p>}
            {webhookSaveSuccess && <p className="text-sm text-success-700">{webhookSaveSuccess}</p>}
            <button
              type="button"
              onClick={saveSlackWebhook}
              disabled={isSavingWebhook}
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingWebhook ? 'Saving...' : 'Save Slack Webhook'}
            </button>
          </div>
        </div>
      )}

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
