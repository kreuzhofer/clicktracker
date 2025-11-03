import Database from '../config/database';
import fs from 'fs';
import path from 'path';

export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
}

export class MigrationRunner {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async initialize(): Promise<void> {
    // Create migrations table if it doesn't exist
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await this.db.query(query);
  }

  async getExecutedMigrations(): Promise<string[]> {
    const query = 'SELECT id FROM migrations ORDER BY executed_at ASC';
    const result = await this.db.query(query);
    return result.rows.map((row: any) => row.id);
  }

  async loadMigrations(): Promise<Migration[]> {
    const migrationsDir = path.join(__dirname, 'files');
    const migrations: Migration[] = [];

    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      return migrations;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Parse migration file (expecting -- UP and -- DOWN sections)
      const upMatch = content.match(/-- UP\s*\n([\s\S]*?)(?=-- DOWN|\s*$)/i);
      const downMatch = content.match(/-- DOWN\s*\n([\s\S]*?)$/i);

      if (upMatch) {
        const id = file.replace('.sql', '');
        const name = id.replace(/^\d+_/, '').replace(/_/g, ' ');
        
        migrations.push({
          id,
          name,
          up: upMatch[1].trim(),
          down: downMatch ? downMatch[1].trim() : ''
        });
      }
    }

    return migrations;
  }

  async runMigrations(): Promise<void> {
    await this.initialize();
    
    const allMigrations = await this.loadMigrations();
    const executedMigrations = await this.getExecutedMigrations();
    
    const pendingMigrations = allMigrations.filter(
      migration => !executedMigrations.includes(migration.id)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Running ${pendingMigrations.length} pending migrations...`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`Running migration: ${migration.name}`);
        
        await this.db.transaction(async (client) => {
          // Execute the migration
          await client.query(migration.up);
          
          // Record the migration as executed
          await client.query(
            'INSERT INTO migrations (id, name) VALUES ($1, $2)',
            [migration.id, migration.name]
          );
        });

        console.log(`✓ Migration completed: ${migration.name}`);
      } catch (error) {
        console.error(`✗ Migration failed: ${migration.name}`, error);
        throw error;
      }
    }

    console.log('All migrations completed successfully');
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    const allMigrations = await this.loadMigrations();
    const migration = allMigrations.find(m => m.id === migrationId);
    
    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    if (!migration.down) {
      throw new Error(`No rollback script for migration: ${migrationId}`);
    }

    const executedMigrations = await this.getExecutedMigrations();
    if (!executedMigrations.includes(migrationId)) {
      throw new Error(`Migration not executed: ${migrationId}`);
    }

    try {
      console.log(`Rolling back migration: ${migration.name}`);
      
      await this.db.transaction(async (client) => {
        // Execute the rollback
        await client.query(migration.down);
        
        // Remove the migration record
        await client.query('DELETE FROM migrations WHERE id = $1', [migrationId]);
      });

      console.log(`✓ Migration rolled back: ${migration.name}`);
    } catch (error) {
      console.error(`✗ Rollback failed: ${migration.name}`, error);
      throw error;
    }
  }

  async getStatus(): Promise<Array<{ id: string; name: string; executed: boolean; executed_at?: Date }>> {
    await this.initialize();
    
    const allMigrations = await this.loadMigrations();
    const executedQuery = `
      SELECT id, executed_at 
      FROM migrations 
      ORDER BY executed_at ASC
    `;
    const executedResult = await this.db.query(executedQuery);
    const executedMap = new Map(
      executedResult.rows.map((row: any) => [row.id, row.executed_at])
    );

    return allMigrations.map(migration => ({
      id: migration.id,
      name: migration.name,
      executed: executedMap.has(migration.id),
      executed_at: executedMap.get(migration.id) as Date | undefined
    }));
  }
}