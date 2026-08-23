import React from 'react';
import type { ModuleMetric } from '../api/hooks';
import { formatDuration, formatPercent, getPassRateTier, STATUS_TIER_META } from '../utils/format';

interface ModuleMetricsTableProps {
  modules: ModuleMetric[];
  loading: boolean;
}

export default function ModuleMetricsTable({ modules, loading }: ModuleMetricsTableProps) {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold">Test folder metrics</h3>
      <p className="mt-1 text-sm text-neutral-600">Pass rate, flakiness and duration grouped by test folder.</p>

      {loading ? (
        <p className="mt-4 text-sm text-neutral-500">Loading module metrics...</p>
      ) : modules.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">No test data yet for this time range.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="pb-2 font-medium">Module</th>
                <th className="pb-2 font-medium">Tests</th>
                <th className="pb-2 font-medium">Pass rate</th>
                <th className="pb-2 font-medium">Flakiness</th>
                <th className="pb-2 font-medium">Avg duration</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => {
                const tier = getPassRateTier(module.passRate);
                const meta = STATUS_TIER_META[tier];
                return (
                  <tr key={module.module} className="border-b border-neutral-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-neutral-900">{module.module}</td>
                    <td className="py-2 pr-4 text-neutral-700">{module.totalTests}</td>
                    <td className="py-2 pr-4">
                      <span className={`badge ${meta.badgeClass}`}>{formatPercent(module.passRate)}</span>
                    </td>
                    <td className="py-2 pr-4 text-neutral-700">{formatPercent(module.flakinessPercentage)}</td>
                    <td className="py-2 pr-4 text-neutral-700">{formatDuration(module.avgDuration)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
