#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { MigrationRunner } from '../migrations';

// Load environment variables
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const migrationRunner = new MigrationRunner();

  try {
    switch (command) {
      case 'up':
        await migrationRunner.runMigrations();
        break;
      
      case 'down':
        const migrationId = args[1];
        if (!migrationId) {
          console.error('Please provide migration ID to rollback');
          process.exit(1);
        }
        await migrationRunner.rollbackMigration(migrationId);
        break;
      
      case 'status':
        const status = await migrationRunner.getStatus();
        console.log('\nMigration Status:');
        console.log('================');
        status.forEach(migration => {
          const status = migration.executed ? '✓' : '✗';
          const executedAt = migration.executed_at 
            ? ` (${migration.executed_at.toISOString()})` 
            : '';
          console.log(`${status} ${migration.id}: ${migration.name}${executedAt}`);
        });
        break;
      
      default:
        console.log('Usage: npm run migrate <command>');
        console.log('Commands:');
        console.log('  up       - Run all pending migrations');
        console.log('  down <id> - Rollback a specific migration');
        console.log('  status   - Show migration status');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();