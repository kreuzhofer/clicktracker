import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';

const testHelpers = new TestHelpers();
import { MockYouTubeService } from '../../src/services/MockYouTubeService';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the YouTube service to use MockYouTubeService
jest.mock('../../src/services/YouTubeService', () => {
  const mockService = new (require('../../src/services/MockYouTubeService').MockYouTubeService)();
  return {
    getYouTubeService: () => mockService,
    YouTubeService: require('../../src/services/MockYouTubeService').MockYouTubeService
  };
});

// Mock the cron service to prevent actual cron jobs
jest.mock('../../src/services/YouTubeCronService', () => {
  const mockCronService = {
    start: jest.fn(),
    stop: jest.fn(),
    triggerUpdate: jest.fn().mockResolvedValue({
      success: true,
      updatedCount: 3,
      errors: []
    }),
    updateSpecificVideos: jest.fn().mockResolvedValue({
      success: true,
      updatedCount: 2,
      errors: []
    }),
    cleanupStaleStats: jest.fn().mockResolvedValue({
      deletedCount: 5
    }),
    getStatus: jest.fn().mockReturnValue({
      enabled: true,
      running: false,
      schedule: '0 2 * * *'
    })
  };

  return {
    getYouTubeCronService: () => mockCronService,
    YouTubeCronService: jest.fn().mockImplementation(() => mockCronService)
  };
});

