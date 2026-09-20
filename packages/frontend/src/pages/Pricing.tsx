import React from 'react';
import PricingPlans from '../components/PricingPlans';
import { useAuth } from '../auth/AuthContext';

export default function Pricing() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Plans & pricing</h1>
        <span className="badge badge-success mt-3 inline-flex">Free beta</span>
        <p className="mx-auto mt-3 max-w-xl text-neutral-600">
          We're in a free feedback beta — every account gets full Pro-level access (AI investigation, up to 10
          projects, 90-day history and more) during the trial, at no cost. Paid plans will return once the beta wraps
          up.
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-500">
          Already have an account? Choosing Free just signs you in — it won't change an existing paid plan.
        </p>
      </div>

      <PricingPlans currentPlan={user?.plan as any} />
    </div>
  );
}
