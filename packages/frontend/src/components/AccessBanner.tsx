import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '../api/hooks';
import apiClient from '../api/client';

export default function AccessBanner() {
  const { subscription, loading } = useSubscription();
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState<string | null>(null);

  if (loading || !subscription) {
    return null;
  }

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

  if (!subscription.emailVerified) {
    return (
      <div className="bg-warning-500 px-4 py-2 text-center text-sm font-medium text-white">
        {resendState === 'sent' ? (
          <span>Verification email sent — check your inbox.</span>
        ) : (
          <>
            <span>Please verify your email address to unlock your dashboards.</span>{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendState === 'sending'}
              className="ml-1 underline font-semibold"
            >
              {resendState === 'sending' ? 'Sending...' : 'Resend verification email'}
            </button>
            {resendState === 'error' && resendError && <span className="ml-2">({resendError})</span>}
          </>
        )}
      </div>
    );
  }

  if (subscription.trialDaysLeft === null) {
    return null;
  }

  const expired = !subscription.accessAllowed;

  return (
    <div className={`px-4 py-2 text-center text-sm font-medium ${expired ? 'bg-danger-600 text-white' : 'bg-primary-50 text-primary-800'}`}>
      {expired ? (
        <span>Your free trial has ended. Upgrade to keep using Test Analytics.</span>
      ) : (
        <span>
          {subscription.trialDaysLeft} day{subscription.trialDaysLeft === 1 ? '' : 's'} left in your free trial.
        </span>
      )}{' '}
      <Link to="/billing" className={`ml-1 underline font-semibold ${expired ? 'text-white' : 'text-primary-800'}`}>
        {expired ? 'Upgrade now' : 'View plans'}
      </Link>
    </div>
  );
}
