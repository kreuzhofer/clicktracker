import Database from '../../src/config/database';

/**
 * TestTransaction provides transaction-based test isolation
 * Each test runs in its own transaction that gets rolled back after completion
 */
export class TestTransaction {
  private client: any = null;
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Begin a new transaction for test isolation
   */
  async begin(): Promise<any> {
    if (this.client) {
      throw new Error('Transaction already started');
    }
    
    this.client = await this.db.getClient();
    await this.client.query('BEGIN');
    return this.client;
  }

  /**
   * Rollback the transaction (used in afterEach)
   */
  async rollback(): Promise<void> {
    if (this.client) {
      try {
        await this.client.query('ROLLBACK');
      } catch (error) {
        // Ignore rollback errors - transaction might already be rolled back
        console.warn('Transaction rollback warning:', error);
      } finally {
        this.client.release();
        this.client = null;
      }
    }
  }

  /**
   * Commit the transaction (rarely used in tests)
   */
  async commit(): Promise<void> {
    if (this.client) {
      try {
        await this.client.query('COMMIT');
      } finally {
        this.client.release();
        this.client = null;
      }
    }
  }

  /**
   * Get the current transaction client
   */
  getClient(): any {
    if (!this.client) {
      throw new Error('Transaction not started. Call begin() first.');
    }
    return this.client;
  }

  /**
   * Check if transaction is active
   */
  isActive(): boolean {
    return this.client !== null;
  }
}

/**
 * Helper function to wrap a test suite with transaction isolation
 */
export function withTransactionIsolation(testSuite: () => void) {
  let transaction: TestTransaction;

  beforeEach(async () => {
    transaction = new TestTransaction();
    await transaction.begin();
  });

  afterEach(async () => {
    if (transaction) {
      await transaction.rollback();
    }
  });

  testSuite();
}