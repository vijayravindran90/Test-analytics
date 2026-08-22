import React from 'react';
import PricingPlans from '../components/PricingPlans';
import { useAuth } from '../auth/AuthContext';

export default function Pricing() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Plans & pricing</h1>
        <p className="mx-auto mt-3 max-w-xl text-neutral-600">
          Every plan includes the full test analytics dashboard, flaky test detection and performance alerts.
          Upgrade anytime as your team grows.
        </p>
      </div>

      <PricingPlans currentPlan={user?.plan as any} />
    </div>
  );
}
