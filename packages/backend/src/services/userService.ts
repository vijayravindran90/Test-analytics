import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pool from '../db';
import { PlanId, getPlanById } from 'test-analytics-shared';

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  plan: PlanId;
  subscriptionStatus?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessStatus {
  allowed: boolean;
  plan: PlanId;
  trialDaysLeft: number | null;
  emailVerified: boolean;
  reason?: 'TRIAL_EXPIRED' | 'EMAIL_NOT_VERIFIED';
}

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

interface BillingProfile {
  id: string;
  email: string;
  plan: PlanId;
  razorpaySubscriptionId?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: Date;
}

interface DbUserRow {
  id: string;
  email: string;
  password_hash: string | null;
  api_key_prefix?: string;
  api_key_hash?: string;
  name?: string;
  avatar_url?: string;
  plan: PlanId;
  razorpay_subscription_id?: string;
  subscription_status?: string;
  current_period_end?: Date;
  created_at: Date;
  updated_at: Date;
}

const USER_COLUMNS = `id, email, name, avatar_url, plan, subscription_status, email_verified, created_at, updated_at`;

export class UserService {
  async register(email: string, password: string, name?: string): Promise<User> {
    const existing = await this.getUserByEmail(email);
    if (existing) {
      throw new Error('A user with this email already exists');
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash, name)
       VALUES ($1, $2, $3, $4)
       RETURNING ${USER_COLUMNS}`,
      [id, email.toLowerCase(), passwordHash, name]
    );

    return this.mapUser(result.rows[0]);
  }

  async login(email: string, password: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, password_hash, name, avatar_url, plan, subscription_status, email_verified, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const userRow = result.rows[0] as DbUserRow;
    if (!userRow.password_hash) {
      return null;
    }

    const isValid = await bcrypt.compare(password, userRow.password_hash);

    if (!isValid) {
      return null;
    }

    return this.mapUser(userRow);
  }

  async findOrCreateGoogleUser(profile: { googleId: string; email: string; name?: string; avatarUrl?: string }): Promise<User> {
    const existingByGoogleId = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE google_id = $1`,
      [profile.googleId]
    );

    if (existingByGoogleId.rows.length > 0) {
      return this.mapUser(existingByGoogleId.rows[0]);
    }

