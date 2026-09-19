import * as fs from 'fs';
import * as path from 'path';
import pool from '../db';

export interface MigrationRunResult {
  applied: string[];
  alreadyApplied: string[];
}

// Core migration logic, safe to call from a long-lived process (does not
// close the pool or exit) - used by both the CLI script and the
// browser-triggerable /api/admin/run-migrations endpoint, since production
// has no automatic migration step in its deploy process and isn't always
// reachable from a terminal.
export async function runMigrations(): Promise<MigrationRunResult> {
  const client = await pool.connect();
  const applied: string[] = [];
  const alreadyApplied: string[] = [];

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const result = await client.query('SELECT migration_name FROM schema_migrations WHERE migration_name = $1', [file]);

      if (result.rows.length > 0) {
        alreadyApplied.push(file);
        continue;
      }

      const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(migrationSQL);
        await client.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${error instanceof Error ? error.message : error}`);
      }
    }

    return { applied, alreadyApplied };
  } finally {
    client.release();
  }
}
