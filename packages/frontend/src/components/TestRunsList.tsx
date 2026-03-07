import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Eye } from 'lucide-react';
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
  projectName?: string;
  runs: TestRun[];
  loading?: boolean;
}

export function TestRunsList({ projectId, projectName = 'Project', runs, loading = false }: TestRunsListProps) {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const { tests, loading: testsLoading } = useTestRunDetails(projectId, expandedRunId);

  // Generate run names for each run
  const runNameMap = runs.reduce((acc: Record<string, string>, run, index) => {
    acc[run.runId] = `${projectName} ${runs.length - index}`;
    return acc;
  }, {});

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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-neutral-50">
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600 w-32">Run Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Timestamp</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-neutral-600">Total Tests</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-neutral-600">Passed</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-neutral-600">Failed</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-neutral-600">Skipped</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-neutral-600">Pass Rate</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Duration</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run: TestRun) => (
              <React.Fragment key={run.runId}>
                <tr
                  onClick={() =>
                    setExpandedRunId(expandedRunId === run.runId ? null : run.runId)
                  }
                  className="border-b hover:bg-neutral-50 transition cursor-pointer"
                >
                  <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                    <div className="flex items-center gap-2">
                      {expandedRunId === run.runId ? (
                        <ChevronDown className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                      )}
                      {runNameMap[run.runId]}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    <div>
                      <p>{new Date(run.startTime).toLocaleDateString()}</p>
                      <p className="text-xs text-neutral-500">{new Date(run.startTime).toLocaleTimeString()}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-center font-medium text-neutral-900">
                    {run.totalTests}
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700">
                      {run.passedTests}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-50 text-danger-700">
                      {run.failedTests}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-50 text-neutral-700">
                      {run.skippedTests}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      run.passRate >= 80 ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'
                    }`}>
                      {formatPercent(run.passRate)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-900">
                    {formatDuration(run.totalDuration)}
                  </td>
                </tr>

                {/* Expanded test details row - only rendered when expanded */}
                {expandedRunId === run.runId && (
                  <tr>
                    <td colSpan={8} className="p-0">
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
                                  <th className="px-6 py-3 text-left text-sm font-medium text-neutral-700">
                                    Trace
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
                                    <td className="px-6 py-3 text-sm">
                                      {test.status === 'FAILED' && (test.traceUrl || test.tracePath) ? (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (test.tracePath) {
                                              // Show alert with instructions for local traces
                                              alert(`To view this trace locally, run:\nnpx playwright show-trace ${test.tracePath}`);
                                            } else if (test.traceUrl) {
                                              window.open(test.traceUrl, '_blank');
                                            }
                                          }}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition"
                                          title="View trace"
                                        >
                                          <Eye className="w-3 h-3" />
                                          View Trace
                                        </button>
                                      ) : (
                                        <span className="text-xs text-neutral-400">—</span>
                                      )}
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
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tbody>
            {runs.map((run: TestRun) => (
              <tr
                key={run.runId}
                onClick={() =>
                  setExpandedRunId(expandedRunId === run.runId ? null : run.runId)
                }
                className="border-b hover:bg-neutral-50 transition cursor-pointer"
              >
                <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                  <div className="flex items-center gap-2">
                    {expandedRunId === run.runId ? (
                      <ChevronDown className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                    )}
                    {runNameMap[run.runId]}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-600">
                  <div>
                    <p>{new Date(run.startTime).toLocaleDateString()}</p>
                    <p className="text-xs text-neutral-500">{new Date(run.startTime).toLocaleTimeString()}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-center font-medium text-neutral-900">
                  {run.totalTests}
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700">
                    {run.passedTests}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-50 text-danger-700">
                    {run.failedTests}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-50 text-neutral-700">
                    {run.skippedTests}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    run.passRate >= 80 ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'
                  }`}>
                    {formatPercent(run.passRate)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-900">
                  {formatDuration(run.totalDuration)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
