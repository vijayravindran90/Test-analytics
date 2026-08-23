import { Request, Response } from 'express';
import { verifyWebhookSignature, handleWebhookEvent, isBillingConfigured } from '../services/billingService';

export async function handleRazorpayWebhook(req: Request, res: Response) {
  if (!isBillingConfigured()) {
    return res.status(503).json({ error: 'Billing is not configured on this server' });
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing Razorpay signature header' });
  }

  try {
    const rawBody = req.body as Buffer;
    verifyWebhookSignature(rawBody, signature);
    const event = JSON.parse(rawBody.toString('utf8'));
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (error: any) {
    console.error('Error handling Razorpay webhook:', error);
    res.status(400).json({ error: `Webhook error: ${error.message}` });
  }
}
