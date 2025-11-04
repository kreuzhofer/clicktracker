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
// Only override YouTube API key if not running real API tests
if (process.env.REAL_API_TESTS !== 'true') {
  process.env.YOUTUBE_API_KEY = 'test-youtube-api-key';
}
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests