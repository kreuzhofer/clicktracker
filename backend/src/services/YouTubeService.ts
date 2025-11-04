import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { YouTubeVideoMetadata, YouTubeApiResponse } from '../types';

export interface YouTubeServiceConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface YouTubeUrlValidationResult {
  isValid: boolean;
  videoId?: string;
  error?: string;
}

export interface YouTubeQuotaError extends Error {
  quotaExceeded: boolean;
  retryAfter?: number;
}

export class YouTubeService {
  private client: AxiosInstance;
  private config: YouTubeServiceConfig;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private readonly QUOTA_LIMIT = 10000; // Daily quota limit
  private readonly RATE_LIMIT = 100; // Requests per 100 seconds

  constructor(config: YouTubeServiceConfig) {
    this.config = {
      baseUrl: 'https://www.googleapis.com/youtube/v3',
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Campaign-Click-Tracker/1.0'
      }
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(
      (config) => {
        this.checkRateLimit();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 403) {
          const quotaError = new Error('YouTube API quota exceeded') as YouTubeQuotaError;
          quotaError.quotaExceeded = true;
          quotaError.retryAfter = 86400; // 24 hours in seconds
          throw quotaError;
        }
        throw error;
      }
    );
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
   * Fetches video metadata from YouTube API
   */
  async getVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata> {
    try {
      const response: AxiosResponse<YouTubeApiResponse> = await this.makeApiRequest('/videos', {
        part: 'snippet,statistics',
        id: videoId,
        key: this.config.apiKey
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error(`Video not found: ${videoId}`);
      }

      const video = response.data.items[0];
      const snippet = video.snippet;
      const statistics = video.statistics;

      return {
        video_id: videoId,
        title: snippet.title,
        thumbnail_url: snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url,
        view_count: parseInt(statistics.viewCount, 10) || 0,
        channel_title: snippet.channelTitle,
        published_at: new Date(snippet.publishedAt)
      };
    } catch (error) {
      if (error instanceof Error && (error as YouTubeQuotaError).quotaExceeded) {
        throw error;
      }
      throw new Error(`Failed to fetch video metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetches metadata for multiple videos in a single API call
   */
  async getBulkVideoMetadata(videoIds: string[]): Promise<YouTubeVideoMetadata[]> {
    if (videoIds.length === 0) {
      return [];
    }

    // YouTube API allows up to 50 video IDs per request
    const chunks = this.chunkArray(videoIds, 50);
    const results: YouTubeVideoMetadata[] = [];

    for (const chunk of chunks) {
      try {
        const response: AxiosResponse<YouTubeApiResponse> = await this.makeApiRequest('/videos', {
          part: 'snippet,statistics',
          id: chunk.join(','),
          key: this.config.apiKey
        });

        if (response.data.items) {
          for (const video of response.data.items) {
            const snippet = video.snippet;
            const statistics = video.statistics;

            results.push({
              video_id: video.id,
              title: snippet.title,
              thumbnail_url: snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url,
              view_count: parseInt(statistics.viewCount, 10) || 0,
              channel_title: snippet.channelTitle,
              published_at: new Date(snippet.publishedAt)
            });
          }
        }
      } catch (error) {
        console.error(`Failed to fetch metadata for chunk: ${chunk.join(',')}`, error);
        // Continue with other chunks even if one fails
      }
    }

    return results;
  }

  /**
   * Gets current view count for a video
   */
  async getVideoViewCount(videoId: string): Promise<number> {
    try {
      const response: AxiosResponse<YouTubeApiResponse> = await this.makeApiRequest('/videos', {
        part: 'statistics',
        id: videoId,
        key: this.config.apiKey
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error(`Video not found: ${videoId}`);
      }

      const statistics = response.data.items[0].statistics;
      return parseInt(statistics.viewCount, 10) || 0;
    } catch (error) {
      if (error instanceof Error && (error as YouTubeQuotaError).quotaExceeded) {
        throw error;
      }
      throw new Error(`Failed to fetch view count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets view counts for multiple videos
   */
  async getBulkVideoViewCounts(videoIds: string[]): Promise<Record<string, number>> {
    if (videoIds.length === 0) {
      return {};
    }

    const chunks = this.chunkArray(videoIds, 50);
    const results: Record<string, number> = {};

    for (const chunk of chunks) {
      try {
        const response: AxiosResponse<YouTubeApiResponse> = await this.makeApiRequest('/videos', {
          part: 'statistics',
          id: chunk.join(','),
          key: this.config.apiKey
        });

        if (response.data.items) {
          for (const video of response.data.items) {
            const statistics = video.statistics;
            results[video.id] = parseInt(statistics.viewCount, 10) || 0;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch view counts for chunk: ${chunk.join(',')}`, error);
        // Continue with other chunks even if one fails
      }
    }

    return results;
  }

  /**
   * Checks if the service is healthy and API key is valid
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Make a simple API call to check if the service is working
      await this.makeApiRequest('/videos', {
        part: 'snippet',
        id: 'dQw4w9WgXcQ', // Rick Roll video ID (always exists)
        key: this.config.apiKey
      });
      return true;
    } catch (error) {
      console.error('YouTube service health check failed:', error);
      return false;
    }
  }

  /**
   * Gets current quota usage information
   */
  getQuotaInfo(): { requestCount: number; resetTime: number; limit: number } {
    return {
      requestCount: this.requestCount,
      resetTime: this.lastResetTime,
      limit: this.QUOTA_LIMIT
    };
  }

  /**
   * Makes an API request with retry logic
   */
  private async makeApiRequest(endpoint: string, params: Record<string, any>): Promise<AxiosResponse<YouTubeApiResponse>> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
      try {
        this.incrementRequestCount();
        const response = await this.client.get(endpoint, { params });
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on quota exceeded or authentication errors
        if (error instanceof Error && (error as YouTubeQuotaError).quotaExceeded) {
          throw error;
        }
        
        if (attempt < this.config.maxRetries!) {
          await this.delay(this.config.retryDelay! * attempt);
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Checks rate limiting
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    
    // Reset counter every 100 seconds
    if (timeSinceReset >= 100000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    if (this.requestCount >= this.RATE_LIMIT) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }
  }

  /**
   * Increments request count for quota tracking
   */
  private incrementRequestCount(): void {
    this.requestCount++;
  }

  /**
   * Utility method to chunk arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let youtubeServiceInstance: YouTubeService | null = null;

export const getYouTubeService = (): YouTubeService => {
  if (!youtubeServiceInstance) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY environment variable is required');
    }
    
    youtubeServiceInstance = new YouTubeService({ apiKey });
  }
  
  return youtubeServiceInstance;
};

export default YouTubeService;