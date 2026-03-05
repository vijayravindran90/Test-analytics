import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TrendChartProps {
  data: Array<{
    date: string;
    metrics: {
      passRate: number;
      failureRate: number;
      flakinessPercentage: number;
      stability: number;
    };
  }>;
  title: string;
  metric?: 'passRate' | 'failureRate' | 'flakinessPercentage' | 'stability';
}

export function TrendChart({ data, title, metric = 'passRate' }: TrendChartProps) {
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString(),
    value: item.metrics[metric],
  }));

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DurationChartProps {
  data: Array<{
    date: string;
    metrics: {
      avgDuration: number;
      totalDuration: number;
    };
  }>;
}

export function DurationChart({ data }: DurationChartProps) {
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString(),
    avg: Math.round(item.metrics.avgDuration),
  }));

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4">Average Test Duration (ms)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="avg" fill="#22c55e" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MetricsOverviewChartProps {
  data: Array<{
    date: string;
    metrics: {
      passRate: number;
      failureRate: number;
      flakinessPercentage: number;
    };
  }>;
}

export function MetricsOverviewChart({ data }: MetricsOverviewChartProps) {
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString(),
    pass: Number(item.metrics.passRate.toFixed(1)),
    fail: Number(item.metrics.failureRate.toFixed(1)),
    flaky: Number(item.metrics.flakinessPercentage.toFixed(1)),
  }));

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4">Test Metrics Overview</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="pass" name="Pass Rate %" fill="#22c55e" stackId="a" />
          <Bar dataKey="fail" name="Failure Rate %" fill="#ef4444" stackId="a" />
          <Bar dataKey="flaky" name="Flakiness %" fill="#f59e0b" stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
