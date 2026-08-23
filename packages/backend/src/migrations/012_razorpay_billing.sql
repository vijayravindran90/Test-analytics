ALTER TABLE users
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_razorpay_subscription_id ON users(razorpay_subscription_id) WHERE razorpay_subscription_id IS NOT NULL;
