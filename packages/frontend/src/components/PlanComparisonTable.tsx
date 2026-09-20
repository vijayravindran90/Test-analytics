import React from 'react';
import { Check } from 'lucide-react';
import { PLANS, FREE_TRIAL_DAYS } from 'test-analytics-shared';

const free = PLANS.find((p) => p.id === 'free')!;

// Pro is hidden for now and Free carries Pro-level limits/features during the
// feedback beta (see plans.ts + PricingPlans's HIDDEN_PLAN_IDS), so this is a
// single "what's included" list rather than a Free vs. Pro comparison.
const ROWS: string[] = [
  `Up to ${free.maxProjects} projects`,
  `${free.retentionDays}-day test history retention`,
  'Pass rate, flakiness & duration metrics',
  'Confidence score & guardrails',
  'Module heatmap & folder metrics',
  'Flaky test detection & alerts',
  'Slack notifications',
  'AI test failure investigation (shared key, or bring your own for unlimited use)',
];

export default function PlanComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-neutral-50">
            <th className="px-6 py-3 text-left font-medium text-neutral-600">
              Included in your {FREE_TRIAL_DAYS}-day free trial
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row} className="border-b last:border-0">
              <td className="flex items-start gap-2 px-6 py-3 text-neutral-800">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-600" />
                <span>{row}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
