import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pool from '../db';

// A permanent, full-access account for exploring the app without going through
// Stripe or email verification. Idempotent: re-running it never overwrites an
// existing password, it only refreshes the plan/verification bypass.
const TEST_EMAIL = (process.env.TEST_ACCOUNT_EMAIL || 'tester@test-analytics.in').toLowerCase();
const TEST_PLAN = 'pro';

function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(16))
    .map((byte) => alphabet[byte % alphabet.length])
    .join('');
}

async function main() {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [TEST_EMAIL]);

  if (existing.rows.length > 0) {
    const userId = existing.rows[0].id;
    await pool.query(
      `UPDATE users
       SET plan = $1, email_verified = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [TEST_PLAN, userId]
    );
    console.log(`Test account already exists: ${TEST_EMAIL}`);
    console.log(`Refreshed plan=${TEST_PLAN}, email_verified=true. Password left unchanged.`);
    console.log('Set TEST_ACCOUNT_RESET_PASSWORD=<new-password> and re-run to change it.');

    const resetPassword = process.env.TEST_ACCOUNT_RESET_PASSWORD;
    if (resetPassword) {
      const passwordHash = await bcrypt.hash(resetPassword, 10);
      await pool.query(`UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [
        passwordHash,
        userId,
      ]);
      console.log(`Password reset. New password: ${resetPassword}`);
    }
    return;
  }

  const id = uuidv4();
  const password = process.env.TEST_ACCOUNT_PASSWORD || generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (id, email, password_hash, name, plan, email_verified)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    [id, TEST_EMAIL, passwordHash, 'Test Account', TEST_PLAN]
  );

  console.log('Created test account:');
  console.log(`  Email:    ${TEST_EMAIL}`);
  console.log(`  Password: ${password}`);
  console.log(`  Plan:     ${TEST_PLAN} (no trial limit, email pre-verified)`);
  console.log('Save this password now - it is hashed in the database and cannot be recovered later.');
}

main()
  .catch((err) => {
    console.error('Failed to seed test account:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
