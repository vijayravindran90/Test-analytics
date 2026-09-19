import React from 'react';
import { Check, Minus } from 'lucide-react';
import { PLANS, CURRENCY_SYMBOL } from 'test-analytics-shared';

const free = PLANS.find((p) => p.id === 'free')!;
const pro = PLANS.find((p) => p.id === 'pro')!;

interface Row {
  label: string;
  free: React.ReactNode;
  pro: React.ReactNode;
}

const ROWS: Row[] = [
  { label: 'Projects', free: `${free.maxProjects}`, pro: `Up to ${pro.maxProjects}` },
  { label: 'Test history retention', free: `${free.retentionDays} days`, pro: `${pro.retentionDays} days` },
  { label: 'Pass rate, flakiness & duration metrics', free: <Check className="h-4 w-4 text-success-600" />, pro: <Check className="h-4 w-4 text-success-600" /> },
  { label: 'Confidence score & guardrails', free: <Check className="h-4 w-4 text-success-600" />, pro: <Check className="h-4 w-4 text-success-600" /> },
  { label: 'Module heatmap & folder metrics', free: <Check className="h-4 w-4 text-success-600" />, pro: <Check className="h-4 w-4 text-success-600" /> },
  { label: 'Flaky test detection & alerts', free: <Check className="h-4 w-4 text-success-600" />, pro: <Check className="h-4 w-4 text-success-600" /> },
  { label: 'Slack notifications', free: <Minus className="h-4 w-4 text-neutral-400" />, pro: <Check className="h-4 w-4 text-success-600" /> },
  {
    label: 'AI test investigation',
    free: <Minus className="h-4 w-4 text-neutral-400" />,
    pro: <span className="text-sm text-success-700">Shared key (a few/day), or bring your own for unlimited</span>,
  },
  { label: 'Support', free: <Minus className="h-4 w-4 text-neutral-400" />, pro: 'Email support' },
];

export default function PlanComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-neutral-50">
            <th className="px-6 py-3 text-left font-medium text-neutral-600">Feature</th>
            <th className="px-6 py-3 text-left font-medium text-neutral-600">
              Free
              <span className="ml-2 font-normal text-neutral-400">{CURRENCY_SYMBOL}0</span>
            </th>
            <th className="px-6 py-3 text-left font-medium text-neutral-600">
              Pro
              <span className="ml-2 font-normal text-neutral-400">{CURRENCY_SYMBOL}{pro.priceMonthly}/mo</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-b last:border-0">
              <td className="px-6 py-3 font-medium text-neutral-900">{row.label}</td>
              <td className="px-6 py-3 text-neutral-700">{row.free}</td>
              <td className="px-6 py-3 text-neutral-700">{row.pro}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
