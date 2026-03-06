import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface BrowserMetricsChartProps {
  data: any[];
  title: string;
}

export function BrowserMetricsChart({ data, title }: BrowserMetricsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-neutral-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="browser" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="totalTests" fill="#8884d8" name="Total Tests" />
          <Bar yAxisId="left" dataKey="passedTests" fill="#82ca9d" name="Passed" />
          <Bar yAxisId="left" dataKey="failedTests" fill="#fca5c3" name="Failed" />
          <Bar yAxisId="right" dataKey="passRate" fill="#ffc658" name="Pass Rate %" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BrowserTrendChart({ data, title }: BrowserMetricsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-neutral-600">No data available</p>
      </div>
    );
  }

  // Group data by browser for the chart
  const browsers = [...new Set(data.map((d: any) => d.browser))];
  const chartData = data.map((d: any) => ({
    date: typeof d.date === 'string' ? d.date : new Date(d.date).toISOString().split('T')[0],
    browser: d.browser,
    passRate: d.passRate,
    totalTests: d.totalTests,
  }));

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {browsers.map((browser: string, index: number) => (
            <Line
              key={browser}
              dataKey="passRate"
              stroke={['#8884d8', '#82ca9d', '#fca5c3', '#ffc658'][index % 4]}
              name={`${browser} Pass Rate`}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface BrowserMetricsTableProps {
  metrics: any[];
  title?: string;
}

export function BrowserMetricsTable({ metrics, title = 'Browser Metrics' }: BrowserMetricsTableProps) {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="card">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-neutral-600">No browser metrics available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-neutral-50">
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Browser</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Total Tests</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Passed</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Failed</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Skipped</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Pass Rate</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Avg Duration</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric: any, index: number) => (
              <tr key={index} className="border-b hover:bg-neutral-50">
                <td className="px-6 py-3 text-sm font-medium text-neutral-900">
                  {metric.browser || 'unknown'}
                </td>
                <td className="px-6 py-3 text-sm text-neutral-900">{metric.totalTests}</td>
                <td className="px-6 py-3 text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700">
                    {metric.passedTests}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-50 text-danger-700">
                    {metric.failedTests}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-neutral-900">{metric.skippedTests}</td>
                <td className="px-6 py-3 text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    metric.passRate >= 80 ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'
                  }`}>
                    {metric.passRate.toFixed(2)}%
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-neutral-900">
                  {(metric.avgDuration / 1000).toFixed(2)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
