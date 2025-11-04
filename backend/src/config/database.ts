import { Pool, PoolConfig } from 'pg';
import { DatabaseConfig } from '../types';

class Database {
  private pool: Pool;
  private static instance: Database;
  private isClosed: boolean = false;

  private constructor() {
    const config: PoolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'campaign_tracker',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    };

    this.pool = new Pool(config);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    // Handle pool connection events
    this.pool.on('connect', () => {
      if (!this.isClosed) {
        console.log('Connected to PostgreSQL database');
      }
    });

    this.pool.on('remove', () => {
      if (!this.isClosed) {
        console.log('Client removed from pool');
      }
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  public async getClient() {
    return await this.pool.connect();
  }

  public async close(): Promise<void> {
    this.isClosed = true;
    await this.pool.end();
    console.log('Database pool closed');
  }

  // Health check method
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Transaction helper
  public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default Database;