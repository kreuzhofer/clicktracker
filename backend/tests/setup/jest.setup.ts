import Database from '../../src/config/database';
import { MigrationRunner } from '../../src/migrations';

// Global test setup and teardown
let db: Database;

beforeAll(async () => {
  // Initialize database connection
  db = Database.getInstance();
  
  // Run migrations for test database
  const migrationRunner = new MigrationRunner();
  await migrationRunner.runMigrations();
  
  console.log('Test database initialized');
});

afterAll(async () => {
  // Close database connections
  if (db) {
    await db.close();
  }
  console.log('Test database connections closed');
});

// Clean database between tests
afterEach(async () => {
  if (db) {
    // Clean all tables in reverse order due to foreign key constraints
    await db.query('DELETE FROM conversion_events');
    await db.query('DELETE FROM click_events');
    await db.query('DELETE FROM campaign_links');
    await db.query('DELETE FROM campaigns');
    await db.query('DELETE FROM youtube_video_stats');
    await db.query('DELETE FROM user_sessions');
    await db.query('DELETE FROM users');
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);