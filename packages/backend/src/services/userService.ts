import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';

interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DbUserRow {
  id: string;
  email: string;
  password_hash: string;
  name?: string;
  created_at: Date;
  updated_at: Date;
}

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
       RETURNING id, email, name, created_at, updated_at`,
      [id, email.toLowerCase(), passwordHash, name]
    );

    return this.mapUser(result.rows[0]);
  }

  async login(email: string, password: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, password_hash, name, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const userRow = result.rows[0] as DbUserRow;
    const isValid = await bcrypt.compare(password, userRow.password_hash);

    if (!isValid) {
      return null;
    }

    return this.mapUser(userRow);
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, name, created_at, updated_at
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
      `SELECT id, email, name, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapUser(result.rows[0]);
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new UserService();
