import React from 'react';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import type { Guardrails } from '../api/hooks';

interface GuardrailsPanelProps {
  guardrails: Guardrails | null;
  loading: boolean;
}

export default function GuardrailsPanel({ guardrails, loading }: GuardrailsPanelProps) {
  if (loading || !guardrails) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold">Guardrails</h3>
        <p className="mt-4 text-sm text-neutral-500">Checking guardrails...</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary-500" />
          <h3 className="text-lg font-semibold">Guardrails</h3>
        </div>
        <span className={`badge ${guardrails.overallStatus === 'pass' ? 'badge-success' : 'badge-danger'}`}>
          {guardrails.overallStatus === 'pass' ? 'All guardrails passing' : 'Guardrail breached'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {guardrails.checks.map((check) => (
          <div
            key={check.key}
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              check.status === 'pass' ? 'border-success-200 bg-success-50' : 'border-danger-200 bg-danger-50'
            }`}
          >
            {check.status === 'pass' ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-success-600" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-600" />
            )}
            <div>
              <p className="text-sm font-semibold text-neutral-900">{check.label}</p>
              <p className="text-xs text-neutral-600">
                {check.unit === '%' ? `${check.actual}%` : `${check.actual}ms`} vs threshold{' '}
                {check.unit === '%' ? `${check.threshold}%` : `${check.threshold}ms`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
