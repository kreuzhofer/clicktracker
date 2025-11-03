#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { SeedRunner } from '../seeds';

// Load environment variables
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const seedRunner = new SeedRunner();

  try {
    switch (command) {
      case 'dev':
        await seedRunner.seedDevelopmentData();
        break;
      
      case 'test':
        await seedRunner.seedTestData();
        break;
      
      case 'clear':
        const confirm = args[1];
        if (confirm !== '--confirm') {
          console.log('This will delete ALL data from the database.');
          console.log('Use: npm run seed clear --confirm');
          process.exit(1);
        }
        await seedRunner.clearAllData();
        break;
      
      default:
        console.log('Usage: npm run seed <command>');
        console.log('Commands:');
        console.log('  dev    - Seed development data');
        console.log('  test   - Seed test data');
        console.log('  clear --confirm - Clear all data (requires confirmation)');
        process.exit(1);
    }
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();