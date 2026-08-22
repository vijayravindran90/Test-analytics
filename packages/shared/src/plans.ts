export type PlanId = 'free' | 'pro' | 'team';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceIdEnvVar?: string;
  maxProjects: number | null;
  retentionDays: number | null;
  features: string[];
  highlight?: boolean;
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Get started with a single project',
    priceMonthly: 0,
    maxProjects: 1,
    retentionDays: 14,
    features: [
      '1 project',
      '14-day test history',
      'Pass rate, flakiness & duration metrics',
      'Community support',
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
