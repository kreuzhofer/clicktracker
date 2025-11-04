// Jest globals (beforeAll, afterAll, afterEach, jest) are provided by Jest setup
// DO NOT import from 'node:test' - this conflicts with Jest
import Database from '../../src/config/database';
import { MigrationRunner } from '../../src/migrations';
import { resetAuthService } from '../../src/middleware/auth';

// Global test setup and teardown
let db: Database;

beforeAll(async () => {
  // Initialize database connection
  db = Database.getInstance();
  
  // Run migrations for test database
  const migrationRunner = new MigrationRunner();
  await migrationRunner.runMigrations();
  
  if (process.env.NODE_ENV !== 'test') {
    console.log('Test database initialized');
  }
});

afterAll(async () => {
  // Close database connections
  if (db) {
    await db.close();
  }
  if (process.env.NODE_ENV !== 'test') {
    console.log('Test database connections closed');
  }
});

// Clean database between tests - optimized to reduce noise
afterEach(async () => {
  // Get fresh instance in case it was closed
  db = Database.getInstance();
  
  // Reset auth service to ensure fresh instance for each test
  resetAuthService();
  
  if (db) {
    // Use a single transaction to clean all tables efficiently
    try {
      await db.query('BEGIN');
      // Clean all tables in reverse order due to foreign key constraints
      await db.query('DELETE FROM conversion_events');
      await db.query('DELETE FROM click_events');
      await db.query('DELETE FROM campaign_links');
      await db.query('DELETE FROM campaigns');
      await db.query('DELETE FROM youtube_video_stats');
      await db.query('DELETE FROM user_sessions');
      await db.query('DELETE FROM users');
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);