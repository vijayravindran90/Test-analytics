import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pool from '../db';

// Shared by the CLI script (src/scripts/seed-test-account.ts) and the
// admin HTTP endpoint (POST/GET /api/admin/seed-test-account) so both
// entry points seed a full-access test account identically.

export interface SeedTestAccountOptions {
  email?: string;
  password?: string;
  resetPassword?: string;
}

export interface SeedTestAccountResult {
  email: string;
  /** Only present when the account was just created, or its password was just reset. */
  password?: string;
  plan: string;
  created: boolean;
}

export const DEFAULT_TEST_ACCOUNT_EMAIL = 'tester@test-analytics.in';
const TEST_ACCOUNT_PLAN = 'pro';

function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(16))
    .map((byte) => alphabet[byte % alphabet.length])
    .join('');
}

export async function seedTestAccount(options: SeedTestAccountOptions = {}): Promise<SeedTestAccountResult> {
  const email = (options.email || DEFAULT_TEST_ACCOUNT_EMAIL).toLowerCase();

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

  if (existing.rows.length > 0) {
    const userId = existing.rows[0].id;
    await pool.query(
      `UPDATE users
       SET plan = $1, email_verified = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [TEST_ACCOUNT_PLAN, userId]
    );

    let password: string | undefined;
    if (options.resetPassword) {
      password = options.resetPassword;
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query(`UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [
        passwordHash,
        userId,
      ]);
    }

    return { email, password, plan: TEST_ACCOUNT_PLAN, created: false };
  }

  const id = uuidv4();
  const password = options.password || generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (id, email, password_hash, name, plan, email_verified)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    [id, email, passwordHash, 'Test Account', TEST_ACCOUNT_PLAN]
  );

  return { email, password, plan: TEST_ACCOUNT_PLAN, created: true };
}
