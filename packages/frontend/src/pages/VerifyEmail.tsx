import React, { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function VerifyEmail() {
  const { verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('This verification link is missing its token.');
      return;
    }

    // The verification endpoint is idempotent (see userService.verifyEmailToken), so it's
    // safe for this effect to fire more than once - e.g. React StrictMode's dev-only
    // double-invoke, or an email security scanner pre-fetching the link for real users.
    let cancelled = false;

    const run = async () => {
      try {
        await verifyEmail(token);
        if (!cancelled) {
          setStatus('success');
        }
      } catch (err: any) {
        if (!cancelled) {
          setStatus('error');
          setError(err?.response?.data?.error || 'This verification link is invalid or has expired.');
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === 'success') {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div className="mx-auto max-w-md card p-6 text-center">
      {status === 'verifying' && <p className="text-neutral-600">Verifying your email...</p>}
      {status === 'error' && (
        <>
          <h1 className="text-xl font-bold text-neutral-900">Verification failed</h1>
          <p className="mt-2 text-sm text-danger-600">{error}</p>
          <Link to="/login?plan=free" className="btn btn-primary mt-6 inline-flex">
            Sign in to request a new link
          </Link>
        </>
      )}
    </div>
  );
}
