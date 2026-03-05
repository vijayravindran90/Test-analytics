import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { FlakyTest } from '@test-analytics/shared';
import { formatPercent } from '../utils/format';

interface FlakyTestsListProps {
  tests: FlakyTest[];
  loading?: boolean;
}

export default function FlakyTestsList({ tests, loading }: FlakyTestsListProps) {
  if (loading) {
    return <div className="card p-6">Loading flaky tests...</div>;
  }

  if (tests.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-neutral-600">No flaky tests detected</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning-500" />
          Flaky Tests
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-neutral-50">
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Test Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Flakiness</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Runs</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Passes</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Failures</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Trend</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => (
              <tr key={test.testId} className="border-b hover:bg-neutral-50">
                <td className="px-6 py-3 text-sm">
                  <p className="font-medium text-neutral-900 truncate">{test.testName}</p>
                  <p className="text-xs text-neutral-500">{test.testId}</p>
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-50 text-warning-700">
                    {formatPercent(test.flakinessPercentage)}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-neutral-900">{test.totalRuns}</td>
                <td className="px-6 py-3 text-sm">
                  <span className="text-success-600 font-medium">{test.passedRuns}</span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className="text-danger-600 font-medium">{test.failedRuns}</span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <div className="flex items-center gap-1">
                    {test.trend === 'improving' && (
                      <>
                        <TrendingDown className="w-4 h-4 text-success-600" />
                        <span className="text-success-600">Improving</span>
                      </>
                    )}
                    {test.trend === 'degrading' && (
                      <>
                        <TrendingUp className="w-4 h-4 text-danger-600" />
                        <span className="text-danger-600">Degrading</span>
                      </>
                    )}
                    {test.trend === 'stable' && (
                      <span className="text-neutral-600">Stable</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
