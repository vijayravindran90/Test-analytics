import crypto from 'crypto';
import Razorpay from 'razorpay';
import { PLANS, PlanId, BillingInterval, getPlanById, getPlanIdEnvVar } from 'test-analytics-shared';
import userService from './userService';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

// Razorpay subscriptions require a bounded number of billing cycles rather than
// "renew forever" - 10 years' worth of cycles is effectively indefinite for a
// SaaS subscription that the user can cancel anytime.
const TOTAL_COUNT_BY_INTERVAL: Record<BillingInterval, number> = {
  monthly: 120,
  annual: 10,
};

let razorpayClient: Razorpay | null = null;

function getRazorpayClient(): Razorpay {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay is not configured on this server (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)');
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  }

  return razorpayClient;
}

export function isBillingConfigured(): boolean {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

function planIdForPlan(planId: PlanId, interval: BillingInterval): string | null {
  const plan = getPlanById(planId);
  const envVar = getPlanIdEnvVar(plan, interval);
  if (!envVar) {
    return null;
  }
  return process.env[envVar] || null;
}

function planIdFromRazorpayPlanId(razorpayPlanId: string | null | undefined): PlanId | null {
  if (!razorpayPlanId) {
    return null;
  }

  for (const plan of PLANS) {
    const envVars = [plan.planIdEnvVar, plan.planIdEnvVarAnnual].filter(Boolean) as string[];
    if (envVars.some((envVar) => process.env[envVar] === razorpayPlanId)) {
      return plan.id;
    }
  }

  return null;
}

export async function createSubscriptionCheckout(
  userId: string,
  email: string,
  planId: PlanId,
  interval: BillingInterval
): Promise<string> {
  const razorpay = getRazorpayClient();
  const plan = getPlanById(planId);

  if (plan.comingSoon) {
    throw new Error(`The ${plan.name} plan isn't available yet`);
  }

  const razorpayPlanId = planIdForPlan(planId, interval);
  if (!razorpayPlanId) {
    throw new Error(`No Razorpay plan configured for "${planId}" (${interval})`);
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: razorpayPlanId,
    customer_notify: 1,
    total_count: TOTAL_COUNT_BY_INTERVAL[interval],
    notes: { userId, email, planId, interval },
  });

  if (!subscription.short_url) {
    throw new Error('Razorpay did not return a subscription checkout URL');
  }

  return subscription.short_url;
}

export async function cancelSubscription(userId: string): Promise<void> {
  const razorpay = getRazorpayClient();
  const billingProfile = await userService.getBillingProfile(userId);

  if (!billingProfile?.razorpaySubscriptionId) {
    throw new Error('No active subscription found for this account');
  }

  // Cancel at the end of the current billing cycle so the user keeps access
  // through what they already paid for, rather than cutting it off immediately.
  await razorpay.subscriptions.cancel(billingProfile.razorpaySubscriptionId, true);
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string): void {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    throw new Error('Razorpay webhook secret is not configured (missing RAZORPAY_WEBHOOK_SECRET)');
  }

  const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    throw new Error('Invalid Razorpay webhook signature');
  }
}

interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
  status: string;
  current_end?: number | null;
  notes?: { userId?: string };
}

export async function handleWebhookEvent(event: { event: string; payload: Record<string, any> }): Promise<void> {
  const subscription: RazorpaySubscriptionEntity | undefined = event.payload?.subscription?.entity;

  if (!subscription) {
    return;
  }

  const userId = subscription.notes?.userId;
  const billingProfile = userId
    ? await userService.getBillingProfile(userId)
    : await userService.getBillingProfileByRazorpaySubscriptionId(subscription.id);

  if (!billingProfile) {
    return;
  }

  const currentPeriodEnd = subscription.current_end ? new Date(subscription.current_end * 1000) : null;

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged': {
      const resolvedPlan = planIdFromRazorpayPlanId(subscription.plan_id) || billingProfile.plan;
      await userService.updateSubscription(billingProfile.id, {
        plan: resolvedPlan,
        razorpaySubscriptionId: subscription.id,
        subscriptionStatus: 'active',
        currentPeriodEnd,
      });
      break;
    }

    case 'subscription.cancelled':
    case 'subscription.completed':
    case 'subscription.halted': {
      await userService.updateSubscription(billingProfile.id, {
        plan: 'free',
        razorpaySubscriptionId: null,
        subscriptionStatus: event.event === 'subscription.halted' ? 'halted' : 'canceled',
        currentPeriodEnd: null,
      });
      break;
    }

    default:
      break;
  }
}
