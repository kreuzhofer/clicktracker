# Real YouTube API Testing

This document explains how to run tests against the actual YouTube API instead of mocked responses.

## Overview

The project includes two types of YouTube API tests:

1. **Mock Tests** (`youtube.test.ts`) - Use `MockYouTubeService` for fast, reliable testing without API calls
2. **Real API Tests** (`youtube-real-api.test.ts`) - Make actual calls to YouTube API for integration validation

## When to Use Real API Tests

Real API tests should be used:
- Before deploying to production
- When validating API key functionality
- When testing against real YouTube data
- For debugging API-related issues
- During development of new YouTube features

## Prerequisites

1. **YouTube API Key**: Ensure you have a valid YouTube Data API v3 key in `.env.development`
2. **API Quota**: Real tests consume your daily API quota (10,000 units by default)
3. **Network Connection**: Tests require internet access to reach YouTube servers

## Running Real API Tests

### Step 1: Validate your API key (Recommended)

Before running the full test suite, validate your YouTube API key:

```bash
cd backend
npm run validate:youtube-api
```

This will:
- Check if your API key is properly configured
- Make a test API call to verify it works
- Show you the quota cost of a simple request
- Confirm you're ready for real API testing

### Step 2: Run the tests

#### Method 1: Using the convenience script (Recommended)

```bash
cd backend
npm run test:real-api
```

This script will:
- Verify your API key is configured
- Set up the test database
- Run all real API tests
- Clean up afterwards

#### Method 2: Manual execution

```bash
cd backend

# Set up test database
npm run test:db:up

# Run real API tests with environment flag
REAL_API_TESTS=true npm run test:integration:real-api

# Clean up
npm run test:db:down
```

#### Method 3: Run specific test suites

```bash
# Run only real API tests (without database setup)
REAL_API_TESTS=true npx jest --testPathPattern=youtube-real-api

# Run with specific test name pattern
REAL_API_TESTS=true npx jest --testPathPattern=youtube-real-api --testNamePattern="metadata"
```

## Test Coverage

The real API tests cover:

### Core Functionality
- ✅ YouTube URL validation with real URLs
- ✅ Video metadata fetching for actual videos
- ✅ Bulk metadata operations
- ✅ View count retrieval
- ✅ Health checks against real API

### Error Handling
- ✅ Non-existent video handling
- ✅ Invalid video ID formats
- ✅ Rate limiting behavior
- ✅ Network error scenarios

### Performance
- ✅ Response time validation
- ✅ Bulk operation efficiency
- ✅ API quota tracking

### Real Data Validation
- ✅ Rick Roll video (dQw4w9WgXcQ) - guaranteed to exist with millions of views
- ✅ Multiple popular videos for bulk operations
- ✅ Actual view counts and metadata accuracy

## Test Videos Used

The tests use well-known YouTube videos that are unlikely to be removed:

- `dQw4w9WgXcQ` - Rick Astley's "Never Gonna Give You Up" (Rick Roll)
- `jNQXAC9IVRw` - Another stable, popular video

These videos are chosen because they:
- Have been on YouTube for many years
- Have millions of views
- Are unlikely to be deleted
- Provide consistent test data

## API Quota Considerations

Each test run consumes approximately:
- **Video metadata fetch**: 1 unit per video
- **Bulk metadata fetch**: 1 unit per request (up to 50 videos)
- **View count fetch**: 1 unit per video
- **Health check**: 1 unit

A full test run uses approximately **15-20 quota units**.

With the default 10,000 daily quota, you can run the full test suite ~500 times per day.

## Environment Variables

Required in `.env.development`:

```bash
YOUTUBE_API_KEY=your_actual_youtube_api_key_here
```

Optional test configuration:

```bash
# Enable real API tests (set by test scripts)
REAL_API_TESTS=true

# Increase test timeouts for slower connections (milliseconds)
JEST_TIMEOUT=30000
```

## Troubleshooting

### API Key Issues

```bash
# Error: YOUTUBE_API_KEY not found
# Solution: Add your API key to .env.development
echo "YOUTUBE_API_KEY=your_key_here" >> .env.development
```

### Quota Exceeded

```bash
# Error: YouTube API quota exceeded
# Solution: Wait until quota resets (daily) or increase quota in Google Cloud Console
```

### Network Timeouts

```bash
# Error: Request timeout
# Solution: Increase timeout or check network connection
JEST_TIMEOUT=60000 npm run test:real-api
```

### Rate Limiting

```bash
# Error: Rate limit exceeded
# Solution: Tests include rate limiting handling, but you may need to wait between runs
```

## CI/CD Integration

For continuous integration, consider:

1. **Separate API key** for CI/CD with appropriate quota
2. **Conditional execution** based on environment or branch
3. **Quota monitoring** to avoid exhausting limits
4. **Fallback to mock tests** if real API tests fail

Example GitHub Actions configuration:

```yaml
- name: Run Real API Tests
  if: github.ref == 'refs/heads/main'
  env:
    YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
    REAL_API_TESTS: true
  run: npm run test:real-api
```

## Best Practices

1. **Validate API key first** - Use `npm run validate:youtube-api` before running tests
2. **Run mock tests first** - They're faster and don't consume quota
3. **Use real API tests sparingly** - Reserve for important validations
4. **Monitor quota usage** - Keep track of daily consumption
5. **Test with real data** - Validate against actual YouTube content
6. **Handle failures gracefully** - Real API tests may fail due to network issues

## Monitoring and Debugging

The real API tests include:
- Response time measurements
- Quota usage tracking
- Detailed error logging
- Network failure handling

Check test output for:
- API response times
- Quota consumption
- Error details
- Network connectivity issues