export type PlanId = 'free' | 'pro' | 'team';
export type BillingInterval = 'monthly' | 'annual';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  /** Price in USD when billed monthly. */
  priceMonthly: number;
  /** Effective $/month when billed annually (undefined = no annual option). */
  priceAnnualMonthly?: number;
  /** Env var holding the Stripe monthly Price ID. */
  priceIdEnvVar?: string;
  /** Env var holding the Stripe annual Price ID. */
  priceIdEnvVarAnnual?: string;
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
    priceMonthly: 12,
    priceAnnualMonthly: 10,
    priceIdEnvVar: 'STRIPE_PRICE_ID_PRO_MONTHLY',
    priceIdEnvVarAnnual: 'STRIPE_PRICE_ID_PRO_ANNUAL',
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
    priceMonthly: 99,
    priceIdEnvVar: 'STRIPE_PRICE_ID_TEAM_MONTHLY',
    priceIdEnvVarAnnual: 'STRIPE_PRICE_ID_TEAM_ANNUAL',
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

export function getPriceIdEnvVar(plan: PlanDefinition, interval: BillingInterval): string | undefined {
  return interval === 'annual' ? plan.priceIdEnvVarAnnual : plan.priceIdEnvVar;
}
