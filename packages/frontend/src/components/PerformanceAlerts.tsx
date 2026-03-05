import React from 'react';
import { Zap } from 'lucide-react';
import type { PerformanceAlert } from '@test-analytics/shared';
import { formatDuration, formatDate } from '../utils/format';

interface PerformanceAlertsProps {
  alerts: PerformanceAlert[];
  loading?: boolean;
}

export default function PerformanceAlerts({ alerts, loading }: PerformanceAlertsProps) {
  if (loading) {
    return <div className="card p-6">Loading alerts...</div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-neutral-600">No performance alerts</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-danger-500" />
          Performance Alerts
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-neutral-50">
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Test Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Current</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Previous</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Increase</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Date</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id} className="border-b hover:bg-neutral-50">
                <td className="px-6 py-3 text-sm">
                  <p className="font-medium text-neutral-900 truncate">{alert.testName}</p>
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className="text-danger-600 font-medium">
                    {formatDuration(alert.currentDuration)}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  {alert.previousDuration ? (
                    <span className="text-neutral-900">{formatDuration(alert.previousDuration)}</span>
                  ) : (
                    <span className="text-neutral-500 italic">—</span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm">
                  {alert.percentageIncrease > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-50 text-danger-700">
                      +{alert.percentageIncrease.toFixed(1)}%
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm text-neutral-600">
                  {formatDate(alert.alertedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
