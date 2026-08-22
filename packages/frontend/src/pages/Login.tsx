import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { getPlanById } from 'test-analytics-shared';
import { useAuth } from '../auth/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import apiClient from '../api/client';

function PostLoginCheckoutRedirect({ planId, fallbackPath }: { planId: string; fallbackPath: string }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const startCheckout = async () => {
      try {
        const response = await apiClient.post('/billing/checkout', { planId });
        if (!cancelled) {
          window.location.href = response.data.url;
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.error || 'Unable to start checkout for this plan.');
        }
      }
    };

    startCheckout();
    return () => {
      cancelled = true;
    };
  }, [planId]);

  if (error) {
    return (
      <div className="mx-auto max-w-md card p-6 text-center">
        <p className="text-danger-600">{error}</p>
        <Navigate to={fallbackPath} replace />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md card p-6 text-center">
      <p className="text-neutral-600">Signed in! Redirecting you to checkout...</p>
    </div>
  );
}

export default function Login() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');

  // Signing in always starts from the pricing page so a plan is chosen first.
  if (!planId) {
    return <Navigate to="/pricing" replace />;
  }

  if (isAuthenticated) {
    const redirectPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/projects';
    if (planId !== 'free') {
      return <PostLoginCheckoutRedirect planId={planId} fallbackPath={redirectPath} />;
    }
    return <Navigate to={redirectPath} replace />;
  }

  const plan = getPlanById(planId);

  return (
    <div className="mx-auto max-w-md card p-6">
      <h1 className="text-2xl font-bold text-neutral-900">Continue with Google</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Sign in with your Google account to {plan.priceMonthly === 0 ? 'start your free trial' : `subscribe to the ${plan.name} plan`}
        . New here? Signing in creates your account automatically.
      </p>

      <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
        Selected plan: <strong>{plan.name}</strong>
        {plan.priceMonthly > 0 ? ` ($${plan.priceMonthly}/month)` : ' (14-day free trial)'}
      </div>

      <div className="mt-6">
        <GoogleSignInButton />
      </div>

      <p className="mt-6 text-center text-xs text-neutral-500">
        We only support signing in with Google right now.
      </p>

      <Link to="/pricing" className="mt-4 block text-center text-sm text-primary-600 hover:text-primary-700">
        Choose a different plan
      </Link>
    </div>
  );
}
