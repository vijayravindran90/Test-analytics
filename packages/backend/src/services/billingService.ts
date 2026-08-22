import Stripe from 'stripe';
import { PLANS, PlanId, getPlanById } from 'test-analytics-shared';
import userService from './userService';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured on this server (missing STRIPE_SECRET_KEY)');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  }

  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(STRIPE_SECRET_KEY);
}

function priceIdForPlan(planId: PlanId): string | null {
  const plan = getPlanById(planId);
  if (!plan.priceIdEnvVar) {
    return null;
  }
  return process.env[plan.priceIdEnvVar] || null;
}

function planIdForPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) {
    return null;
  }

  for (const plan of PLANS) {
    if (plan.priceIdEnvVar && process.env[plan.priceIdEnvVar] === priceId) {
      return plan.id;
    }
  }

  return null;
}

async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const stripe = getStripeClient();
  const billingProfile = await userService.getBillingProfile(userId);

  if (billingProfile?.stripeCustomerId) {
    return billingProfile.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await userService.setStripeCustomerId(userId, customer.id);
  return customer.id;
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  planId: PlanId,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = getStripeClient();
  const priceId = priceIdForPlan(planId);

  if (!priceId) {
    throw new Error(`No Stripe price configured for plan "${planId}"`);
  }

  const customerId = await getOrCreateStripeCustomer(userId, email);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, planId },
    subscription_data: {
      metadata: { userId, planId },
    },
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout session URL');
  }

  return session.url;
}

export async function createPortalSession(userId: string, returnUrl: string): Promise<string> {
  const stripe = getStripeClient();
  const billingProfile = await userService.getBillingProfile(userId);

  if (!billingProfile?.stripeCustomerId) {
    throw new Error('No billing account found for this user yet. Subscribe to a plan first.');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: billingProfile.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  const stripe = getStripeClient();
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret is not configured (missing STRIPE_WEBHOOK_SECRET)');
  }

  return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId as PlanId | undefined;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

      if (userId && planId) {
        await userService.updateSubscription(userId, {
          plan: planId,
          stripeSubscriptionId: subscriptionId || null,
          subscriptionStatus: 'active',
        });
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      const billingProfile = await userService.getBillingProfileByStripeCustomerId(customerId);

      if (billingProfile) {
        const priceId = subscription.items.data[0]?.price?.id;
        const resolvedPlan = planIdForPriceId(priceId) || billingProfile.plan;
        const isActive = subscription.status === 'active' || subscription.status === 'trialing';

        await userService.updateSubscription(billingProfile.id, {
          plan: isActive ? resolvedPlan : 'free',
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      const billingProfile = await userService.getBillingProfileByStripeCustomerId(customerId);

      if (billingProfile) {
        await userService.updateSubscription(billingProfile.id, {
          plan: 'free',
          stripeSubscriptionId: null,
          subscriptionStatus: 'canceled',
          currentPeriodEnd: null,
        });
      }
      break;
    }

    default:
      break;
  }
}
