import { YouTubeVideoMetadata } from '../types';
import { YouTubeUrlValidationResult, YouTubeQuotaError } from './YouTubeService';

export interface MockYouTubeServiceConfig {
  simulateQuotaExceeded?: boolean;
  simulateNetworkError?: boolean;
  simulateVideoNotFound?: boolean;
  responseDelay?: number;
}

/**
 * Mock YouTube service for testing without using actual API quota
 */
export class MockYouTubeService {
  private config: MockYouTubeServiceConfig;
  private requestCount: number = 0;
  private mockVideoDatabase: Record<string, YouTubeVideoMetadata> = {};

  constructor(config: MockYouTubeServiceConfig = {}) {
    this.config = config;
    this.initializeMockDatabase();
  }

  /**
   * Initialize mock video database with test data
   */
  private initializeMockDatabase(): void {
    this.mockVideoDatabase = {
      'dQw4w9WgXcQ': {
        video_id: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
        thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        view_count: 1234567890,
        channel_title: 'Rick Astley',
        published_at: new Date('2009-10-25T06:57:33Z')
      },
      'jNQXAC9IVRw': {
        video_id: 'jNQXAC9IVRw',
        title: 'Me at the zoo',
        thumbnail_url: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
        view_count: 987654321,
        channel_title: 'jawed',
        published_at: new Date('2005-04-23T19:31:24Z')
      },
      'test123456': {
        video_id: 'test123456',
        title: 'Test Video for Campaign Tracking',
        thumbnail_url: 'https://i.ytimg.com/vi/test123456/hqdefault.jpg',
        view_count: 12345,
        channel_title: 'Test Channel',
        published_at: new Date('2023-01-01T00:00:00Z')
      },
      'sample12345': {
        video_id: 'sample12345',
        title: 'Sample Marketing Video',
        thumbnail_url: 'https://i.ytimg.com/vi/sample12345/hqdefault.jpg',
        view_count: 54321,
        channel_title: 'Marketing Channel',
        published_at: new Date('2023-06-15T12:30:00Z')
      },
      'demo1234567': {
        video_id: 'demo1234567',
        title: 'Demo Product Launch Video',
        thumbnail_url: 'https://i.ytimg.com/vi/demo1234567/hqdefault.jpg',
        view_count: 98765,
        channel_title: 'Product Demo Channel',
        published_at: new Date('2023-09-01T09:15:00Z')
      }
    };
  }

