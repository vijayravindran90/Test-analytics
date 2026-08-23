import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import apiClient from '../api/client';
import PricingPlans from '../components/PricingPlans';
import { useSubscription } from '../api/hooks';

export default function Billing() {
  const { subscription, loading, error: loadError } = useSubscription();
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const handleCancelSubscription = async () => {
    setCanceling(true);
    setError(null);
    try {
      await apiClient.post('/billing/cancel');
      setCanceled(true);
      setConfirmingCancel(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to cancel your subscription');
    } finally {
      setCanceling(false);
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
              {subscription.trialDaysLeft !== null && (
                <p className={`mt-1 text-sm font-medium ${subscription.accessAllowed ? 'text-neutral-600' : 'text-danger-600'}`}>
                  {subscription.accessAllowed
                    ? `${subscription.trialDaysLeft} day${subscription.trialDaysLeft === 1 ? '' : 's'} left in your free trial`
                    : 'Your free trial has ended'}
                </p>
              )}
              {canceled && (
                <p className="mt-1 text-sm text-neutral-500">
                  Your subscription is canceled and won't renew. You'll keep access until the end of the current period.
                </p>
              )}
            </div>
            {subscription.hasBillingAccount && !canceled && (
              <div>
                {confirmingCancel ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCancelSubscription}
                      disabled={canceling}
                      className="btn btn-secondary border-danger-200 text-danger-700 hover:bg-danger-50"
                    >
                      {canceling ? 'Canceling...' : 'Confirm cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingCancel(false)}
                      disabled={canceling}
                      className="btn btn-secondary"
                    >
                      Keep subscription
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmingCancel(true)} className="btn btn-secondary">
                    Cancel subscription
                  </button>
                )}
              </div>
            )}
          </div>
        ) : null}
        {(error || loadError) && <p className="mt-3 text-sm text-danger-600">{error || loadError}</p>}
      </div>

      {subscription && !subscription.accessAllowed && (
        <div className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>Your free trial has ended. Choose a paid plan below to keep using your dashboards and projects.</p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold">Change your plan</h2>
        <div className="mt-4">
          <PricingPlans currentPlan={subscription?.plan.id as any} />
        </div>
      </div>
    </div>
  );
}
