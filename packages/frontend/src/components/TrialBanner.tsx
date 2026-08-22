import React from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '../api/hooks';

export default function TrialBanner() {
  const { subscription, loading } = useSubscription();

  if (loading || !subscription || subscription.trialDaysLeft === null) {
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