  /**
   * Validates a YouTube URL and extracts the video ID
   */
  validateYouTubeUrl(url: string): YouTubeUrlValidationResult {
    try {
      // Support multiple YouTube URL formats
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          const videoId = match[1];
          
          // Validate video ID format (11 characters, alphanumeric, underscore, hyphen)
          if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            return {
              isValid: true,
              videoId
            };
          }
        }
      }

      return {
        isValid: false,
        error: 'Invalid YouTube URL format'
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  /**
   * Extracts video ID from a YouTube URL
   */
  extractVideoId(url: string): string | null {
    const result = this.validateYouTubeUrl(url);
    return result.isValid ? result.videoId! : null;
  }

  /**
   * Fetches video metadata (mocked)
   */
  async getVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata> {
    await this.simulateDelay();
    this.checkForSimulatedErrors();
    this.requestCount++;

    const video = this.mockVideoDatabase[videoId];
    if (!video) {
      if (this.config.simulateVideoNotFound) {
        throw new Error(`Video not found: ${videoId}`);
      }
      
      // Generate mock data for unknown videos
      return this.generateMockVideoData(videoId);
    }

    return { ...video };
  }

  /**
   * Fetches metadata for multiple videos in a single API call (mocked)
   */
  async getBulkVideoMetadata(videoIds: string[]): Promise<YouTubeVideoMetadata[]> {
    if (videoIds.length === 0) {
      return [];
    }

    await this.simulateDelay();
    this.checkForSimulatedErrors();
    this.requestCount++;

    const results: YouTubeVideoMetadata[] = [];

    for (const videoId of videoIds) {
      const video = this.mockVideoDatabase[videoId];
      if (video) {
        results.push({ ...video });
      } else if (!this.config.simulateVideoNotFound) {
        results.push(this.generateMockVideoData(videoId));
      }
    }

    return results;
  }

  /**
   * Gets current view count for a video (mocked)
   */
  async getVideoViewCount(videoId: string): Promise<number> {
    await this.simulateDelay();
    this.checkForSimulatedErrors();
    this.requestCount++;

    const video = this.mockVideoDatabase[videoId];
    if (!video) {
      if (this.config.simulateVideoNotFound) {
        throw new Error(`Video not found: ${videoId}`);
      }
      
      // Generate random view count for unknown videos
      return Math.floor(Math.random() * 1000000) + 1000;
    }

    // Simulate view count growth
    const baseViews = video.view_count;
    const growth = Math.floor(Math.random() * 100);
    return baseViews + growth;
  }

  /**
   * Gets view counts for multiple videos (mocked)
   */
  async getBulkVideoViewCounts(videoIds: string[]): Promise<Record<string, number>> {
    if (videoIds.length === 0) {
      return {};
    }

    await this.simulateDelay();
    this.checkForSimulatedErrors();
    this.requestCount++;

    const results: Record<string, number> = {};

    for (const videoId of videoIds) {
      const video = this.mockVideoDatabase[videoId];
      if (video) {
        // Simulate view count growth
        const baseViews = video.view_count;
        const growth = Math.floor(Math.random() * 100);
        results[videoId] = baseViews + growth;
      } else if (!this.config.simulateVideoNotFound) {
        results[videoId] = Math.floor(Math.random() * 1000000) + 1000;
      }
    }

    return results;
  }

  /**
   * Health check (always returns true for mock)
   */
  async healthCheck(): Promise<boolean> {
    await this.simulateDelay();
    
    if (this.config.simulateNetworkError) {
      return false;
    }
    
    return true;
  }

  /**
   * Gets current quota usage information (mocked)
   */
  getQuotaInfo(): { requestCount: number; resetTime: number; limit: number } {
    return {
      requestCount: this.requestCount,
      resetTime: Date.now(),
      limit: 10000
    };
  }

  /**
   * Adds a mock video to the database
   */
  addMockVideo(videoId: string, metadata: Partial<YouTubeVideoMetadata>): void {
    this.mockVideoDatabase[videoId] = {
      video_id: videoId,
      title: metadata.title || `Mock Video ${videoId}`,
      thumbnail_url: metadata.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      view_count: metadata.view_count || Math.floor(Math.random() * 1000000),
      channel_title: metadata.channel_title || 'Mock Channel',
      published_at: metadata.published_at || new Date()
    };
  }

  /**
   * Removes a mock video from the database
   */
  removeMockVideo(videoId: string): void {
    delete this.mockVideoDatabase[videoId];
  }

  /**
   * Clears all mock videos
   */
  clearMockVideos(): void {
    this.mockVideoDatabase = {};
  }

  /**
   * Resets request count
   */
  resetRequestCount(): void {
    this.requestCount = 0;
  }

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<MockYouTubeServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generates mock video data for unknown video IDs
   */
  private generateMockVideoData(videoId: string): YouTubeVideoMetadata {
    return {
      video_id: videoId,
      title: `Generated Mock Video ${videoId}`,
      thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      view_count: Math.floor(Math.random() * 1000000) + 1000,
      channel_title: 'Generated Mock Channel',
      published_at: new Date()
    };
  }

  /**
   * Simulates network delay
   */
  private async simulateDelay(): Promise<void> {
    if (this.config.responseDelay && this.config.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.responseDelay));
    }
  }

  /**
   * Checks for simulated errors and throws them if configured
   */
  private checkForSimulatedErrors(): void {
    if (this.config.simulateQuotaExceeded) {
      const quotaError = new Error('YouTube API quota exceeded') as YouTubeQuotaError;
      quotaError.quotaExceeded = true;
      quotaError.retryAfter = 86400;
      throw quotaError;
    }

    if (this.config.simulateNetworkError) {
      throw new Error('Network error: Unable to connect to YouTube API');
    }
  }
}

export default MockYouTubeService;