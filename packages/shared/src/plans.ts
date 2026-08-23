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

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: `Start your ${FREE_TRIAL_DAYS}-day free trial`,
    priceMonthly: 0,
    maxProjects: 1,
    retentionDays: 14,
    trialDays: FREE_TRIAL_DAYS,
    features: [
      `${FREE_TRIAL_DAYS}-day free trial`,
      '1 project',
      'Pass rate, flakiness & duration metrics',
      'Upgrade anytime to keep access',
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
