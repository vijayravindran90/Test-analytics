import pool from '../db';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migrations...');
    
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of migrationFiles) {
      // Check if migration has already been run
      const result = await client.query(
        'SELECT migration_name FROM schema_migrations WHERE migration_name = $1',
        [file]
      );
      
      if (result.rows.length > 0) {
        console.log(`✓ Migration ${file} already applied, skipping...`);
        continue;
      }
      
      console.log(`Running migration: ${file}...`);
      
      // Read and execute migration SQL
      const migrationSQL = fs.readFileSync(
        path.join(migrationsDir, file),
        'utf-8'
      );
      
      await client.query('BEGIN');
      
      try {
        await client.query(migrationSQL);
        
        // Record migration as executed
        await client.query(
          'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
          [file]
        );
        
        await client.query('COMMIT');
        console.log(`✓ Migration ${file} completed successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ Migration ${file} failed:`, error);
        throw error;
      }
    }
    
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
runMigrations();
