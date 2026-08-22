import React, { useEffect, useState } from 'react';
import { PlanDefinition } from 'test-analytics-shared';
import apiClient from '../api/client';
import PricingPlans from '../components/PricingPlans';

interface SubscriptionInfo {
  plan: PlanDefinition;
  subscriptionStatus?: string;
  currentPeriodEnd?: string;
  hasBillingAccount: boolean;
}

export default function Billing() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/billing/subscription');
        setSubscription(response.data);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Unable to load your subscription');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleManageBilling = async () => {
    setOpeningPortal(true);
    setError(null);
    try {
      const response = await apiClient.post('/billing/portal');
      window.location.href = response.data.url;
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to open the billing portal');
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <h1 className="text-3xl font-bold">Billing</h1>
        {loading ? (
          <p className="mt-3 text-neutral-600">Loading your subscription...</p>
        ) : subscription ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-neutral-600">
                Current plan: <span className="font-semibold text-neutral-900">{subscription.plan.name}</span>
              </p>
              {subscription.currentPeriodEnd && (
                <p className="mt-1 text-sm text-neutral-500">
                  Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            {subscription.hasBillingAccount && (
              <button
                type="button"
                onClick={handleManageBilling}
                disabled={openingPortal}
                className="btn btn-secondary"
              >
                {openingPortal ? 'Opening...' : 'Manage billing'}
              </button>
            )}
          </div>
        ) : null}
        {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
      </div>

      <div>
        <h2 className="text-xl font-semibold">Change your plan</h2>
        <div className="mt-4">
          <PricingPlans currentPlan={subscription?.plan.id} />
        </div>
      </div>
    </div>
  );
}
