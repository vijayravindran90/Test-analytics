export type PlanId = 'free' | 'pro' | 'team';
export type BillingInterval = 'monthly' | 'annual';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  /** Price in INR when billed monthly. */
  priceMonthly: number;
  /** Effective INR/month when billed annually (undefined = no annual option). */
  priceAnnualMonthly?: number;
  /** Env var holding the Razorpay monthly Plan ID. */
  planIdEnvVar?: string;
  /** Env var holding the Razorpay annual Plan ID. */
  planIdEnvVarAnnual?: string;
  maxProjects: number | null;
  retentionDays: number | null;
  /** Number of days this plan may be used before access is blocked pending upgrade. Undefined = no trial limit. */
  trialDays?: number;
  features: string[];
  highlight?: boolean;
  /** Not purchasable yet - shown but disabled with a "Coming soon" badge. */
  comingSoon?: boolean;
}

export const FREE_TRIAL_DAYS = 14;

/** Currency all paid plans are billed in via Razorpay. */
export const CURRENCY_SYMBOL = '₹';

// Pro and Team are temporarily hidden from purchase (see HIDDEN_PLAN_IDS in
// the frontend's PricingPlans component) while we run a free-for-everyone
// beta to collect feedback. The free plan below is granted Pro-level limits
// and features for the duration of that beta - revert these three fields
// (maxProjects, retentionDays, features) and remove HIDDEN_PLAN_IDS to go
// back to normal tiered pricing.
export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: `Try everything free for ${FREE_TRIAL_DAYS} days`,
    priceMonthly: 0,
    maxProjects: 10,
    retentionDays: 90,
    trialDays: FREE_TRIAL_DAYS,
    features: [
      `${FREE_TRIAL_DAYS}-day free trial - all features included`,
      'Up to 10 projects',
      '90-day test history',
      'Pass rate, flakiness & duration metrics',
      'Flaky test detection & alerts',
      'AI test failure investigation',
      'Slack notifications',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For teams shipping fast with CI',
    priceMonthly: 999,
    priceAnnualMonthly: 833,
    planIdEnvVar: 'RAZORPAY_PLAN_ID_PRO_MONTHLY',
    planIdEnvVarAnnual: 'RAZORPAY_PLAN_ID_PRO_ANNUAL',
    maxProjects: 10,
    retentionDays: 90,
    features: [
      'Up to 10 projects',
      '90-day test history',
      'Flaky test detection & alerts',
      'AI test failure investigation',
      'Slack notifications',
      'Email support',
    ],
    highlight: true,
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'Unlimited scale for growing orgs',
    priceMonthly: 8999,
    planIdEnvVar: 'RAZORPAY_PLAN_ID_TEAM_MONTHLY',
    planIdEnvVarAnnual: 'RAZORPAY_PLAN_ID_TEAM_ANNUAL',
    maxProjects: null,
    retentionDays: null,
    features: [
      'Unlimited projects',
      'Unlimited test history',
      'Everything in Pro',
      'Priority support',
      'Team onboarding assistance',
    ],
    comingSoon: true,
  },
];

export function getPlanById(planId: string | null | undefined): PlanDefinition {
  return PLANS.find((plan) => plan.id === planId) || PLANS[0];
}

export function getPlanIdEnvVar(plan: PlanDefinition, interval: BillingInterval): string | undefined {
  return interval === 'annual' ? plan.planIdEnvVarAnnual : plan.planIdEnvVar;
}
