import { CampaignLinkModel } from '../models/CampaignLink';
import { ClickEventModel } from '../models/ClickEvent';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface ShortenUrlRequest {
  campaignId: string;
  landingPageUrl: string;
  youtubeVideoId: string;
  customAlias?: string;
}

export interface ShortenUrlResponse {
  shortCode: string;
  shortUrl: string;
  landingPageUrl: string;
  youtubeVideoId: string;
  campaignLinkId: string;
}

export interface ClickTrackingData {
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
}

export interface RedirectResponse {
  landingPageUrl: string;
  trackingId: string;
  campaignLinkId: string;
}

export class URLShortenerService {
  private campaignLinkModel: CampaignLinkModel;
  private clickEventModel: ClickEventModel;
  private baseUrl: string;

  constructor() {
    this.campaignLinkModel = new CampaignLinkModel();
    this.clickEventModel = new ClickEventModel();
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3001';
  }

  /**
   * Generate a unique short code with collision detection
   */
  async generateUniqueShortCode(length: number = 8, maxAttempts: number = 10): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let shortCode = '';
      
      // Use crypto for better randomness
      const randomBytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        shortCode += chars[randomBytes[i] % chars.length];
      }
      
      // Check for collision
      const isAvailable = await this.campaignLinkModel.isShortCodeAvailable(shortCode);
      if (isAvailable) {
        return shortCode;
      }
    }
    
    throw new Error(`Unable to generate unique short code after ${maxAttempts} attempts`);
  }

  /**
   * Create a shortened URL for a campaign link
   */
  async shortenUrl(request: ShortenUrlRequest): Promise<ShortenUrlResponse> {
    // Validate custom alias if provided
    if (request.customAlias) {
      const isAliasAvailable = await this.campaignLinkModel.isCustomAliasAvailable(request.customAlias);
      if (!isAliasAvailable) {
        throw new Error('Custom alias is already taken');
      }
    }

    // Create campaign link (the model will handle short code generation)
    const campaignLink = await this.campaignLinkModel.create(request.campaignId, {
      landing_page_url: request.landingPageUrl,
      youtube_video_id: request.youtubeVideoId,
      custom_alias: request.customAlias
    });

    const shortCode = campaignLink.short_code;
    const shortUrl = `${this.baseUrl}/${shortCode}`;

    return {
      shortCode,
      shortUrl,
      landingPageUrl: request.landingPageUrl,
      youtubeVideoId: request.youtubeVideoId,
      campaignLinkId: campaignLink.id
    };
  }

  /**
   * Handle click tracking and redirect
   */
  async handleClick(shortCode: string, trackingData: ClickTrackingData): Promise<RedirectResponse> {
    // Find campaign link by short code or custom alias
    let campaignLink = await this.campaignLinkModel.findByShortCode(shortCode);
    
    if (!campaignLink) {
      campaignLink = await this.campaignLinkModel.findByCustomAlias(shortCode);
    }

    if (!campaignLink) {
      throw new Error('Short URL not found');
    }

    // Generate unique tracking ID for this visitor session
    const trackingId = uuidv4();

    // Record click event
    await this.clickEventModel.create({
      campaign_link_id: campaignLink.id,
      tracking_id: trackingId,
      ip_address: trackingData.ipAddress,
      user_agent: trackingData.userAgent,
      referrer: trackingData.referrer
    });

    // Add tracking parameters to landing page URL
    const landingPageUrl = this.addTrackingParameters(
      campaignLink.landing_page_url,
      trackingId,
      campaignLink.id
    );

    return {
      landingPageUrl,
      trackingId,
      campaignLinkId: campaignLink.id
    };
  }

  /**
   * Add tracking parameters to landing page URL for conversion attribution
   */
  private addTrackingParameters(landingPageUrl: string, trackingId: string, campaignLinkId: string): string {
    const url = new URL(landingPageUrl);
    
    // Add tracking parameters
    url.searchParams.set('utm_source', 'youtube');
    url.searchParams.set('utm_medium', 'campaign_link');
    url.searchParams.set('utm_campaign', campaignLinkId);
    url.searchParams.set('tracking_id', trackingId);
    url.searchParams.set('click_id', trackingId); // Alternative parameter name for compatibility
    
    return url.toString();
  }

  /**
   * Validate URL format
   */
  validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Validate YouTube video ID format
   */
  validateYouTubeVideoId(videoId: string): boolean {
    const youtubeIdPattern = /^[a-zA-Z0-9_-]{11}$/;
    return youtubeIdPattern.test(videoId);
  }

  /**
   * Extract YouTube video ID from URL
   */
  extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Get click statistics for a campaign link
   */
  async getClickStats(campaignLinkId: string) {
    const totalClicks = await this.clickEventModel.countByCampaignLinkId(campaignLinkId);
    const uniqueClicks = await this.clickEventModel.countUniqueByCampaignLinkId(campaignLinkId);
    const recentClicks = await this.clickEventModel.getClicksByHour(campaignLinkId, 24);
    const topReferrers = await this.clickEventModel.getTopReferrers(campaignLinkId, 10);

    return {
      totalClicks,
      uniqueClicks,
      recentClicks,
      topReferrers
    };
  }



  /**
   * Batch process clicks for performance testing
   */
  async batchProcessClicks(clicks: Array<{ shortCode: string; trackingData: ClickTrackingData }>): Promise<Array<RedirectResponse | Error>> {
    const results: Array<RedirectResponse | Error> = [];
    
    // Process clicks in parallel for better performance
    const promises = clicks.map(async (click) => {
      try {
        return await this.handleClick(click.shortCode, click.trackingData);
      } catch (error) {
        return error instanceof Error ? error : new Error('Unknown error');
      }
    });

    const responses = await Promise.allSettled(promises);
    
    for (const response of responses) {
      if (response.status === 'fulfilled') {
        results.push(response.value);
      } else {
        results.push(new Error(response.reason));
      }
    }

    return results;
  }

  /**
   * Clean up old click events for performance
   */
  async cleanupOldClicks(daysToKeep: number = 90): Promise<number> {
    return await this.clickEventModel.deleteOldEvents(daysToKeep);
  }
}