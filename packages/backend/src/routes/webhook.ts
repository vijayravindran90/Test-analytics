import { Request, Response } from 'express';
import { constructWebhookEvent, handleWebhookEvent, isStripeConfigured } from '../services/billingService';

export async function handleStripeWebhook(req: Request, res: Response) {
  if (!isStripeConfigured()) {
    return res.status(503).json({ error: 'Billing is not configured on this server' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing Stripe signature header' });
  }

  try {
    const event = constructWebhookEvent(req.body as Buffer, signature);
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (error: any) {
    console.error('Error handling Stripe webhook:', error);
    res.status(400).json({ error: `Webhook error: ${error.message}` });
  }
}
