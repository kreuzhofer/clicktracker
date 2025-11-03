// Jest setup file for backend tests
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Setup test database connection, etc.
});

afterAll(async () => {
  // Cleanup test resources
});

// Mock console methods in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};