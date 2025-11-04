import Database from '../../../src/config/database';

describe('Database Configuration Unit Tests', () => {
  let db: Database;

  beforeEach(() => {
    db = Database.getInstance();
  });

  afterEach(async () => {
    // Clean up any connections
    await db.close();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const db1 = Database.getInstance();
      const db2 = Database.getInstance();

      expect(db1).toBe(db2);
    });

    it('should return Database instance', () => {
      expect(db).toBeInstanceOf(Database);
    });
  });

  describe('getPool', () => {
    it('should return pool instance', () => {
      const pool = db.getPool();
      expect(pool).toBeDefined();
      expect(typeof pool.query).toBe('function');
    });
  });

  describe('healthCheck', () => {
    it('should return true for successful health check', async () => {
      const isHealthy = await db.healthCheck();
      expect(typeof isHealthy).toBe('boolean');
    });

    it('should handle health check errors gracefully', async () => {
      // Mock a query failure
      const originalQuery = db.query;
      db.query = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await db.healthCheck();
      expect(isHealthy).toBe(false);

      // Restore original method
      db.query = originalQuery;
    });
  });

  describe('query', () => {
    it('should execute simple query successfully', async () => {
      const result = await db.query('SELECT NOW() as current_time');
      
      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(Array.isArray(result.rows)).toBe(true);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should execute parameterized query successfully', async () => {
      const result = await db.query('SELECT $1 as test_value', ['test']);
      
      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(result.rows[0].test_value).toBe('test');
    });

    it('should handle query errors', async () => {
      await expect(db.query('INVALID SQL QUERY'))
        .rejects.toThrow();
    });
  });

  describe('getClient', () => {
    it('should return database client', async () => {
      const client = await db.getClient();
      
      expect(client).toBeDefined();
      expect(typeof client.query).toBe('function');
      expect(typeof client.release).toBe('function');
      
      // Release the client back to pool
      client.release();
    });
  });

  describe('transaction', () => {
    it('should execute transaction successfully', async () => {
      const result = await db.transaction(async (client) => {
        const queryResult = await client.query('SELECT $1 as test_value', ['transaction_test']);
        return queryResult.rows[0].test_value;
      });

      expect(result).toBe('transaction_test');
    });

    it('should rollback transaction on error', async () => {
      await expect(
        db.transaction(async (client) => {
          await client.query('SELECT 1');
          throw new Error('Transaction error');
        })
      ).rejects.toThrow('Transaction error');
    });

    it('should handle database errors in transaction', async () => {
      await expect(
        db.transaction(async (client) => {
          await client.query('INVALID SQL');
        })
      ).rejects.toThrow();
    });
  });

  describe('close', () => {
    it('should close database connection pool', async () => {
      const testDb = Database.getInstance();
      
      // This should not throw an error
      await expect(testDb.close()).resolves.not.toThrow();
    });
  });
});