    const existingByEmail = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE email = $1`,
      [profile.email.toLowerCase()]
    );

    if (existingByEmail.rows.length > 0) {
      // Google has already verified this email address, so linking also satisfies
      // (and upgrades, if it wasn't already) our own email verification requirement.
      const linked = await pool.query(
        `UPDATE users
         SET google_id = $1,
             avatar_url = COALESCE($2, avatar_url),
             email_verified = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING ${USER_COLUMNS}`,
        [profile.googleId, profile.avatarUrl, existingByEmail.rows[0].id]
      );
      return this.mapUser(linked.rows[0]);
    }

    const id = uuidv4();
    const created = await pool.query(
      `INSERT INTO users (id, email, password_hash, name, google_id, avatar_url, email_verified)
       VALUES ($1, $2, NULL, $3, $4, $5, TRUE)
       RETURNING ${USER_COLUMNS}`,
      [id, profile.email.toLowerCase(), profile.name, profile.googleId, profile.avatarUrl]
    );

    return this.mapUser(created.rows[0]);
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT ${USER_COLUMNS}
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapUser(result.rows[0]);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT ${USER_COLUMNS}
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapUser(result.rows[0]);
  }

  async getBillingProfile(userId: string): Promise<BillingProfile | null> {
    const result = await pool.query(
      `SELECT id, email, plan, razorpay_subscription_id, subscription_status, current_period_end
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      plan: row.plan,
      razorpaySubscriptionId: row.razorpay_subscription_id,
      subscriptionStatus: row.subscription_status,
      currentPeriodEnd: row.current_period_end,
    };
  }

  async getBillingProfileByRazorpaySubscriptionId(razorpaySubscriptionId: string): Promise<BillingProfile | null> {
    const result = await pool.query(
      `SELECT id, email, plan, razorpay_subscription_id, subscription_status, current_period_end
       FROM users
       WHERE razorpay_subscription_id = $1`,
      [razorpaySubscriptionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      plan: row.plan,
      razorpaySubscriptionId: row.razorpay_subscription_id,
      subscriptionStatus: row.subscription_status,
      currentPeriodEnd: row.current_period_end,
    };
  }

  async updateSubscription(
    userId: string,
    updates: {
      plan: PlanId;
      razorpaySubscriptionId?: string | null;
      subscriptionStatus?: string | null;
      currentPeriodEnd?: Date | null;
    }
  ): Promise<void> {
    await pool.query(
      `UPDATE users
       SET plan = $1,
           razorpay_subscription_id = $2,
           subscription_status = $3,
           current_period_end = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [updates.plan, updates.razorpaySubscriptionId || null, updates.subscriptionStatus || null, updates.currentPeriodEnd || null, userId]
    );
  }

  async getAccessStatus(userId: string): Promise<AccessStatus> {
    const result = await pool.query(`SELECT plan, created_at, email_verified FROM users WHERE id = $1`, [userId]);

    if (result.rows.length === 0) {
      return { allowed: false, plan: 'free', trialDaysLeft: 0, emailVerified: false, reason: 'TRIAL_EXPIRED' };
    }

    const plan: PlanId = result.rows[0].plan || 'free';
    const emailVerified = Boolean(result.rows[0].email_verified);

    if (!emailVerified) {
      return { allowed: false, plan, trialDaysLeft: null, emailVerified: false, reason: 'EMAIL_NOT_VERIFIED' };
    }

    const planDefinition = getPlanById(plan);

    if (!planDefinition.trialDays) {
      return { allowed: true, plan, trialDaysLeft: null, emailVerified: true };
    }

    const createdAt = new Date(result.rows[0].created_at).getTime();
    const daysSinceSignup = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    const trialDaysLeft = Math.max(0, Math.ceil(planDefinition.trialDays - daysSinceSignup));

    return {
      allowed: trialDaysLeft > 0,
      plan,
      trialDaysLeft,
      emailVerified: true,
      reason: trialDaysLeft > 0 ? undefined : 'TRIAL_EXPIRED',
    };
  }

  async generateEmailVerificationToken(userId: string): Promise<string> {
    const existing = await pool.query(`SELECT verification_email_sent_at FROM users WHERE id = $1`, [userId]);
    const lastSentAt = existing.rows[0]?.verification_email_sent_at;
    if (lastSentAt && Date.now() - new Date(lastSentAt).getTime() < VERIFICATION_RESEND_COOLDOWN_MS) {
      throw new Error('A verification email was just sent. Please wait a minute before requesting another.');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    await pool.query(
      `UPDATE users
       SET verification_token_hash = $1,
           verification_token_expires_at = $2,
           verification_email_sent_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [tokenHash, expiresAt, userId]
    );

    return rawToken;
  }

  async verifyEmailToken(rawToken: string): Promise<User | null> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Intentionally idempotent: the token stays valid until it naturally expires rather
    // than being cleared on first use. Verification links are routinely pre-fetched by
    // corporate email security scanners before the real user clicks them, and React's
    // StrictMode double-invokes effects in dev - either would burn a strictly single-use
    // token before the actual user ever completes verification.
    const result = await pool.query(
      `UPDATE users
       SET email_verified = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE verification_token_hash = $1 AND verification_token_expires_at > NOW()
       RETURNING ${USER_COLUMNS}`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapUser(result.rows[0]);
  }

  async generateApiKey(userId: string): Promise<string> {
    const prefix = uuidv4().split('-')[0];
    const secret = crypto.randomBytes(24).toString('hex');
    const apiKey = `${prefix}.${secret}`;
    const apiKeyHash = await bcrypt.hash(secret, 10);

    await pool.query(
      `UPDATE users
       SET api_key_prefix = $1,
           api_key_hash = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [prefix, apiKeyHash, userId]
    );

    return apiKey;
  }

  async verifyApiKey(apiKey: string): Promise<User | null> {
    const parts = apiKey.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [prefix, secret] = parts;
    const result = await pool.query(
      `SELECT ${USER_COLUMNS}, api_key_hash
       FROM users
       WHERE api_key_prefix = $1`,
      [prefix]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const userRow = result.rows[0] as DbUserRow;
    if (!userRow.api_key_hash) {
      return null;
    }

    const isValid = await bcrypt.compare(secret, userRow.api_key_hash);
    if (!isValid) {
      return null;
    }

    return this.mapUser(userRow);
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
      plan: row.plan || 'free',
      subscriptionStatus: row.subscription_status,
      emailVerified: Boolean(row.email_verified),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new UserService();
