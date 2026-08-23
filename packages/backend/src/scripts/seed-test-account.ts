import pool from '../db';
import { seedTestAccount } from '../services/testAccountService';

// A permanent, full-access account for exploring the app without going through
// Stripe or email verification. Idempotent: re-running it never overwrites an
// existing password, it only refreshes the plan/verification bypass.
async function main() {
  const result = await seedTestAccount({
    email: process.env.TEST_ACCOUNT_EMAIL,
    password: process.env.TEST_ACCOUNT_PASSWORD,
    resetPassword: process.env.TEST_ACCOUNT_RESET_PASSWORD,
  });

  if (result.created) {
    console.log('Created test account:');
  } else {
    console.log(`Test account already exists: ${result.email}`);
    console.log(`Refreshed plan=${result.plan}, email_verified=true.`);
  }

  console.log(`  Email: ${result.email}`);
  if (result.password) {
    console.log(`  Password: ${result.password}`);
    console.log('Save this password now - it is hashed in the database and cannot be recovered later.');
  } else {
    console.log('  Password: left unchanged. Set TEST_ACCOUNT_RESET_PASSWORD=<new-password> and re-run to change it.');
  }
  console.log(`  Plan: ${result.plan} (no trial limit, email pre-verified)`);
}

main()
  .catch((err) => {
    console.error('Failed to seed test account:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
