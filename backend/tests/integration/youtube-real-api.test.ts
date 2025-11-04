import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';
import { YouTubeService } from '../../src/services/YouTubeService';

// Jest globals (describe, it, expect, beforeAll, beforeEach) are available through setup files

// Skip these tests unless REAL_API_TESTS environment variable is set
const describeRealApi = process.env.REAL_API_TESTS === 'true' ? describe : describe.skip;

describeRealApi('YouTube Real API Integration Tests', () => {
  let authToken: string;
  let youtubeService: YouTubeService;

  beforeAll(async () => {
    // Verify API key is available
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY environment variable is required for real API tests');
    }

    // Check if we're using the test API key (which won't work for real API calls)
    if (process.env.YOUTUBE_API_KEY === 'test-youtube-api-key') {
      console.warn('⚠️  Using test API key - real API tests will fail. Set a real YouTube API key in .env.development');
    }

    // Create real YouTube service instance
    youtubeService = new YouTubeService({
      apiKey: process.env.YOUTUBE_API_KEY!
    });
  });

  beforeEach(async () => {
    // Create and login test user for each test
    await TestHelpers.createTestUser();
    authToken = await TestHelpers.loginTestUser();
  });

  describe('Real YouTube API Health Check', () => {
    it('should successfully connect to YouTube API', async () => {
      const isHealthy = await youtubeService.healthCheck();
      expect(isHealthy).toBe(true);
    }, 15000); // Longer timeout for real API calls

    it('should return valid quota information', async () => {
      const quotaInfo = youtubeService.getQuotaInfo();
      expect(quotaInfo).toMatchObject({
        requestCount: expect.any(Number),
        resetTime: expect.any(Number),
        limit: expect.any(Number)
      });
      expect(quotaInfo.limit).toBeGreaterThan(0);
    });
  });

  describe('Real YouTube URL Validation', () => {
    it('should validate real YouTube URLs correctly', async () => {
      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll - famous video
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Another well-known video
        'https://youtu.be/jNQXAC9IVRw'
      ];

      for (const url of testUrls) {
        const response = await request(app)
          .post('/api/youtube/validate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ url });

        expect(response.status).toBe(200);
        expect(response.body.isValid).toBe(true);
        expect(response.body.videoId).toBeDefined();
        expect(response.body.extractedUrl).toBe(url);
      }
    }, 20000);

    it('should reject invalid URLs', async () => {
      // Test clearly invalid URLs that should definitely fail
      const invalidUrls = [
        'https://www.google.com',
        'not-a-url-at-all'
      ];

      for (const url of invalidUrls) {
        const response = await request(app)
          .post('/api/youtube/validate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ url });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation failed');
      }
    });
  });

  describe('Real YouTube Metadata Fetching', () => {
    it('should fetch real metadata for Rick Roll video', async () => {
      const response = await request(app)
        .get('/api/youtube/metadata/dQw4w9WgXcQ')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        video_id: 'dQw4w9WgXcQ',
        title: expect.stringContaining('Rick'), // Should contain "Rick" in title
        thumbnail_url: expect.stringMatching(/^https?:\/\//),
        view_count: expect.any(Number),
        channel_title: expect.any(String),
        published_at: expect.any(String)
      });
      
      // Rick Roll should have millions of views
      expect(response.body.data.view_count).toBeGreaterThan(1000000);
      
      // Validate thumbnail URL format
      expect(response.body.data.thumbnail_url).toMatch(/\.(jpg|jpeg|png|webp)$/i);
      
      // Validate published date is reasonable (should be from 2009)
      const publishedDate = new Date(response.body.data.published_at);
      expect(publishedDate.getFullYear()).toBe(2009);
    }, 15000);

    it('should fetch metadata for multiple real videos', async () => {
      const videoIds = [
        'dQw4w9WgXcQ', // Rick Roll
        'jNQXAC9IVRw'  // Another popular video
      ];

      const response = await request(app)
        .post('/api/youtube/metadata/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ videoIds });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(response.body.requested).toBe(2);

      // Verify each video has required fields
      response.body.data.forEach((video: any) => {
        expect(video).toMatchObject({
          video_id: expect.any(String),
          title: expect.any(String),
          thumbnail_url: expect.stringMatching(/^https?:\/\//),
          view_count: expect.any(Number),
          channel_title: expect.any(String),
          published_at: expect.any(String)
        });
        expect(video.view_count).toBeGreaterThan(0);
      });
    }, 20000);

    it('should handle non-existent video gracefully', async () => {
      // Use a video ID that definitely doesn't exist
      const response = await request(app)
        .get('/api/youtube/metadata/aaaaaaaaaaa')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Video not found');
    }, 15000);
  });

  describe('Real YouTube View Count Fetching', () => {
    it('should fetch real view count for popular video', async () => {
      const response = await request(app)
        .get('/api/youtube/views/dQw4w9WgXcQ')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.videoId).toBe('dQw4w9WgXcQ');
      expect(response.body.viewCount).toBeGreaterThan(1000000); // Should have millions of views
      expect(response.body.fetchedAt).toBeDefined();
      
      // Validate timestamp format
      const fetchedAt = new Date(response.body.fetchedAt);
      expect(fetchedAt.getTime()).toBeGreaterThan(Date.now() - 60000); // Within last minute
    }, 15000);

    it('should fetch view counts for multiple real videos', async () => {
      const videoIds = ['dQw4w9WgXcQ', 'jNQXAC9IVRw'];

      const response = await request(app)
        .post('/api/youtube/views/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ videoIds });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dQw4w9WgXcQ');
      expect(response.body.data).toHaveProperty('jNQXAC9IVRw');
      expect(response.body.count).toBe(2);
      expect(response.body.requested).toBe(2);
      expect(response.body.fetchedAt).toBeDefined();

      // Both videos should have substantial view counts
      expect(response.body.data.dQw4w9WgXcQ).toBeGreaterThan(1000000);
      expect(response.body.data.jNQXAC9IVRw).toBeGreaterThan(100000);
    }, 20000);
  });

  describe('Real API Error Handling', () => {
    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests to potentially trigger rate limiting
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/youtube/metadata/dQw4w9WgXcQ')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.allSettled(promises);
      
      // At least some requests should succeed
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      expect(successful.length).toBeGreaterThan(0);

      // If any failed due to rate limiting, they should have appropriate error
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );
      rateLimited.forEach((response: any) => {
        expect(response.value.body.error).toMatch(/rate limit|quota/i);
      });
    }, 30000);

    it('should validate video ID format before API call', async () => {
      const invalidIds = ['too-short', 'way-too-long-video-id', 'invalid@chars'];

      for (const videoId of invalidIds) {
        const response = await request(app)
          .get(`/api/youtube/metadata/${videoId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Parameter validation failed');
      }
    });
  });

  describe('Real API Service Methods', () => {
    it('should validate YouTube URLs using service method', () => {
      const validUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ'
      ];

      validUrls.forEach(url => {
        const result = youtubeService.validateYouTubeUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.videoId).toBe('dQw4w9WgXcQ');
        expect(result.error).toBeUndefined();
      });
    });

    it('should extract video IDs correctly', () => {
      const testCases = [
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://youtu.be/jNQXAC9IVRw', expected: 'jNQXAC9IVRw' },
        { url: 'https://www.youtube.com/embed/abc123def45', expected: 'abc123def45' },
        { url: 'https://www.google.com', expected: null },
        { url: 'invalid-url', expected: null }
      ];

      testCases.forEach(({ url, expected }) => {
        const result = youtubeService.extractVideoId(url);
        expect(result).toBe(expected);
      });
    });

    it('should fetch real video metadata using service method', async () => {
      const metadata = await youtubeService.getVideoMetadata('dQw4w9WgXcQ');
      
      expect(metadata).toMatchObject({
        video_id: 'dQw4w9WgXcQ',
        title: expect.any(String),
        thumbnail_url: expect.stringMatching(/^https?:\/\//),
        view_count: expect.any(Number),
        channel_title: expect.any(String),
        published_at: expect.any(Date)
      });
      
      expect(metadata.view_count).toBeGreaterThan(1000000);
      expect(metadata.title).toMatch(/rick/i);
    }, 15000);

    it('should fetch real view count using service method', async () => {
      const viewCount = await youtubeService.getVideoViewCount('dQw4w9WgXcQ');
      
      expect(viewCount).toBeGreaterThan(1000000);
      expect(typeof viewCount).toBe('number');
    }, 15000);

    it('should fetch bulk view counts using service method', async () => {
      const videoIds = ['dQw4w9WgXcQ', 'jNQXAC9IVRw'];
      const viewCounts = await youtubeService.getBulkVideoViewCounts(videoIds);
      
      expect(Object.keys(viewCounts)).toHaveLength(2);
      expect(viewCounts.dQw4w9WgXcQ).toBeGreaterThan(1000000);
      expect(viewCounts.jNQXAC9IVRw).toBeGreaterThan(100000);
    }, 20000);
  });

  describe('Real API Performance Tests', () => {
    it('should complete single video metadata fetch within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/youtube/metadata/dQw4w9WgXcQ')
        .set('Authorization', `Bearer ${authToken}`);
      
      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, 15000);

    it('should handle bulk requests efficiently', async () => {
      const videoIds = ['dQw4w9WgXcQ', 'jNQXAC9IVRw'];
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/youtube/metadata/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ videoIds });
      
      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(duration).toBeLessThan(15000); // Bulk should complete within 15 seconds
    }, 20000);
  });
});