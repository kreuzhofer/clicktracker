module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/scripts/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  
  // Test patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  
  // Environment variables for testing
  setupFiles: ['<rootDir>/tests/setup/env.setup.ts'],
  
  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
};