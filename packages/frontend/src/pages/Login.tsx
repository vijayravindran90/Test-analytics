import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { getPlanById, BillingInterval } from 'test-analytics-shared';
import { useAuth } from '../auth/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import apiClient from '../api/client';

function PostLoginCheckoutRedirect({
  planId,
  interval,
  fallbackPath,
}: {
  planId: string;
  interval: BillingInterval;
  fallbackPath: string;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const startCheckout = async () => {
      try {
        const response = await apiClient.post('/billing/checkout', { planId, interval });
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
  }, [planId, interval]);

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

function CheckYourEmailNotice({ email }: { email: string }) {
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = async () => {
    setResendState('sending');
    setResendError(null);
    try {
      await apiClient.post('/auth/resend-verification');
      setResendState('sent');
    } catch (err: any) {
      setResendState('error');
      setResendError(err?.response?.data?.error || 'Unable to resend verification email');
    }
  };

  return (
    <div className="mx-auto max-w-md card p-6 text-center">
      <h1 className="text-2xl font-bold text-neutral-900">Check your email</h1>
      <p className="mt-2 text-sm text-neutral-600">
        We sent a verification link to <strong>{email}</strong>. Click it to activate your account.
      </p>

      {resendState === 'sent' ? (
        <p className="mt-4 text-sm text-success-700">Verification email sent again — check your inbox.</p>
      ) : (
        <button type="button" onClick={handleResend} disabled={resendState === 'sending'} className="btn btn-secondary mt-4">
          {resendState === 'sending' ? 'Sending...' : 'Resend verification email'}
        </button>
      )}
      {resendState === 'error' && resendError && <p className="mt-2 text-sm text-danger-600">{resendError}</p>}

      <Link to="/projects" className="mt-6 block text-sm text-primary-600 hover:text-primary-700">
        Continue to dashboard
      </Link>
    </div>
  );
}

export default function Login() {
  const { isAuthenticated, user, login, register } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  const interval: BillingInterval = searchParams.get('interval') === 'annual' ? 'annual' : 'monthly';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signing in always starts from the pricing page so a plan is chosen first.
  if (!planId) {
    return <Navigate to="/pricing" replace />;
  }

  if (isAuthenticated) {
    const redirectPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/projects';

    if (planId !== 'free') {
      return <PostLoginCheckoutRedirect planId={planId} interval={interval} fallbackPath={redirectPath} />;
    }

    if (user && user.emailVerified === false) {
      return <CheckYourEmailNotice email={user.email} />;
    }

    return <Navigate to={redirectPath} replace />;
  }

  const plan = getPlanById(planId);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name || undefined);
      }
    } catch (submitError: any) {
      setError(submitError?.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md card p-6 shadow-lg shadow-primary-100/60">
      <h1 className="text-2xl font-bold text-neutral-900">
        {mode === 'login' ? 'Sign in to your dashboard' : 'Create your profile'}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        {mode === 'login'
          ? 'Use your account to access only your projects and dashboards.'
          : 'Create an account to keep dashboards private to your profile.'}
      </p>

      <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
        Selected plan: <strong>{plan.name}</strong>
        {plan.priceMonthly === 0
          ? ' (14-day free trial)'
          : interval === 'annual' && plan.priceAnnualMonthly !== undefined
          ? ` ($${plan.priceAnnualMonthly}/month, billed annually)`
          : ` ($${plan.priceMonthly}/month)`}
      </div>

      <div className="mt-6">
        <GoogleSignInButton />
      </div>

      <div className="mt-6 flex items-center gap-3 text-xs uppercase text-neutral-400">
        <div className="h-px flex-1 bg-neutral-200" />
        <span>Or use your email</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === 'register' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Your name"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Minimum 8 characters"
          />
        </div>

        {mode === 'register' && (
          <p className="text-xs text-neutral-500">
            We'll email you a verification link. You'll need to verify your email before you can create projects or view
            dashboards.
          </p>
        )}

        {error && <div className="p-3 rounded-lg border border-danger-200 bg-danger-50 text-danger-700">{error}</div>}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        className="mt-4 text-sm text-primary-600 hover:text-primary-700"
      >
        {mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
      </button>

      <Link to="/pricing" className="mt-4 block text-center text-sm text-neutral-500 hover:text-neutral-700">
        Choose a different plan
      </Link>
    </div>
  );
}