describe('YouTube API Routes', () => {
  let authToken: string;

  beforeAll(async () => {
    await testHelpers.setupTestDatabase();
    
    // Create test user and get auth token
    const testUser = await testHelpers.createTestUser();
    authToken = testUser.token;
  });

  afterAll(async () => {
    await testHelpers.cleanupTestDatabase();
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData();
  });

  describe('POST /api/youtube/validate', () => {
    it('should validate a valid YouTube URL', async () => {
      const response = await request(app)
        .post('/api/youtube/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        isValid: true,
        videoId: 'dQw4w9WgXcQ',
        extractedUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      });
    });

    it('should validate a YouTube short URL', async () => {
      const response = await request(app)
        .post('/api/youtube/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://youtu.be/dQw4w9WgXcQ'
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(true);
      expect(response.body.videoId).toBe('dQw4w9WgXcQ');
    });

    it('should reject invalid YouTube URL', async () => {
      const response = await request(app)
        .post('/api/youtube/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://www.google.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid YouTube URL');
      expect(response.body.message).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/youtube/validate')
        .send({
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        });

      expect(response.status).toBe(401);
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/youtube/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/youtube/metadata/:videoId', () => {
    it('should fetch metadata for a valid video ID', async () => {
      const response = await request(app)
        .get('/api/youtube/metadata/dQw4w9WgXcQ')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
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
      // Mock the service to simulate video not found
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateVideoNotFound: true });

      const response = await request(app)
        .get('/api/youtube/metadata/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Video not found');

      // Reset mock configuration
      mockService.updateConfig({ simulateVideoNotFound: false });
    });

    it('should handle quota exceeded error', async () => {
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateQuotaExceeded: true });

      const response = await request(app)
        .get('/api/youtube/metadata/dQw4w9WgXcQ')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('API quota exceeded');
      expect(response.body.retryAfter).toBe(86400);

      // Reset mock configuration
      mockService.updateConfig({ simulateQuotaExceeded: false });
    });

    it('should validate video ID format', async () => {
      const response = await request(app)
        .get('/api/youtube/metadata/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/youtube/metadata/dQw4w9WgXcQ');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/youtube/metadata/bulk', () => {
    it('should fetch metadata for multiple videos', async () => {
      const response = await request(app)
        .post('/api/youtube/metadata/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          videoIds: ['dQw4w9WgXcQ', 'jNQXAC9IVRw']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(response.body.requested).toBe(2);
    });

    it('should validate video IDs array', async () => {
      const response = await request(app)
        .post('/api/youtube/metadata/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          videoIds: []
        });

      expect(response.status).toBe(400);
    });

    it('should limit maximum video IDs', async () => {
      const videoIds = Array(51).fill('dQw4w9WgXcQ');
      
      const response = await request(app)
        .post('/api/youtube/metadata/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ videoIds });

      expect(response.status).toBe(400);
    });

    it('should validate video ID format in array', async () => {
      const response = await request(app)
        .post('/api/youtube/metadata/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          videoIds: ['dQw4w9WgXcQ', 'invalid-id']
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/youtube/views/:videoId', () => {
    it('should fetch view count for a video', async () => {
      const response = await request(app)
        .get('/api/youtube/views/dQw4w9WgXcQ')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.videoId).toBe('dQw4w9WgXcQ');
      expect(response.body.viewCount).toBeGreaterThan(0);
      expect(response.body.fetchedAt).toBeDefined();
    });

    it('should return 404 for non-existent video', async () => {
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateVideoNotFound: true });

      const response = await request(app)
        .get('/api/youtube/views/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Video not found');

      mockService.updateConfig({ simulateVideoNotFound: false });
    });
  });

  describe('POST /api/youtube/views/bulk', () => {
    it('should fetch view counts for multiple videos', async () => {
      const response = await request(app)
        .post('/api/youtube/views/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          videoIds: ['dQw4w9WgXcQ', 'jNQXAC9IVRw']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dQw4w9WgXcQ');
      expect(response.body.data).toHaveProperty('jNQXAC9IVRw');
      expect(response.body.count).toBe(2);
      expect(response.body.requested).toBe(2);
      expect(response.body.fetchedAt).toBeDefined();
    });
  });

  describe('POST /api/youtube/refresh-views', () => {
    it('should trigger manual view count refresh', async () => {
      const response = await request(app)
        .post('/api/youtube/refresh-views')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated successfully');
      expect(response.body.updatedCount).toBe(3);
      expect(response.body.errors).toEqual([]);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle update in progress error', async () => {
      const { getYouTubeCronService } = require('../../src/services/YouTubeCronService');
      const mockCronService = getYouTubeCronService();
      
      mockCronService.triggerUpdate.mockRejectedValueOnce(
        new Error('Update is already in progress')
      );

      const response = await request(app)
        .post('/api/youtube/refresh-views')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Update in progress');
    });
  });

  describe('POST /api/youtube/refresh-views/specific', () => {
    it('should trigger refresh for specific videos', async () => {
      const response = await request(app)
        .post('/api/youtube/refresh-views/specific')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          videoIds: ['dQw4w9WgXcQ', 'jNQXAC9IVRw']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.updatedCount).toBe(2);
      expect(response.body.videoIds).toEqual(['dQw4w9WgXcQ', 'jNQXAC9IVRw']);
    });

    it('should validate video IDs', async () => {
      const response = await request(app)
        .post('/api/youtube/refresh-views/specific')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          videoIds: []
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/youtube/stats', () => {
    it('should fetch all video statistics', async () => {
      const response = await request(app)
        .get('/api/youtube/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.count).toBeDefined();
    });
  });

  describe('GET /api/youtube/stats/:videoId', () => {
    it('should fetch statistics for a specific video', async () => {
      // First, we need to create some test data
      await testHelpers.createTestCampaign();
      const campaign = await testHelpers.getTestCampaign();
      
      await testHelpers.createTestCampaignLink(campaign.id, {
        youtube_video_id: 'dQw4w9WgXcQ'
      });

      const response = await request(app)
        .get('/api/youtube/stats/dQw4w9WgXcQ')
        .set('Authorization', `Bearer ${authToken}`);

      // This might return 404 if no stats exist yet, which is valid
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.video_id).toBe('dQw4w9WgXcQ');
      } else {
        expect(response.body.error).toBe('Stats not found');
      }
    });

    it('should return 404 for non-existent stats', async () => {
      const response = await request(app)
        .get('/api/youtube/stats/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Stats not found');
    });
  });

  describe('GET /api/youtube/cron/status', () => {
    it('should fetch cron job status', async () => {
      const response = await request(app)
        .get('/api/youtube/cron/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        enabled: expect.any(Boolean),
        running: expect.any(Boolean),
        schedule: expect.any(String)
      });
    });
  });

  describe('GET /api/youtube/health', () => {
    it('should perform health check', async () => {
      const response = await request(app)
        .get('/api/youtube/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.healthy).toBe(true);
      expect(response.body.quota).toMatchObject({
        requestCount: expect.any(Number),
        resetTime: expect.any(Number),
        limit: expect.any(Number)
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle health check failure', async () => {
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateNetworkError: true });

      const response = await request(app)
        .get('/api/youtube/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.healthy).toBe(false);

      mockService.updateConfig({ simulateNetworkError: false });
    });
  });

  describe('DELETE /api/youtube/cleanup', () => {
    it('should cleanup stale statistics', async () => {
      const response = await request(app)
        .delete('/api/youtube/cleanup')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cleaned up successfully');
      expect(response.body.deletedCount).toBe(5);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle cleanup errors', async () => {
      const { getYouTubeCronService } = require('../../src/services/YouTubeCronService');
      const mockCronService = getYouTubeCronService();
      
      mockCronService.cleanupStaleStats.mockRejectedValueOnce(
        new Error('Cleanup failed')
      );

      const response = await request(app)
        .delete('/api/youtube/cleanup')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('Authentication', () => {
    const protectedRoutes = [
      { method: 'post', path: '/api/youtube/validate' },
      { method: 'get', path: '/api/youtube/metadata/dQw4w9WgXcQ' },
      { method: 'post', path: '/api/youtube/metadata/bulk' },
      { method: 'get', path: '/api/youtube/views/dQw4w9WgXcQ' },
      { method: 'post', path: '/api/youtube/views/bulk' },
      { method: 'post', path: '/api/youtube/refresh-views' },
      { method: 'post', path: '/api/youtube/refresh-views/specific' },
      { method: 'get', path: '/api/youtube/stats' },
      { method: 'get', path: '/api/youtube/stats/dQw4w9WgXcQ' },
      { method: 'get', path: '/api/youtube/cron/status' },
      { method: 'get', path: '/api/youtube/health' },
      { method: 'delete', path: '/api/youtube/cleanup' }
    ];

    protectedRoutes.forEach(({ method, path }) => {
      it(`should require authentication for ${method.toUpperCase()} ${path}`, async () => {
        const response = await (request(app) as any)[method](path);
        expect(response.status).toBe(401);
      });
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/youtube/health')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/youtube/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/youtube/metadata/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(400);
    });

    it('should handle network errors gracefully', async () => {
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateNetworkError: true });

      const response = await request(app)
        .get('/api/youtube/metadata/dQw4w9WgXcQ')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');

      mockService.updateConfig({ simulateNetworkError: false });
    });
  });
});