import React, { useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { PLANS, PlanId, BillingInterval, CURRENCY_SYMBOL } from 'test-analytics-shared';
import { useAuth } from '../auth/AuthContext';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';

interface PricingPlansProps {
  currentPlan?: PlanId;
}

export default function PricingPlans({ currentPlan }: PricingPlansProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlan = async (planId: PlanId) => {
    setError(null);

    if (!isAuthenticated) {
      navigate(`/login?plan=${planId}&interval=${interval}`);
      return;
    }

    if (planId === 'free' || planId === currentPlan) {
      navigate('/projects');
      return;
    }

    setPendingPlan(planId);
    try {
      const response = await apiClient.post('/billing/checkout', { planId, interval });
      window.location.href = response.data.url;
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to start checkout for this plan yet.');
    } finally {
      setPendingPlan(null);
    }
  };

  return (
    <div>
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-sm">
          {(['monthly', 'annual'] as BillingInterval[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setInterval(option)}
              className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                interval === option ? 'bg-primary-500 text-white shadow' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {option === 'monthly' ? 'Monthly' : 'Annual'}
              {option === 'annual' && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    interval === 'annual' ? 'bg-white/20 text-white' : 'bg-success-100 text-success-700'
                  }`}
                >
                  Save 17%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const showAnnual = interval === 'annual' && plan.priceAnnualMonthly !== undefined;
          const displayPrice = showAnnual ? plan.priceAnnualMonthly! : plan.priceMonthly;

          return (
            <div
              key={plan.id}
              className={`card relative flex flex-col p-6 transition-all duration-200 ${
                plan.comingSoon
                  ? 'opacity-75'
                  : plan.highlight
                  ? 'border-2 border-primary-500 shadow-lg shadow-primary-100 hover:-translate-y-1 hover:shadow-xl'
                  : 'hover:-translate-y-1 hover:shadow-md'
              }`}
            >
              {plan.highlight && !plan.comingSoon && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-3 py-1 text-xs font-semibold text-white shadow">
                  Most popular
                </span>
              )}
              {plan.comingSoon && (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-neutral-700 px-3 py-1 text-xs font-semibold text-white shadow">
                  <Clock className="h-3 w-3" />
                  Coming soon
                </span>
              )}

              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-neutral-600">{plan.tagline}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{CURRENCY_SYMBOL}{displayPrice}</span>
                <span className="text-neutral-500">/month</span>
              </div>
              {showAnnual && plan.priceMonthly > 0 && (
                <p className="mt-1 text-xs text-neutral-500">
                  Billed annually ({CURRENCY_SYMBOL}{plan.priceAnnualMonthly! * 12}/year)
                </p>
              )}

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
                disabled={pendingPlan === plan.id || plan.comingSoon}
                onClick={() => handleSelectPlan(plan.id)}
                className={`mt-6 btn w-full ${
                  plan.comingSoon
                    ? 'cursor-not-allowed bg-neutral-100 text-neutral-400'
                    : isCurrent
                    ? 'btn-secondary'
                    : plan.highlight
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                {plan.comingSoon
                  ? 'Coming soon'
                  : isCurrent
                  ? 'Current plan'
                  : pendingPlan === plan.id
                  ? 'Redirecting...'
                  : plan.priceMonthly === 0
                  ? 'Start free trial'
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
