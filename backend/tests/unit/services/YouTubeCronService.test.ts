import { YouTubeCronService } from '../../../src/services/YouTubeCronService';
import { MockYouTubeService } from '../../../src/services/MockYouTubeService';
import { YouTubeVideoStatsModel } from '../../../src/models/YouTubeVideoStats';

// Mock the dependencies
jest.mock('../../../src/services/YouTubeService', () => ({
  getYouTubeService: jest.fn()
}));

jest.mock('../../../src/models/YouTubeVideoStats');
jest.mock('../../../src/models/CampaignLink');

describe('YouTubeCronService', () => {
  let cronService: YouTubeCronService;
  let mockYouTubeService: MockYouTubeService;
  let mockVideoStatsModel: jest.Mocked<YouTubeVideoStatsModel>;

  beforeEach(() => {
    // Create mock YouTube service
    mockYouTubeService = new MockYouTubeService();
    
    // Mock the getYouTubeService function
    const { getYouTubeService } = require('../../../src/services/YouTubeService');
    getYouTubeService.mockReturnValue(mockYouTubeService);

    // Create mock video stats model
    mockVideoStatsModel = new YouTubeVideoStatsModel() as jest.Mocked<YouTubeVideoStatsModel>;
    
    // Mock the constructor to return our mock
    (YouTubeVideoStatsModel as jest.Mock).mockImplementation(() => mockVideoStatsModel);

    // Create cron service with test configuration
    cronService = new YouTubeCronService({
      enabled: false, // Disable actual cron scheduling in tests
      schedule: '0 2 * * *',
      maxVideosPerBatch: 2,
      batchDelay: 10
    });
  });

  afterEach(() => {
    cronService.stop();
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with correct configuration', () => {
      const config = {
        enabled: true,
        schedule: '0 3 * * *',
        timezone: 'America/New_York',
        maxVideosPerBatch: 25,
        batchDelay: 500
      };

      const service = new YouTubeCronService(config);
      const status = service.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.schedule).toBe('0 3 * * *');
    });

    it('should use default configuration values', () => {
      const service = new YouTubeCronService({
        enabled: false,
        schedule: '0 2 * * *'
      });

      const status = service.getStatus();
      expect(status.schedule).toBe('0 2 * * *');
    });

    it('should update configuration', () => {
      cronService.updateConfig({
        enabled: true,
        schedule: '0 4 * * *',
        maxVideosPerBatch: 100
      });

      const status = cronService.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.schedule).toBe('0 4 * * *');
    });
  });

  describe('Status Management', () => {
    it('should return correct status when not running', () => {
      const status = cronService.getStatus();

      expect(status.enabled).toBe(false);
      expect(status.running).toBe(false);
      expect(status.schedule).toBe('0 2 * * *');
    });

    it('should start and stop cron service', () => {
      cronService.updateConfig({ enabled: true });
      cronService.start();

      let status = cronService.getStatus();
      expect(status.enabled).toBe(true);

      cronService.stop();
      status = cronService.getStatus();
      expect(status.enabled).toBe(true); // Config remains enabled, but cron is stopped
    });

    it('should not start if already running', () => {
      cronService.updateConfig({ enabled: true });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      cronService.start();
      cronService.start(); // Second call should be ignored

      expect(consoleSpy).toHaveBeenCalledWith('YouTube cron service is already running');
      
      consoleSpy.mockRestore();
    });

    it('should not start if disabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      cronService.start(); // Service is disabled by default

      expect(consoleSpy).toHaveBeenCalledWith('YouTube cron service is disabled');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Manual Updates', () => {
    beforeEach(() => {
      // Setup mock data
      mockVideoStatsModel.findActiveVideoIds.mockResolvedValue(['video1', 'video2', 'video3']);
      mockVideoStatsModel.upsert.mockResolvedValue({
        video_id: 'test',
        view_count: 1000,
        last_updated: new Date()
      });

      // Setup mock YouTube service responses
      mockYouTubeService.addMockVideo('video1', { view_count: 1000 });
      mockYouTubeService.addMockVideo('video2', { view_count: 2000 });
      mockYouTubeService.addMockVideo('video3', { view_count: 3000 });
    });

    it('should trigger manual update successfully', async () => {
      const result = await cronService.triggerUpdate();

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
      expect(result.errors).toHaveLength(0);
      expect(mockVideoStatsModel.findActiveVideoIds).toHaveBeenCalled();
      expect(mockVideoStatsModel.upsert).toHaveBeenCalledTimes(3);
    });

    it('should handle empty video list', async () => {
      mockVideoStatsModel.findActiveVideoIds.mockResolvedValue([]);

      const result = await cronService.triggerUpdate();

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should process videos in batches', async () => {
      const videoIds = ['video1', 'video2', 'video3', 'video4', 'video5'];
      mockVideoStatsModel.findActiveVideoIds.mockResolvedValue(videoIds);

      // Add mock videos
      videoIds.forEach((id, index) => {
        mockYouTubeService.addMockVideo(id, { view_count: (index + 1) * 1000 });
      });

      const result = await cronService.triggerUpdate();

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(5);
      
      // Should have made 3 API calls (batches of 2, 2, 1)
      const quotaInfo = mockYouTubeService.getQuotaInfo();
      expect(quotaInfo.requestCount).toBe(3);
    });

    it('should handle API errors gracefully', async () => {
      mockVideoStatsModel.findActiveVideoIds.mockResolvedValue(['video1', 'video2']);
      mockYouTubeService.updateConfig({ simulateNetworkError: true });

      const result = await cronService.triggerUpdate();

      expect(result.success).toBe(false);
      expect(result.updatedCount).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle database errors gracefully', async () => {
      mockVideoStatsModel.findActiveVideoIds.mockResolvedValue(['video1']);
      mockVideoStatsModel.upsert.mockRejectedValue(new Error('Database error'));

      const result = await cronService.triggerUpdate();

      expect(result.success).toBe(false);
      expect(result.updatedCount).toBe(0);
      expect(result.errors).toContain('Failed to update video1: Database error');
    });

    it('should prevent concurrent updates', async () => {
      mockVideoStatsModel.findActiveVideoIds.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(['video1']), 100))
      );

      const promise1 = cronService.triggerUpdate();
      
      await expect(cronService.triggerUpdate()).rejects.toThrow('Update is already in progress');
      
      await promise1; // Wait for first update to complete
    });
  });

  describe('Specific Video Updates', () => {
    beforeEach(() => {
      mockVideoStatsModel.upsert.mockResolvedValue({
        video_id: 'test',
        view_count: 1000,
        last_updated: new Date()
      });
    });

    it('should update specific videos successfully', async () => {
      const videoIds = ['video1', 'video2'];
      
      videoIds.forEach((id, index) => {
        mockYouTubeService.addMockVideo(id, { view_count: (index + 1) * 1000 });
      });

      const result = await cronService.updateSpecificVideos(videoIds);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockVideoStatsModel.upsert).toHaveBeenCalledTimes(2);
    });

    it('should handle empty video list', async () => {
      const result = await cronService.updateSpecificVideos([]);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle API errors for specific videos', async () => {
      mockYouTubeService.updateConfig({ simulateNetworkError: true });

      const result = await cronService.updateSpecificVideos(['video1']);

      expect(result.success).toBe(false);
      expect(result.updatedCount).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should prevent concurrent specific updates', async () => {
      // Mock a slow response
      jest.spyOn(mockYouTubeService, 'getBulkVideoViewCounts').mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ video1: 1000 }), 100))
      );

      const promise1 = cronService.updateSpecificVideos(['video1']);
      
      await expect(cronService.updateSpecificVideos(['video2'])).rejects.toThrow('Update is already in progress');
      
      await promise1;
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup stale stats successfully', async () => {
      mockVideoStatsModel.deleteUnusedStats.mockResolvedValue(5);

      const result = await cronService.cleanupStaleStats();

      expect(result.deletedCount).toBe(5);
      expect(mockVideoStatsModel.deleteUnusedStats).toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      mockVideoStatsModel.deleteUnusedStats.mockRejectedValue(new Error('Cleanup failed'));

      await expect(cronService.cleanupStaleStats()).rejects.toThrow('Cleanup failed');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle quota exceeded errors', async () => {
      mockVideoStatsModel.findActiveVideoIds.mockResolvedValue(['video1']);
      mockYouTubeService.updateConfig({ simulateQuotaExceeded: true });

      const result = await cronService.triggerUpdate();

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('quota exceeded'))).toBe(true);
    });

    it('should continue processing other batches when one fails', async () => {
      const videoIds = ['video1', 'video2', 'video3', 'video4'];
      mockVideoStatsModel.findActiveVideoIds.mockResolvedValue(videoIds);

      // Mock the service to fail on first batch but succeed on second
      let callCount = 0;
      jest.spyOn(mockYouTubeService, 'getBulkVideoViewCounts').mockImplementation((ids) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First batch failed');
        }
        return Promise.resolve(
          ids.reduce((acc, id) => ({ ...acc, [id]: 1000 }), {})
        );
      });

      const result = await cronService.triggerUpdate();

      expect(result.updatedCount).toBe(2); // Second batch should succeed
      expect(result.errors.length).toBeGreaterThan(0); // First batch should have errors
    });

    it('should handle critical errors in update process', async () => {
      mockVideoStatsModel.findActiveVideoIds.mockRejectedValue(new Error('Critical database error'));

      const result = await cronService.triggerUpdate();

      expect(result.success).toBe(false);
      expect(result.updatedCount).toBe(0);
      expect(result.errors).toContain('Critical error in view count update: Critical database error');
    });
  });

  describe('Batch Processing', () => {
    it('should respect batch size configuration', async () => {
      const videoIds = ['video1', 'video2', 'video3', 'video4', 'video5'];
      mockVideoStatsModel.findActiveVideoIds.mockResolvedValue(videoIds);

      // Create service with batch size of 2
      const batchService = new YouTubeCronService({
        enabled: false,
        schedule: '0 2 * * *',
        maxVideosPerBatch: 2
      });

      videoIds.forEach((id, index) => {
        mockYouTubeService.addMockVideo(id, { view_count: (index + 1) * 1000 });
      });

      const result = await batchService.triggerUpdate();

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(5);
      
      // Should have made 3 API calls (2+2+1)
      const quotaInfo = mockYouTubeService.getQuotaInfo();
      expect(quotaInfo.requestCount).toBe(3);
    });

    it('should add delays between batches', async () => {
      const videoIds = ['video1', 'video2', 'video3'];
      mockVideoStatsModel.findActiveVideoIds.mockResolvedValue(videoIds);

      const batchService = new YouTubeCronService({
        enabled: false,
        schedule: '0 2 * * *',
        maxVideosPerBatch: 1,
        batchDelay: 50
      });

      videoIds.forEach((id, index) => {
        mockYouTubeService.addMockVideo(id, { view_count: (index + 1) * 1000 });
      });

      const startTime = Date.now();
      const result = await batchService.triggerUpdate();
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
      
      // Should have taken at least 100ms (2 delays of 50ms each)
      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });
});