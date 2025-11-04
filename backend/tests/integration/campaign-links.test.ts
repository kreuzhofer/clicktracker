import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';

// Mock the YouTube service to use MockYouTubeService
jest.mock('../../src/services/YouTubeService', () => {
  const mockService = new (require('../../src/services/MockYouTubeService').MockYouTubeService)();
  return {
    getYouTubeService: () => mockService,
    YouTubeService: require('../../src/services/MockYouTubeService').MockYouTubeService
  };
});

describe('Campaign Links API Integration Tests', () => {
  let authToken: string;
  let testCampaign: any;

  beforeEach(async () => {
    // Create and login test user
    await TestHelpers.createTestUser();
    authToken = await TestHelpers.loginTestUser();
    
    // Create test campaign for each test
    testCampaign = await TestHelpers.createTestCampaign({
      name: `Test Campaign ${Date.now()}`
    });
  });

  describe('POST /api/campaigns/:id/links', () => {
    it('should create a new campaign link with valid data', async () => {
      const linkData = {
        landing_page_url: 'https://example.com/landing',
        youtube_video_id: 'dQw4w9WgXcQ'
      };

      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/links`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(linkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      TestHelpers.expectValidCampaignLink(response.body.data);
      expect(response.body.data.campaign_id).toBe(testCampaign.id);
      expect(response.body.data.landing_page_url).toBe(linkData.landing_page_url);
      expect(response.body.data.youtube_video_id).toBe(linkData.youtube_video_id);
      expect(response.body.data.youtube_video_title).toBeDefined();
      expect(response.body.data.youtube_thumbnail_url).toBeDefined();
    });

    it('should create campaign link with custom alias', async () => {
      const linkData = {
        landing_page_url: 'https://example.com/landing',
        youtube_video_id: 'dQw4w9WgXcQ',
        custom_alias: 'my-custom'
      };

      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/links`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(linkData)
        .expect(201);

      expect(response.body.data.custom_alias).toBe(linkData.custom_alias);
      expect(response.body.data.short_code).toBe(linkData.custom_alias);
    });

    it('should reject duplicate custom alias', async () => {
      const linkData = {
        landing_page_url: 'https://example.com/landing',
        youtube_video_id: 'dQw4w9WgXcQ',
        custom_alias: 'duplicate'
      };

      // Create first link
      await request(app)
        .post(`/api/campaigns/${testCampaign.id}/links`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(linkData)
        .expect(201);

      // Try to create second link with same alias
      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/links`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(linkData)
        .expect(409);

      TestHelpers.expectConflictError(response, 'Custom alias is already taken');
    });

    it('should return 404 for non-existent campaign', async () => {
      const linkData = {
        landing_page_url: 'https://example.com/landing',
        youtube_video_id: 'dQw4w9WgXcQ'
      };

      const response = await request(app)
        .post('/api/campaigns/00000000-0000-0000-0000-000000000000/links')
        .set('Authorization', `Bearer ${authToken}`)
        .send(linkData)
        .expect(404);

      TestHelpers.expectNotFoundError(response, 'Campaign');
    });

    it('should validate YouTube video exists', async () => {
      // Mock service to simulate video not found
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateVideoNotFound: true });

      const linkData = {
        landing_page_url: 'https://example.com/landing',
        youtube_video_id: 'nonexistent'
      };

      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/links`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(linkData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('YouTube video not found');

      // Reset mock
      mockService.updateConfig({ simulateVideoNotFound: false });
    });

    it('should handle YouTube API quota exceeded gracefully', async () => {
      // Mock service to simulate quota exceeded
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateQuotaExceeded: true });

      const linkData = {
        landing_page_url: 'https://example.com/landing',
        youtube_video_id: 'dQw4w9WgXcQ'
      };

      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/links`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(linkData)
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('RATE_LIMITED');
      expect(response.body.details.retryAfter).toBe(86400);

      // Reset mock
      mockService.updateConfig({ simulateQuotaExceeded: false });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/links`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should validate landing page URL format', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert("xss")',
        ''
      ];

      for (const url of invalidUrls) {
        await request(app)
          .post(`/api/campaigns/${testCampaign.id}/links`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            landing_page_url: url,
            youtube_video_id: 'dQw4w9WgXcQ'
          })
          .expect(400);
      }
    });

    it('should validate YouTube video ID format', async () => {
      const invalidVideoIds = [
        'too-short',
        'too-long-video-id-123456789',
        'invalid@chars!',
        ''
      ];

      for (const videoId of invalidVideoIds) {
        await request(app)
          .post(`/api/campaigns/${testCampaign.id}/links`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            landing_page_url: 'https://example.com/landing',
            youtube_video_id: videoId
          })
          .expect(400);
      }
    });

    it('should validate custom alias format', async () => {
      const invalidAliases = [
        'ab', // too short
        'a'.repeat(11), // too long (max 10 chars)
        'invalid@alias!', // invalid characters
        'alias with spaces'
      ];

      for (const alias of invalidAliases) {
        await request(app)
          .post(`/api/campaigns/${testCampaign.id}/links`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            landing_page_url: 'https://example.com/landing',
            youtube_video_id: 'dQw4w9WgXcQ',
            custom_alias: alias
          })
          .expect(400);
      }
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/campaigns/${testCampaign.id}/links`)
        .send({
          landing_page_url: 'https://example.com/landing',
          youtube_video_id: 'dQw4w9WgXcQ'
        })
        .expect(401);
    });
  });

  describe('GET /api/campaigns/:id/links', () => {
    it('should return list of campaign links', async () => {
      // Create test links
      await TestHelpers.createTestCampaignLink(testCampaign.id, {
        landing_page_url: 'https://example.com/landing1'
      });
      await TestHelpers.createTestCampaignLink(testCampaign.id, {
        landing_page_url: 'https://example.com/landing2'
      });

      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.id}/links`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
      response.body.data.forEach((link: any) => {
        TestHelpers.expectValidCampaignLink(link);
        expect(link.campaign_id).toBe(testCampaign.id);
      });
    });

    it('should return empty array for campaign with no links', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.id}/links`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .get('/api/campaigns/00000000-0000-0000-0000-000000000000/links')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      TestHelpers.expectNotFoundError(response, 'Campaign');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/campaigns/${testCampaign.id}/links`)
        .expect(401);
    });
  });

  describe('GET /api/campaigns/:id/links/:linkId', () => {
    it('should return single campaign link', async () => {
      const link = await TestHelpers.createTestCampaignLink(testCampaign.id);

      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.id}/links/${link.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      TestHelpers.expectValidCampaignLink(response.body.data);
      expect(response.body.data.id).toBe(link.id);
      expect(response.body.data.campaign_id).toBe(testCampaign.id);
    });

    it('should return 404 for non-existent link', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.id}/links/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      TestHelpers.expectNotFoundError(response, 'Campaign link');
    });

    it('should return 404 for link from different campaign', async () => {
      const otherCampaign = await TestHelpers.createTestCampaign({
        name: `Other Campaign ${Date.now()}`
      });
      const link = await TestHelpers.createTestCampaignLink(otherCampaign.id);

      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.id}/links/${link.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      TestHelpers.expectNotFoundError(response, 'Campaign link');
    });

    it('should require authentication', async () => {
      const link = await TestHelpers.createTestCampaignLink(testCampaign.id);

      await request(app)
        .get(`/api/campaigns/${testCampaign.id}/links/${link.id}`)
        .expect(401);
    });
  });

  describe('PUT /api/campaigns/:id/links/:linkId', () => {
    it('should update campaign link with valid data', async () => {
      const link = await TestHelpers.createTestCampaignLink(testCampaign.id);
      const updateData = {
        landing_page_url: 'https://example.com/updated-landing',
        custom_alias: 'updated'
      };

      const response = await request(app)
        .put(`/api/campaigns/${testCampaign.id}/links/${link.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      TestHelpers.expectValidCampaignLink(response.body.data);
      expect(response.body.data.landing_page_url).toBe(updateData.landing_page_url);
      expect(response.body.data.custom_alias).toBe(updateData.custom_alias);
      expect(new Date(response.body.data.updated_at).getTime()).toBeGreaterThan(
        new Date(link.updated_at).getTime()
      );
    });

    it('should support partial updates', async () => {
      const link = await TestHelpers.createTestCampaignLink(testCampaign.id, {
        landing_page_url: 'https://example.com/original'
      });

      const response = await request(app)
        .put(`/api/campaigns/${testCampaign.id}/links/${link.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ landing_page_url: 'https://example.com/updated' })
        .expect(200);

      expect(response.body.data.landing_page_url).toBe('https://example.com/updated');
      expect(response.body.data.youtube_video_id).toBe(link.youtube_video_id); // Unchanged
    });

    it('should update YouTube metadata when video ID changes', async () => {
      const link = await TestHelpers.createTestCampaignLink(testCampaign.id);

      const response = await request(app)
        .put(`/api/campaigns/${testCampaign.id}/links/${link.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ youtube_video_id: 'jNQXAC9IVRw' })
        .expect(200);

      expect(response.body.data.youtube_video_id).toBe('jNQXAC9IVRw');
      expect(response.body.data.youtube_video_title).toBeDefined();
      expect(response.body.data.youtube_thumbnail_url).toBeDefined();
    });

    it('should reject duplicate custom alias', async () => {
      const link1 = await TestHelpers.createTestCampaignLink(testCampaign.id, {
        custom_alias: 'existing'
      });
      const link2 = await TestHelpers.createTestCampaignLink(testCampaign.id);

      const response = await request(app)
        .put(`/api/campaigns/${testCampaign.id}/links/${link2.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ custom_alias: 'existing' })
        .expect(409);

      TestHelpers.expectConflictError(response, 'Custom alias is already taken');
    });

    it('should return 404 for non-existent link', async () => {
      const response = await request(app)
        .put(`/api/campaigns/${testCampaign.id}/links/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ landing_page_url: 'https://example.com/updated' })
        .expect(404);

      TestHelpers.expectNotFoundError(response, 'Campaign link');
    });

    it('should validate YouTube video when updating video ID', async () => {
      const link = await TestHelpers.createTestCampaignLink(testCampaign.id);

      // Mock service to simulate video not found
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateVideoNotFound: true });

      const response = await request(app)
        .put(`/api/campaigns/${testCampaign.id}/links/${link.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ youtube_video_id: 'nonexistent' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('YouTube video not found');

      // Reset mock
      mockService.updateConfig({ simulateVideoNotFound: false });
    });

    it('should require authentication', async () => {
      const link = await TestHelpers.createTestCampaignLink(testCampaign.id);

      await request(app)
        .put(`/api/campaigns/${testCampaign.id}/links/${link.id}`)
        .send({ landing_page_url: 'https://example.com/updated' })
        .expect(401);
    });
  });

  describe('DELETE /api/campaigns/:id/links/:linkId', () => {
    it('should delete existing campaign link', async () => {
      const link = await TestHelpers.createTestCampaignLink(testCampaign.id);

      await request(app)
        .delete(`/api/campaigns/${testCampaign.id}/links/${link.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify link is deleted
      await request(app)
        .get(`/api/campaigns/${testCampaign.id}/links/${link.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent link', async () => {
      const response = await request(app)
        .delete(`/api/campaigns/${testCampaign.id}/links/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      TestHelpers.expectNotFoundError(response, 'Campaign link');
    });

    it('should return 404 for link from different campaign', async () => {
      const otherCampaign = await TestHelpers.createTestCampaign({
        name: `Other Campaign ${Date.now()}`
      });
      const link = await TestHelpers.createTestCampaignLink(otherCampaign.id);

      const response = await request(app)
        .delete(`/api/campaigns/${testCampaign.id}/links/${link.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      TestHelpers.expectNotFoundError(response, 'Campaign link');
    });

    it('should require authentication', async () => {
      const link = await TestHelpers.createTestCampaignLink(testCampaign.id);

      await request(app)
        .delete(`/api/campaigns/${testCampaign.id}/links/${link.id}`)
        .expect(401);
    });
  });

  describe('POST /api/campaigns/youtube/validate', () => {
    it('should validate valid YouTube URL', async () => {
      const response = await request(app)
        .post('/api/campaigns/youtube/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.videoId).toBe('dQw4w9WgXcQ');
    });

    it('should validate YouTube short URL', async () => {
      const response = await request(app)
        .post('/api/campaigns/youtube/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: 'https://youtu.be/dQw4w9WgXcQ' })
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.videoId).toBe('dQw4w9WgXcQ');
    });

    it('should reject invalid YouTube URL', async () => {
      const response = await request(app)
        .post('/api/campaigns/youtube/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: 'https://www.google.com' })
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/campaigns/youtube/validate')
        .send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
        .expect(401);
    });
  });

  describe('GET /api/campaigns/youtube/metadata/:videoId', () => {
    it('should fetch YouTube video metadata', async () => {
      const response = await request(app)
        .get('/api/campaigns/youtube/metadata/dQw4w9WgXcQ')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        video_id: 'dQw4w9WgXcQ',
        title: expect.any(String),
        thumbnail_url: expect.any(String),
        view_count: expect.any(Number),
        channel_title: expect.any(String),
        published_at: expect.any(String)
      });
    });

    it('should return 404 for non-existent video', async () => {
      // Mock service to simulate video not found
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateVideoNotFound: true });

      const response = await request(app)
        .get('/api/campaigns/youtube/metadata/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      TestHelpers.expectNotFoundError(response, 'YouTube video nonexistent');

      // Reset mock
      mockService.updateConfig({ simulateVideoNotFound: false });
    });

    it('should validate video ID format', async () => {
      await request(app)
        .get('/api/campaigns/youtube/metadata/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/campaigns/youtube/metadata/dQw4w9WgXcQ')
        .expect(401);
    });
  });

  describe('Data Consistency Tests', () => {
    it('should maintain foreign key constraints', async () => {
      const link = await TestHelpers.createTestCampaignLink(testCampaign.id);
      
      // Delete campaign should cascade delete links
      await TestHelpers.campaignModel.delete(testCampaign.id);
      
      // Link should no longer exist
      const deletedLink = await TestHelpers.campaignLinkModel.findById(link.id);
      expect(deletedLink).toBeNull();
    });

    it('should handle concurrent link creation', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        () => request(app)
          .post(`/api/campaigns/${testCampaign.id}/links`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            landing_page_url: `https://example.com/landing${i}`,
            youtube_video_id: 'dQw4w9WgXcQ'
          })
      );

      const results = await TestHelpers.runConcurrentRequests(requests, 3);
      
      // All requests should succeed
      results.forEach(result => {
        expect(result.status).toBe(201);
      });

      // Verify all links were created
      const links = await TestHelpers.campaignLinkModel.findByCampaignId(testCampaign.id);
      expect(links.length).toBe(5);
    });

    it('should handle concurrent updates to same link', async () => {
      const link = await TestHelpers.createTestCampaignLink(testCampaign.id);

      const requests = Array.from({ length: 3 }, (_, i) => 
        () => request(app)
          .put(`/api/campaigns/${testCampaign.id}/links/${link.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ landing_page_url: `https://example.com/updated${i}` })
      );

      const results = await TestHelpers.runConcurrentRequests(requests, 2);
      
      // All requests should succeed (last one wins)
      results.forEach(result => {
        expect(result.status).toBe(200);
      });
    });

    it('should prevent duplicate short codes', async () => {
      // This test ensures the unique constraint on short_code works
      const requests = Array.from({ length: 3 }, () => 
        () => request(app)
          .post(`/api/campaigns/${testCampaign.id}/links`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            landing_page_url: 'https://example.com/landing',
            youtube_video_id: 'dQw4w9WgXcQ',
            custom_alias: 'same-alias'
          })
      );

      const results = await Promise.allSettled(requests.map(req => req()));
      
      // Only one should succeed, others should fail with conflict
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 201);
      const conflicts = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 409);
      
      expect(successful.length).toBe(1);
      expect(conflicts.length).toBe(2);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle malformed JSON', async () => {
      await request(app)
        .post(`/api/campaigns/${testCampaign.id}/links`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);
      
      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/links`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          landing_page_url: longUrl,
          youtube_video_id: 'dQw4w9WgXcQ'
        });

      // Should either succeed or fail with validation error
      expect([201, 400]).toContain(response.status);
    });

    it('should handle special characters in custom alias', async () => {
      const specialAliases = [
        'test-alias',
        'test_alias',
        'TestAlias1',
        'alias123'
      ];

      for (const alias of specialAliases) {
        const response = await request(app)
          .post(`/api/campaigns/${testCampaign.id}/links`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            landing_page_url: 'https://example.com/landing',
            youtube_video_id: 'dQw4w9WgXcQ',
            custom_alias: alias
          });

        expect(response.status).toBe(201);
        expect(response.body.data.custom_alias).toBe(alias);
      }
    });

    it('should handle YouTube API network errors gracefully', async () => {
      // Mock service to simulate network error
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateNetworkError: true });

      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/links`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          landing_page_url: 'https://example.com/landing',
          youtube_video_id: 'dQw4w9WgXcQ'
        })
        .expect(201);

      // Should create link without metadata
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('YouTube metadata unavailable');

      // Reset mock
      mockService.updateConfig({ simulateNetworkError: false });
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk link creation efficiently', async () => {
      const requests = Array.from({ length: 20 }, (_, i) => 
        () => request(app)
          .post(`/api/campaigns/${testCampaign.id}/links`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            landing_page_url: `https://example.com/landing${i}`,
            youtube_video_id: 'dQw4w9WgXcQ'
          })
      );

      const { duration } = await TestHelpers.measureExecutionTime(async () => {
        await TestHelpers.runConcurrentRequests(requests, 5);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    it('should handle link listing performance with many links', async () => {
      // Create many links
      const createRequests = Array.from({ length: 30 }, (_, i) => 
        () => TestHelpers.createTestCampaignLink(testCampaign.id, {
          landing_page_url: `https://example.com/landing${i}`
        })
      );

      await TestHelpers.runConcurrentRequests(createRequests, 5);

      const { duration } = await TestHelpers.measureExecutionTime(async () => {
        const response = await request(app)
          .get(`/api/campaigns/${testCampaign.id}/links`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        expect(response.body.data.length).toBe(30);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(3000); // 3 seconds
    });
  });
});