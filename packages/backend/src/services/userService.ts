import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pool from '../db';
import { PlanId } from 'test-analytics-shared';

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  plan: PlanId;
  subscriptionStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BillingProfile {
  id: string;
  email: string;
  plan: PlanId;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
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
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: string;
  current_period_end?: Date;
  created_at: Date;
  updated_at: Date;
}

const USER_COLUMNS = `id, email, name, avatar_url, plan, subscription_status, created_at, updated_at`;

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
      `SELECT id, email, password_hash, name, avatar_url, plan, subscription_status, created_at, updated_at
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
      const linked = await pool.query(
        `UPDATE users
         SET google_id = $1,
             avatar_url = COALESCE($2, avatar_url),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING ${USER_COLUMNS}`,
        [profile.googleId, profile.avatarUrl, existingByEmail.rows[0].id]
      );
      return this.mapUser(linked.rows[0]);
    }

    const id = uuidv4();
    const created = await pool.query(
      `INSERT INTO users (id, email, password_hash, name, google_id, avatar_url)
       VALUES ($1, $2, NULL, $3, $4, $5)
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
      `SELECT id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end
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
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      subscriptionStatus: row.subscription_status,
      currentPeriodEnd: row.current_period_end,
    };
  }

  async getBillingProfileByStripeCustomerId(stripeCustomerId: string): Promise<BillingProfile | null> {
    const result = await pool.query(
      `SELECT id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end
       FROM users
       WHERE stripe_customer_id = $1`,
      [stripeCustomerId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      plan: row.plan,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      subscriptionStatus: row.subscription_status,
      currentPeriodEnd: row.current_period_end,
    };
  }

  async setStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
    await pool.query(
      `UPDATE users SET stripe_customer_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [stripeCustomerId, userId]
    );
  }

  async updateSubscription(
    userId: string,
    updates: {
      plan: PlanId;
      stripeSubscriptionId?: string | null;
      subscriptionStatus?: string | null;
      currentPeriodEnd?: Date | null;
    }
  ): Promise<void> {
    await pool.query(
      `UPDATE users
       SET plan = $1,
           stripe_subscription_id = $2,
           subscription_status = $3,
           current_period_end = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [updates.plan, updates.stripeSubscriptionId || null, updates.subscriptionStatus || null, updates.currentPeriodEnd || null, userId]
    );
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new UserService();
