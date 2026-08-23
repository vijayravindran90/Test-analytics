export type PlanId = 'free' | 'pro' | 'team';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceIdEnvVar?: string;
  maxProjects: number | null;
  retentionDays: number | null;
  /** Number of days this plan may be used before access is blocked pending upgrade. Undefined = no trial limit. */
  trialDays?: number;
  features: string[];
  highlight?: boolean;
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
    priceMonthly: 29,
    priceIdEnvVar: 'STRIPE_PRICE_ID_PRO',
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
    priceIdEnvVar: 'STRIPE_PRICE_ID_TEAM',
    maxProjects: null,
    retentionDays: null,
    features: [
      'Unlimited projects',
      'Unlimited test history',
      'Everything in Pro',
      'Priority support',
      'Team onboarding assistance',
    ],
  },
];

export function getPlanById(planId: string | null | undefined): PlanDefinition {
  return PLANS.find((plan) => plan.id === planId) || PLANS[0];
}
