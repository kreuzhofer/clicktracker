// Core TypeScript interfaces for the Campaign Click Tracker system

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  tags?: string[];
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  tags?: string[];
}

export interface CampaignLink {
  id: string;
  campaign_id: string;
  short_code: string;
  landing_page_url: string;
  youtube_video_id: string;
  youtube_video_title?: string;
  youtube_thumbnail_url?: string;
  custom_alias?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCampaignLinkRequest {
  landing_page_url: string;
  youtube_video_id: string;
  custom_alias?: string;
}

export interface UpdateCampaignLinkRequest {
  landing_page_url?: string;
  youtube_video_id?: string;
  custom_alias?: string;
}

export interface YouTubeVideoStats {
  video_id: string;
  view_count: number;
  last_updated: Date;
}

export interface ClickEvent {
  id: string;
  campaign_link_id: string;
  tracking_id: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  clicked_at: Date;
}

export interface CreateClickEventRequest {
  campaign_link_id: string;
  tracking_id: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
}

export interface ConversionEvent {
  id: string;
  tracking_id: string;
  campaign_link_id: string;
  event_type: ConversionEventType;
  revenue_amount?: number;
  event_data?: Record<string, any>;
  converted_at: Date;
}

export interface CreateConversionEventRequest {
  tracking_id: string;
  campaign_link_id: string;
  event_type: ConversionEventType;
  revenue_amount?: number;
  event_data?: Record<string, any>;
}

export enum ConversionEventType {
  NEWSLETTER_SIGNUP = 'newsletter_signup',
  PURCHASE = 'purchase',
  COURSE_ENROLLMENT = 'course_enrollment'
}

// Analytics interfaces
export interface CampaignAnalytics {
  campaign_id: string;
  total_clicks: number;
  unique_clicks: number;
  total_conversions: number;
  total_revenue: number;
  conversion_rate: number;
  links: CampaignLinkAnalytics[];
}

export interface CampaignLinkAnalytics {
  link_id: string;
  short_code: string;
  youtube_video_id: string;
  youtube_video_title?: string;
  youtube_thumbnail_url?: string;
  video_views: number;
  total_clicks: number;
  unique_clicks: number;
  video_ctr: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
}

// Database connection interfaces
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

// YouTube API interfaces
export interface YouTubeVideoMetadata {
  video_id: string;
  title: string;
  thumbnail_url: string;
  view_count: number;
  channel_title: string;
  published_at: Date;
}

export interface YouTubeApiResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      channelTitle: string;
      publishedAt: string;
      thumbnails: {
        default: { url: string };
        medium: { url: string };
        high: { url: string };
      };
    };
    statistics: {
      viewCount: string;
    };
  }>;
}