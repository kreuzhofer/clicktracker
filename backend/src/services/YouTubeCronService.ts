import cron from 'node-cron';
import { getYouTubeService } from './YouTubeService';
import { YouTubeVideoStatsModel } from '../models/YouTubeVideoStats';
import { CampaignLinkModel } from '../models/CampaignLink';

export interface CronJobConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  timezone?: string;
  maxVideosPerBatch?: number;
  batchDelay?: number;
}

export class YouTubeCronService {
  private youtubeService = getYouTubeService();
  private videoStatsModel = new YouTubeVideoStatsModel();
  private campaignLinkModel = new CampaignLinkModel();
  private config: CronJobConfig;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  constructor(config: CronJobConfig) {
    this.config = {
      maxVideosPerBatch: 50,
      batchDelay: 1000,
      timezone: 'UTC',
      ...config
    };
  }

  /**
   * Starts the cron job for updating video view counts
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('YouTube cron service is disabled');
      return;
    }

    if (this.cronJob) {
      console.log('YouTube cron service is already running');
      return;
    }

    console.log(`Starting YouTube cron service with schedule: ${this.config.schedule}`);
    
    this.cronJob = cron.schedule(
      this.config.schedule,
      async () => {
        if (this.isRunning) {
          console.log('YouTube view count update is already running, skipping...');
          return;
        }

        try {
          await this.updateAllVideoViewCounts();
        } catch (error) {
          console.error('Error in YouTube cron job:', error);
        }
      },
      {
        scheduled: true,
        timezone: this.config.timezone
      }
    );

    console.log('YouTube cron service started successfully');
  }

  /**
   * Stops the cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('YouTube cron service stopped');
    }
  }

  /**
   * Manually triggers the video view count update
   */
  async triggerUpdate(): Promise<{ success: boolean; updatedCount: number; errors: string[] }> {
    if (this.isRunning) {
      throw new Error('Update is already in progress');
    }

    return await this.updateAllVideoViewCounts();
  }

  /**
   * Gets the current status of the cron service
   */
  getStatus(): {
    enabled: boolean;
    running: boolean;
    schedule: string;
    nextRun?: Date;
    lastRun?: Date;
  } {
    return {
      enabled: this.config.enabled,
      running: this.isRunning,
      schedule: this.config.schedule,
      nextRun: undefined, // Note: node-cron doesn't expose next/last run times
      lastRun: undefined
    };
  }

  /**
   * Updates view counts for all active video IDs
   */
  private async updateAllVideoViewCounts(): Promise<{ success: boolean; updatedCount: number; errors: string[] }> {
    this.isRunning = true;
    const startTime = Date.now();
    let updatedCount = 0;
    const errors: string[] = [];

    try {
      console.log('Starting YouTube view count update...');

      // Get all active video IDs from campaign links
      const activeVideoIds = await this.videoStatsModel.findActiveVideoIds();
      
      if (activeVideoIds.length === 0) {
        console.log('No active video IDs found');
        return { success: true, updatedCount: 0, errors: [] };
      }

      console.log(`Found ${activeVideoIds.length} active video IDs to update`);

      // Process videos in batches to avoid API rate limits
      const batches = this.chunkArray(activeVideoIds, this.config.maxVideosPerBatch!);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} videos)`);

        try {
          // Get current view counts from YouTube API
          const viewCounts = await this.youtubeService.getBulkVideoViewCounts(batch);

          // Update database with new view counts
          for (const videoId of batch) {
            const viewCount = viewCounts[videoId];
            if (viewCount !== undefined) {
              try {
                await this.videoStatsModel.upsert(videoId, viewCount);
                updatedCount++;
                console.log(`Updated ${videoId}: ${viewCount} views`);
              } catch (error) {
                const errorMsg = `Failed to update ${videoId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                console.error(errorMsg);
                errors.push(errorMsg);
              }
            } else {
              const errorMsg = `No view count data received for ${videoId}`;
              console.warn(errorMsg);
              errors.push(errorMsg);
            }
          }

          // Add delay between batches to respect rate limits
          if (i < batches.length - 1 && this.config.batchDelay! > 0) {
            await this.delay(this.config.batchDelay!);
          }

        } catch (error) {
          const errorMsg = `Failed to process batch ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`YouTube view count update completed in ${duration}ms`);
      console.log(`Updated: ${updatedCount}/${activeVideoIds.length} videos`);
      
      if (errors.length > 0) {
        console.log(`Errors: ${errors.length}`);
      }

      return {
        success: errors.length < activeVideoIds.length / 2, // Consider successful if less than 50% errors
        updatedCount,
        errors
      };

    } catch (error) {
      const errorMsg = `Critical error in view count update: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      
      return {
        success: false,
        updatedCount,
        errors
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Updates view counts for specific video IDs
   */
  async updateSpecificVideos(videoIds: string[]): Promise<{ success: boolean; updatedCount: number; errors: string[] }> {
    if (this.isRunning) {
      throw new Error('Update is already in progress');
    }

    if (videoIds.length === 0) {
      return { success: true, updatedCount: 0, errors: [] };
    }

    this.isRunning = true;
    let updatedCount = 0;
    const errors: string[] = [];

    try {
      console.log(`Updating view counts for ${videoIds.length} specific videos`);

      // Process videos in batches
      const batches = this.chunkArray(videoIds, this.config.maxVideosPerBatch!);
      
      for (const batch of batches) {
        try {
          const viewCounts = await this.youtubeService.getBulkVideoViewCounts(batch);

          for (const videoId of batch) {
            const viewCount = viewCounts[videoId];
            if (viewCount !== undefined) {
              try {
                await this.videoStatsModel.upsert(videoId, viewCount);
                updatedCount++;
              } catch (error) {
                const errorMsg = `Failed to update ${videoId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                errors.push(errorMsg);
              }
            } else {
              const errorMsg = `No view count data received for ${videoId}`;
              errors.push(errorMsg);
            }
          }

        } catch (error) {
          const errorMsg = `Failed to process batch: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
        }
      }

      return {
        success: errors.length === 0,
        updatedCount,
        errors
      };

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Cleans up stale video stats that are no longer used
   */
  async cleanupStaleStats(): Promise<{ deletedCount: number }> {
    try {
      console.log('Cleaning up stale video stats...');
      const deletedCount = await this.videoStatsModel.deleteUnusedStats();
      console.log(`Cleaned up ${deletedCount} stale video stats`);
      return { deletedCount };
    } catch (error) {
      console.error('Error cleaning up stale stats:', error);
      throw error;
    }
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<CronJobConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };

    // Restart if schedule changed or enabled status changed
    if (wasEnabled && this.cronJob && (newConfig.schedule || newConfig.enabled === false)) {
      this.stop();
    }

    if (this.config.enabled && !this.cronJob) {
      this.start();
    }
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
let cronServiceInstance: YouTubeCronService | null = null;

export const getYouTubeCronService = (): YouTubeCronService => {
  if (!cronServiceInstance) {
    const config: CronJobConfig = {
      enabled: process.env.NODE_ENV !== 'test', // Disable in test environment
      schedule: process.env.YOUTUBE_CRON_SCHEDULE || '0 2 * * *', // Daily at 2 AM by default
      timezone: process.env.YOUTUBE_CRON_TIMEZONE || 'UTC',
      maxVideosPerBatch: parseInt(process.env.YOUTUBE_BATCH_SIZE || '50', 10),
      batchDelay: parseInt(process.env.YOUTUBE_BATCH_DELAY || '1000', 10)
    };
    
    cronServiceInstance = new YouTubeCronService(config);
  }
  
  return cronServiceInstance;
};

export default YouTubeCronService;