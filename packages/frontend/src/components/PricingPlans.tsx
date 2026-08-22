import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { PLANS, PlanId } from 'test-analytics-shared';
import { useAuth } from '../auth/AuthContext';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';

interface PricingPlansProps {
  currentPlan?: PlanId;
}

export default function PricingPlans({ currentPlan }: PricingPlansProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlan = async (planId: PlanId) => {
    setError(null);

    if (!isAuthenticated) {
      navigate(planId === 'free' ? '/login' : `/login?plan=${planId}`);
      return;
    }

    if (planId === 'free' || planId === currentPlan) {
      navigate('/projects');
      return;
    }

    setPendingPlan(planId);
    try {
      const response = await apiClient.post('/billing/checkout', { planId });
      window.location.href = response.data.url;
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to start checkout for this plan yet.');
    } finally {
      setPendingPlan(null);
    }
  };

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`card relative flex flex-col p-6 ${
                plan.highlight ? 'border-2 border-primary-500 shadow-lg' : ''
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}

              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-neutral-600">{plan.tagline}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${plan.priceMonthly}</span>
                <span className="text-neutral-500">/month</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={pendingPlan === plan.id}
                onClick={() => handleSelectPlan(plan.id)}
                className={`mt-6 btn w-full ${
                  isCurrent ? 'btn-secondary' : plan.highlight ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                {isCurrent
                  ? 'Current plan'
                  : pendingPlan === plan.id
                  ? 'Redirecting...'
                  : plan.priceMonthly === 0
                  ? 'Get started free'
                  : `Choose ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-danger-600">{error}</p>
      )}
    </div>
  );
}
