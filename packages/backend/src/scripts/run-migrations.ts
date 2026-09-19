import pool from '../db';
import { runMigrations } from '../services/migrationRunner';

async function main() {
  try {
    console.log('Starting database migrations...');

    const result = await runMigrations();

    for (const file of result.alreadyApplied) {
      console.log(`✓ Migration ${file} already applied, skipping...`);
    }
    for (const file of result.applied) {
      console.log(`✓ Migration ${file} completed successfully`);
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
