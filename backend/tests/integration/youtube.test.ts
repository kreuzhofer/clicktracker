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

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Create fresh test user and get auth token for each test
    await TestHelpers.createTestUser();
    authToken = await TestHelpers.loginTestUser();
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
        success: true,
        data: {
          isValid: true,
          videoId: 'dQw4w9WgXcQ',
          extractedUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        },
        message: 'YouTube URL validated successfully'
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
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.videoId).toBe('dQw4w9WgXcQ');
    });

    it('should reject invalid YouTube URL', async () => {
      const response = await request(app)
        .post('/api/youtube/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://www.google.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      expect(response.body.details[0].message).toBe('Invalid YouTube URL format');
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
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('NOT_FOUND');
      expect(response.body.message).toBe('YouTube video nonexistent not found');

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
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('RATE_LIMITED');
      expect(response.body.message).toBe('YouTube API quota has been exceeded. Please try again later.');
      expect(response.body.details.retryAfter).toBe(86400);

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
      // Reset mock configuration to ensure clean state
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateQuotaExceeded: false, simulateVideoNotFound: false, simulateNetworkError: false });

      const response = await request(app)
        .post('/api/youtube/metadata/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          videoIds: ['dQw4w9WgXcQ', 'jNQXAC9IVRw']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.count).toBe(2);
      expect(response.body.meta.requested).toBe(2);
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
      // Reset mock configuration to ensure clean state
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateQuotaExceeded: false, simulateVideoNotFound: false, simulateNetworkError: false });

      const response = await request(app)
        .get('/api/youtube/views/dQw4w9WgXcQ')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.videoId).toBe('dQw4w9WgXcQ');
      expect(response.body.data.viewCount).toBeGreaterThan(0);
      expect(response.body.data.fetchedAt).toBeDefined();
    });

    it('should return 404 for non-existent video', async () => {
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateVideoNotFound: true, simulateQuotaExceeded: false });

      const response = await request(app)
        .get('/api/youtube/views/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('NOT_FOUND');
      expect(response.body.message).toBe('YouTube video nonexistent not found');

      mockService.updateConfig({ simulateVideoNotFound: false });
    });
  });

  describe('POST /api/youtube/views/bulk', () => {
    it('should fetch view counts for multiple videos', async () => {
      // Reset mock configuration to ensure clean state
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateQuotaExceeded: false, simulateVideoNotFound: false, simulateNetworkError: false });

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
      expect(response.body.meta.count).toBe(2);
      expect(response.body.meta.requested).toBe(2);
      expect(response.body.meta.fetchedAt).toBeDefined();
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
      expect(response.body.data.updatedCount).toBe(3);
      expect(response.body.data.errors).toEqual([]);
      expect(response.body.data.timestamp).toBeDefined();
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
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('CONFLICT');
      expect(response.body.message).toBe('A view count update is already in progress. Please wait for it to complete.');
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
      expect(response.body.data.updatedCount).toBe(2);
      expect(response.body.data.videoIds).toEqual(['dQw4w9WgXcQ', 'jNQXAC9IVRw']);
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
      expect(response.body.meta.count).toBeDefined();
    });
  });

  describe('GET /api/youtube/stats/:videoId', () => {
    it('should fetch statistics for a specific video', async () => {
      // First, we need to create some test data
      const campaign = await TestHelpers.createTestCampaign();
      
      await TestHelpers.createTestCampaignLink(campaign.id, {
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
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('NOT_FOUND');
        expect(response.body.message).toBe('Statistics for video dQw4w9WgXcQ not found');
      }
    });

    it('should return 404 for non-existent stats', async () => {
      const response = await request(app)
        .get('/api/youtube/stats/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('NOT_FOUND');
      expect(response.body.message).toBe('Statistics for video nonexistent not found');
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
      // Reset mock configuration to ensure clean state
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateQuotaExceeded: false, simulateVideoNotFound: false, simulateNetworkError: false });

      const response = await request(app)
        .get('/api/youtube/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.healthy).toBe(true);
      expect(response.body.data.quota).toMatchObject({
        requestCount: expect.any(Number),
        resetTime: expect.any(Number),
        limit: expect.any(Number)
      });
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should handle health check failure', async () => {
      const { getYouTubeService } = require('../../src/services/YouTubeService');
      const mockService = getYouTubeService();
      mockService.updateConfig({ simulateNetworkError: true });

      const response = await request(app)
        .get('/api/youtube/health')
        .set('Authorization', `Bearer ${authToken}`);

      // The health check might still return 200 but with healthy: false
      expect([200, 500]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(response.body.data.healthy).toBe(false);

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
      expect(response.body.data.deletedCount).toBe(5);
      expect(response.body.data.timestamp).toBeDefined();
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
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INTERNAL_ERROR');
      expect(response.body.message).toBe('Failed to clean up stale statistics');
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
      mockService.updateConfig({ simulateNetworkError: true, simulateQuotaExceeded: false });

      const response = await request(app)
        .get('/api/youtube/metadata/dQw4w9WgXcQ')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INTERNAL_ERROR');
      expect(response.body.message).toBe('Failed to fetch video metadata');

      mockService.updateConfig({ simulateNetworkError: false });
    });
  });
});