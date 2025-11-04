import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';

import { v4 as uuidv4 } from 'uuid';

describe('URL Shortener Integration Tests', () => {
  let authToken: string;
  let testCampaign: any;
  let testCampaignLink: any;
  let testShortCode: string;

  beforeEach(async () => {
    // Create test user and get auth token
    await TestHelpers.createTestUser();
    authToken = await TestHelpers.loginTestUser();
    
    // Create test campaign
    testCampaign = await TestHelpers.createTestCampaign();
    
    // Create test campaign link
    testCampaignLink = await TestHelpers.createTestCampaignLink(testCampaign.id);
  });

  // Helper function to create additional test context when needed
  async function createAdditionalTestContext() {
    const userEmail = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
    const password = 'TestPassword123!';
    await TestHelpers.createTestUser({ email: userEmail, password });
    const authToken = await TestHelpers.loginTestUser(userEmail, password);
    
    const testCampaign = await TestHelpers.createTestCampaign({
      name: `Test Campaign ${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    
    const testCampaignLink = await TestHelpers.createTestCampaignLink(testCampaign.id);
    
    return { authToken, testCampaign, testCampaignLink };
  }

  describe('POST /api/shortener/shorten', () => {
    it('should create a shortened URL with generated short code', async () => {
      
      const shortenRequest = {
        campaignId: testCampaign.id,
        landingPageUrl: 'https://example.com/landing',
        youtubeVideoId: 'dQw4w9WgXcQ'
      };

      const response = await request(app)
        .post('/api/shortener/shorten')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shortenRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('shortCode');
      expect(response.body.data).toHaveProperty('shortUrl');
      expect(response.body.data).toHaveProperty('campaignLinkId');
      expect(response.body.data.shortCode).toMatch(/^[a-zA-Z0-9]+$/);
      expect(response.body.data.shortUrl).toContain(response.body.data.shortCode);
      expect(response.body.data.landingPageUrl).toBe(shortenRequest.landingPageUrl);
      expect(response.body.data.youtubeVideoId).toBe(shortenRequest.youtubeVideoId);
    });

    it('should create a shortened URL with custom alias', async () => {
      const customAlias = `test${Date.now().toString().slice(-5)}`; // Max 9 chars
      const shortenRequest = {
        campaignId: testCampaign.id,
        landingPageUrl: 'https://example.com/custom',
        youtubeVideoId: 'dQw4w9WgXcQ',
        customAlias
      };

      const response = await request(app)
        .post('/api/shortener/shorten')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shortenRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.shortCode).toBe(customAlias);
      expect(response.body.data.shortUrl).toContain(customAlias);
    });

    it('should return 409 for duplicate custom alias', async () => {
      const customAlias = `dup${Date.now().toString().slice(-6)}`; // Max 9 chars
      
      // Create first link with custom alias
      await request(app)
        .post('/api/shortener/shorten')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId: testCampaign.id,
          landingPageUrl: 'https://example.com/first',
          youtubeVideoId: 'dQw4w9WgXcQ',
          customAlias
        })
        .expect(201);

      // Try to create second link with same alias
      const response = await request(app)
        .post('/api/shortener/shorten')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId: testCampaign.id,
          landingPageUrl: 'https://example.com/second',
          youtubeVideoId: 'dQw4w9WgXcQ',
          customAlias
        })
        .expect(409);

      TestHelpers.expectConflictError(response, 'Custom alias is already taken');
    });

    it('should validate request data', async () => {
      const invalidRequests = [
        {
          // Missing campaignId
          landingPageUrl: 'https://example.com',
          youtubeVideoId: 'dQw4w9WgXcQ'
        },
        {
          campaignId: 'invalid-uuid',
          landingPageUrl: 'https://example.com',
          youtubeVideoId: 'dQw4w9WgXcQ'
        },
        {
          campaignId: testCampaign.id,
          landingPageUrl: 'not-a-url',
          youtubeVideoId: 'dQw4w9WgXcQ'
        },
        {
          campaignId: testCampaign.id,
          landingPageUrl: 'https://example.com',
          youtubeVideoId: 'invalid-video-id'
        },
        {
          campaignId: testCampaign.id,
          landingPageUrl: 'https://example.com',
          youtubeVideoId: 'dQw4w9WgXcQ',
          customAlias: 'a' // Too short
        }
      ];

      for (const invalidRequest of invalidRequests) {
        await request(app)
          .post('/api/shortener/shorten')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidRequest)
          .expect(400);
      }
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/shortener/shorten')
        .send({
          campaignId: testCampaign.id,
          landingPageUrl: 'https://example.com',
          youtubeVideoId: 'dQw4w9WgXcQ'
        })
        .expect(401);
    });
  });

  describe('GET /:shortCode (redirect endpoint)', () => {
    it('should redirect to landing page and track click', async () => {
      
      // Create a short URL for this test
      const shortenResponse = await request(app)
        .post('/api/shortener/shorten')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId: testCampaign.id,
          landingPageUrl: 'https://example.com/redirect-test',
          youtubeVideoId: 'dQw4w9WgXcQ'
        });
      
      const testShortCode = shortenResponse.body.data.shortCode;
      
      const response = await request(app)
        .get(`/${testShortCode}`)
        .set('User-Agent', 'Test User Agent')
        .set('Referer', 'https://youtube.com/watch?v=dQw4w9WgXcQ')
        .expect(302);

      expect(response.headers.location).toContain('https://example.com/redirect-test');
      expect(response.headers.location).toContain('utm_source=youtube');
      expect(response.headers.location).toContain('utm_medium=campaign_link');
      expect(response.headers.location).toContain('tracking_id=');
      expect(response.headers.location).toContain('click_id=');
    });

    it('should return 404 for non-existent short code', async () => {
      const response = await request(app)
        .get('/abc123')
        .expect(404);

      expect(response.text).toContain('Link Not Found');
      expect(response.text).toContain('<!DOCTYPE html>');
    });

    it('should handle custom alias redirects', async () => {
      const customAlias = `red${Date.now().toString().slice(-6)}`; // Max 9 chars
      
      // Create link with custom alias
      await request(app)
        .post('/api/shortener/shorten')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId: testCampaign.id,
          landingPageUrl: 'https://example.com/custom-redirect',
          youtubeVideoId: 'dQw4w9WgXcQ',
          customAlias
        });

      const response = await request(app)
        .get(`/${customAlias}`)
        .expect(302);

      expect(response.headers.location).toContain('https://example.com/custom-redirect');
    });
  });

  describe('POST /api/shortener/validate-url', () => {
    it('should validate valid URLs', async () => {
      
      const response = await request(app)
        .post('/api/shortener/validate-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: 'https://example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.url).toBe('https://example.com');
    });

    it('should reject invalid URLs', async () => {
      const response = await request(app)
        .post('/api/shortener/validate-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: 'not-a-url' })
        .expect(400);

      TestHelpers.expectValidationError(response, 'url');
    });
  });

  describe('POST /api/shortener/extract-video-id', () => {
    it('should extract video ID from YouTube URLs', async () => {
      const testUrls = [
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s'
      ];

      for (const url of testUrls) {
        const response = await request(app)
          .post('/api/shortener/extract-video-id')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ url })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.videoId).toBe('dQw4w9WgXcQ');
        expect(response.body.data.isValid).toBe(true);
      }
    });

    it('should return error for non-YouTube URLs', async () => {
      const response = await request(app)
        .post('/api/shortener/extract-video-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: 'https://example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unable to extract YouTube video ID');
    });
  });

  describe('GET /api/shortener/stats/:campaignLinkId', () => {
    it('should return click statistics', async () => {
      
      // Create a fresh campaign and campaign link for this test to avoid conflicts
      const statsTestCampaign = await TestHelpers.createTestCampaign({
        name: `Stats Test Campaign ${Date.now()}`
      });
      const statsTestCampaignLink = await TestHelpers.createTestCampaignLink(statsTestCampaign.id);
      
      // Create some test clicks
      const trackingId = uuidv4();
      await TestHelpers.createTestClick(statsTestCampaignLink.id, trackingId);
      await TestHelpers.createTestClick(statsTestCampaignLink.id, uuidv4());

      const response = await request(app)
        .get(`/api/shortener/stats/${statsTestCampaignLink.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('campaignLinkId');
      expect(response.body.data).toHaveProperty('totalClicks');
      expect(response.body.data).toHaveProperty('uniqueClicks');
      expect(response.body.data).toHaveProperty('recentClicks');
      expect(response.body.data).toHaveProperty('topReferrers');
      expect(response.body.data.totalClicks).toBeGreaterThanOrEqual(2);
    });

    it('should validate campaign link ID format', async () => {
      const response = await request(app)
        .get('/api/shortener/stats/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid campaign link ID format');
    });
  });

  describe('POST /api/shortener/batch-clicks', () => {
    it('should process batch clicks for performance testing', async () => {
      // Create a short URL for batch testing
      const batchTestResponse = await request(app)
        .post('/api/shortener/shorten')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId: testCampaign.id,
          landingPageUrl: 'https://example.com/batch-test',
          youtubeVideoId: 'dQw4w9WgXcQ'
        });
      
      const batchTestShortCode = batchTestResponse.body.data.shortCode;
      
      const clicks = Array.from({ length: 10 }, (_, i) => ({
        shortCode: batchTestShortCode,
        trackingData: {
          ipAddress: `192.168.1.${i + 1}`,
          userAgent: `Test Agent ${i}`,
          referrer: 'https://youtube.com'
        }
      }));

      const response = await request(app)
        .post('/api/shortener/batch-clicks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ clicks })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalClicks).toBe(10);
      expect(response.body.data.successfulClicks).toBe(10);
      expect(response.body.data.failedClicks).toBe(0);
      expect(response.body.data.processingTimeMs).toBeGreaterThan(0);
      expect(response.body.data.averageTimePerClick).toBeGreaterThan(0);
      expect(response.body.data.results).toHaveLength(10);
    });

    it('should handle batch processing errors', async () => {
      const clicks = [
        {
          shortCode: 'nonexistent',
          trackingData: { ipAddress: '192.168.1.1' }
        }
      ];

      const response = await request(app)
        .post('/api/shortener/batch-clicks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ clicks })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalClicks).toBe(1);
      expect(response.body.data.successfulClicks).toBe(0);
      expect(response.body.data.failedClicks).toBe(1);
      expect(response.body.data.results[0].success).toBe(false);
    });

    it('should limit batch size', async () => {
      const clicks = Array.from({ length: 1001 }, () => ({
        shortCode: 'dummy123', // Using dummy short code since this test should fail validation
        trackingData: {}
      }));

      const response = await request(app)
        .post('/api/shortener/batch-clicks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ clicks })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Maximum 1000 clicks allowed per batch');
    });

    it('should validate clicks array', async () => {
      const response = await request(app)
        .post('/api/shortener/batch-clicks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ clicks: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Clicks array is required and must not be empty');
    });
  });

  describe('DELETE /api/shortener/cleanup/:days', () => {
    it('should cleanup old click events', async () => {
      const response = await request(app)
        .delete('/api/shortener/cleanup/30')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('deletedEvents');
      expect(response.body.data.daysKept).toBe(30);
      expect(response.body.data.message).toContain('30 days');
    });

    it('should validate days parameter', async () => {
      const invalidDays = ['0', '366', 'abc', '-1'];

      for (const days of invalidDays) {
        const response = await request(app)
          .delete(`/api/shortener/cleanup/${days}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Days must be a number between 1 and 365');
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent click requests efficiently', async () => {
      // Create a dedicated short code for concurrent testing
      const concurrentTestResponse = await request(app)
        .post('/api/shortener/shorten')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId: testCampaign.id,
          landingPageUrl: 'https://example.com/concurrent-test',
          youtubeVideoId: 'dQw4w9WgXcQ'
        });
      
      const concurrentTestShortCode = concurrentTestResponse.body.data.shortCode;
      
      const concurrentRequests = 20; // Reduced for faster test execution
      const requests = Array.from({ length: concurrentRequests }, (_, i) => 
        () => request(app)
          .get(`/${concurrentTestShortCode}`)
          .set('User-Agent', `Concurrent Agent ${i}`)
      );

      const startTime = Date.now();
      const results = await TestHelpers.runConcurrentRequests(requests, 10);
      const duration = Date.now() - startTime;

      // All requests should succeed (302 redirects)
      expect(results.every(result => result.status === 302)).toBe(true);
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(10000); // 10 seconds for 20 requests
      
      // Average response time should be reasonable
      const avgResponseTime = duration / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(500); // 500ms average (more realistic for integration tests)
    });

    it('should handle high-volume short code generation', async () => {
      const volumeRequests = 20;
      const requests = Array.from({ length: volumeRequests }, (_, i) => 
        () => request(app)
          .post('/api/shortener/shorten')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            campaignId: testCampaign.id,
            landingPageUrl: `https://example.com/volume-test-${i}`,
            youtubeVideoId: 'dQw4w9WgXcQ'
          })
      );

      const { result: results, duration } = await TestHelpers.measureExecutionTime(
        () => TestHelpers.runConcurrentRequests(requests, 5)
      );

      // All requests should succeed
      expect(results.every(result => result.status === 201)).toBe(true);
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds for 20 requests
      
      // All short codes should be unique
      const shortCodes = results.map(result => result.body.data.shortCode);
      const uniqueShortCodes = new Set(shortCodes);
      expect(uniqueShortCodes.size).toBe(shortCodes.length);
    });

    it('should maintain database performance under load', async () => {
      // Create a dedicated short code for this performance test
      const perfTestResponse = await request(app)
        .post('/api/shortener/shorten')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId: testCampaign.id,
          landingPageUrl: 'https://example.com/perf-test',
          youtubeVideoId: 'dQw4w9WgXcQ'
        });
      
      const perfTestShortCode = perfTestResponse.body.data.shortCode;
      
      // Create multiple clicks for statistics testing
      const clickCount = 50; // Reduced for faster test execution
      const clicks = Array.from({ length: clickCount }, (_, i) => ({
        shortCode: perfTestShortCode,
        trackingData: {
          ipAddress: `10.0.0.${(i % 255) + 1}`,
          userAgent: `Load Test Agent ${i}`,
          referrer: 'https://youtube.com/performance-test'
        }
      }));

      // Batch process clicks
      const batchResponse = await request(app)
        .post('/api/shortener/batch-clicks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ clicks });

      expect(batchResponse.status).toBe(200);
      expect(batchResponse.body.data.successfulClicks).toBe(clickCount);
      
      // Verify processing time is reasonable
      expect(batchResponse.body.data.averageTimePerClick).toBeLessThan(50); // 50ms per click

      // Get the campaign link ID from the performance test response
      const perfTestCampaignLinkId = perfTestResponse.body.data.campaignLinkId;
      
      // Test statistics retrieval performance
      const { result: statsResponse, duration: statsDuration } = await TestHelpers.measureExecutionTime(
        () => request(app)
          .get(`/api/shortener/stats/${perfTestCampaignLinkId}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      expect(statsResponse.status).toBe(200);
      expect(statsDuration).toBeLessThan(1000); // 1 second for stats query
      expect(statsResponse.body.data.totalClicks).toBeGreaterThanOrEqual(clickCount);
    });
  });
});