import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_analytics',
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

export default pool;
