// The `razorpay` npm package ships no TypeScript declarations of its own and
// there's no @types/razorpay package, so this covers just the surface this
// app actually calls.
declare module 'razorpay' {
  interface RazorpayOptions {
    key_id: string;
    key_secret: string;
  }

  interface RazorpaySubscription {
    id: string;
    entity: string;
    plan_id: string;
    status: string;
    current_start?: number | null;
    current_end?: number | null;
    short_url?: string;
    notes?: Record<string, string>;
  }

  interface CreateSubscriptionParams {
    plan_id: string;
    customer_notify?: 0 | 1;
    total_count: number;
    notes?: Record<string, string>;
  }

  class Razorpay {
    constructor(options: RazorpayOptions);
    subscriptions: {
      create(params: CreateSubscriptionParams): Promise<RazorpaySubscription>;
      cancel(subscriptionId: string, cancelAtCycleEnd?: boolean): Promise<RazorpaySubscription>;
    };
  }

  export = Razorpay;
}
