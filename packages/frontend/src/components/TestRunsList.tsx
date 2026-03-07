import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTestRunDetails } from '../api/hooks';
import { formatDuration, formatPercent } from '../utils/format';
import type { TestResult } from 'test-analytics-shared';

interface TestRun {
  runId: string;
  startTime: Date;
  endTime: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  avgDuration: number;
  passRate: number;
  branchName?: string;
  commitHash?: string;
  author?: string;
}

interface TestRunsListProps {
  projectId: string;
  runs: TestRun[];
  loading?: boolean;
}

export function TestRunsList({ projectId, runs, loading = false }: TestRunsListProps) {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const { tests, loading: testsLoading } = useTestRunDetails(projectId, expandedRunId);

  if (loading) {
    return (
      <div className="card p-6 text-center">
        <p className="text-neutral-600">Loading test runs...</p>
      </div>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-neutral-600">No test runs found</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Test Runs</h3>
      </div>
      <div className="divide-y">
        {runs.map((run: TestRun) => (
          <div key={run.runId}>
            {/* Run Header */}
            <button
              onClick={() =>
                setExpandedRunId(expandedRunId === run.runId ? null : run.runId)
              }
              className="w-full px-6 py-4 hover:bg-neutral-50 transition flex items-center gap-4"
            >
              <div className="flex-shrink-0">
                {expandedRunId === run.runId ? (
                  <ChevronDown className="w-5 h-5 text-neutral-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-neutral-600" />
                )}
              </div>

              <div className="flex-1 text-left">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {new Date(run.startTime).toLocaleString()}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {run.totalTests} tests • {formatDuration(run.totalDuration)}
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-neutral-900">
                        {run.passedTests}
                      </p>
                      <p className="text-xs text-success-600">Passed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-neutral-900">
                        {run.failedTests}
                      </p>
                      <p className="text-xs text-danger-600">Failed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-neutral-900">
                        {run.skippedTests}
                      </p>
                      <p className="text-xs text-neutral-600">Skipped</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-neutral-900">
                        {formatPercent(run.passRate)}
                      </p>
                      <p className="text-xs text-neutral-600">Pass Rate</p>
                    </div>
                  </div>

                  {run.branchName && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-900">
                        {run.branchName}
                      </p>
                      {run.author && (
                        <p className="text-xs text-neutral-600">{run.author}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>

            {/* Expanded Tests */}
            {expandedRunId === run.runId && (
              <div className="bg-neutral-50 border-t">
                {testsLoading ? (
                  <div className="p-6 text-center text-neutral-600">
                    Loading tests...
                  </div>
                ) : tests && tests.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-neutral-100">
                          <th className="px-6 py-3 text-left text-sm font-medium text-neutral-700">
                            Test Name
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-neutral-700">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-neutral-700">
                            Browser
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-neutral-700">
                            Duration
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-neutral-700">
                            Retries
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tests.map((test: TestResult) => (
                          <tr
                            key={test.id}
                            className="border-b hover:bg-neutral-100"
                          >
                            <td className="px-6 py-3 text-sm">
                              <p className="font-medium text-neutral-900">
                                {test.testName}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {test.testId}
                              </p>
                            </td>
                            <td className="px-6 py-3 text-sm">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  test.status === 'PASSED'
                                    ? 'bg-success-50 text-success-700'
                                    : test.status === 'FAILED'
                                    ? 'bg-danger-50 text-danger-700'
                                    : test.status === 'SKIPPED'
                                    ? 'bg-neutral-50 text-neutral-700'
                                    : 'bg-warning-50 text-warning-700'
                                }`}
                              >
                                {test.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                {test.browser || 'unknown'}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm text-neutral-900">
                              {formatDuration(test.duration)}
                            </td>
                            <td className="px-6 py-3 text-sm text-neutral-900">
                              {test.retries}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-neutral-600">
                    No tests in this run
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
