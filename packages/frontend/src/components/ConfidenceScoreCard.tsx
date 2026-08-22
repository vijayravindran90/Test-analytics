import React from 'react';
import type { ConfidenceScore } from '../api/hooks';
import { getConfidenceTier } from '../utils/format';

interface ConfidenceScoreCardProps {
  confidence: ConfidenceScore | null;
  loading: boolean;
}

const RING_COLORS: Record<string, string> = {
  good: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
};

export default function ConfidenceScoreCard({ confidence, loading }: ConfidenceScoreCardProps) {
  if (loading || !confidence) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold">Confidence score</h3>
        <p className="mt-4 text-sm text-neutral-500">Calculating...</p>
      </div>
    );
  }

  const tier = getConfidenceTier(confidence.score);
  const color = RING_COLORS[tier];
  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - confidence.score / 100);

  const breakdownItems = [
    { label: 'Pass rate', value: confidence.breakdown.passRateScore },
    { label: 'Stability', value: confidence.breakdown.stabilityScore },
    { label: 'Recency', value: confidence.breakdown.recencyScore },
  ];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Confidence score</h3>
        <span className={`badge ${tier === 'good' ? 'badge-success' : tier === 'warning' ? 'badge-warning' : 'badge-danger'}`}>
          {confidence.label}
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative flex h-32 w-32 flex-shrink-0 items-center justify-center">
          <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10" className="text-neutral-200" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-bold">{confidence.score}</span>
            <span className="text-xs text-neutral-500">/ 100</span>
          </div>
        </div>

        <div className="w-full flex-1 space-y-3">
          {breakdownItems.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-primary-500"
                  style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-neutral-500">
        Weighted from pass rate (50%), stability (30%) and how recently tests ran (20%).
      </p>
    </div>
  );
}
