// Set test environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5434';
process.env.DB_NAME = 'campaign_tracker_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_MAX_CONNECTIONS = '5';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6381';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
// Load YouTube API key based on test type
if (process.env.REAL_API_TESTS === 'true') {
  // Load real API key from .env.test file
  const dotenv = require('dotenv');
  const path = require('path');
  const envPath = path.resolve(__dirname, '../../.env.test');
  const envConfig = dotenv.config({ path: envPath });
  if (envConfig.parsed && envConfig.parsed.YOUTUBE_API_KEY) {
    process.env.YOUTUBE_API_KEY = envConfig.parsed.YOUTUBE_API_KEY;
  }
} else {
  process.env.YOUTUBE_API_KEY = 'test-youtube-api-key';
}
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests