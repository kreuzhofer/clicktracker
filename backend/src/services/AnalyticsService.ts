import Database from '../config/database';
import { CampaignModel, CampaignLinkModel, ClickEventModel, ConversionEventModel, YouTubeVideoStatsModel } from '../models';
import { CampaignAnalytics, CampaignLinkAnalytics, ConversionEventType } from '../types';

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  eventType?: ConversionEventType;
}

export interface ConversionFunnelStep {
  step: string;
  count: number;
  rate: number;
  dropOffRate?: number;
}

export interface RevenueAttribution {
  totalRevenue: number;
  revenueByEventType: Array<{
    eventType: ConversionEventType;
    revenue: number;
    count: number;
    averageOrderValue: number;
  }>;
  revenueByTimeframe: Array<{
    date: string;
    revenue: number;
    conversions: number;
  }>;
}

export class AnalyticsService {
  private db: Database;
  private campaignModel: CampaignModel;
  private campaignLinkModel: CampaignLinkModel;
  private clickEventModel: ClickEventModel;
  private conversionEventModel: ConversionEventModel;
  private youtubeStatsModel: YouTubeVideoStatsModel;

  constructor() {
    this.db = Database.getInstance();
    this.campaignModel = new CampaignModel();
    this.campaignLinkModel = new CampaignLinkModel();
    this.clickEventModel = new ClickEventModel();
    this.conversionEventModel = new ConversionEventModel();
    this.youtubeStatsModel = new YouTubeVideoStatsModel();
  }

  /**
   * Get comprehensive analytics for a campaign
   */
  async getCampaignAnalytics(campaignId: string, filters: AnalyticsFilters = {}): Promise<CampaignAnalytics> {
    // Verify campaign exists
    const campaign = await this.campaignModel.findById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get all campaign links
    const campaignLinks = await this.campaignLinkModel.findByCampaignId(campaignId);
    
    // Get analytics for each link
    const linkAnalytics = await Promise.all(
      campaignLinks.map(link => this.getCampaignLinkAnalytics(link.id, filters))
    );

    // Aggregate campaign-level metrics
    const totalClicks = linkAnalytics.reduce((sum, link) => sum + link.total_clicks, 0);
    const uniqueClicks = linkAnalytics.reduce((sum, link) => sum + link.unique_clicks, 0);
    const totalConversions = linkAnalytics.reduce((sum, link) => sum + link.conversions, 0);
    const totalRevenue = linkAnalytics.reduce((sum, link) => sum + link.revenue, 0);
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      campaign_id: campaignId,
      total_clicks: totalClicks,
      unique_clicks: uniqueClicks,
      total_conversions: totalConversions,
      total_revenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
      conversion_rate: Math.round(conversionRate * 100) / 100,
      links: linkAnalytics
    };
  }

  /**
   * Get detailed analytics for a specific campaign link
   */
  async getCampaignLinkAnalytics(linkId: string, filters: AnalyticsFilters = {}): Promise<CampaignLinkAnalytics> {
    // Get campaign link details
    const link = await this.campaignLinkModel.findById(linkId);
    if (!link) {
      throw new Error('Campaign link not found');
    }

    // Get YouTube video stats
    const videoStats = await this.youtubeStatsModel.findByVideoId(link.youtube_video_id);
    const videoViews = videoStats ? parseInt(videoStats.view_count.toString()) : 0;

    // Build date filter conditions
    const dateConditions = this.buildDateFilterConditions(filters);
    
    // Get click metrics
    const clickMetrics = await this.getClickMetrics(linkId, dateConditions);
    
    // Get conversion metrics
    const conversionMetrics = await this.getConversionMetrics(linkId, dateConditions, filters.eventType);

    // Calculate CTR and conversion rate
    const videoCtr = videoViews > 0 ? (clickMetrics.totalClicks / videoViews) * 100 : 0;
    const conversionRate = clickMetrics.totalClicks > 0 ? (conversionMetrics.totalConversions / clickMetrics.totalClicks) * 100 : 0;

    return {
      link_id: linkId,
      short_code: link.short_code,
      youtube_video_id: link.youtube_video_id,
      youtube_video_title: link.youtube_video_title,
      youtube_thumbnail_url: link.youtube_thumbnail_url,
      video_views: videoViews,
      total_clicks: clickMetrics.totalClicks,
      unique_clicks: clickMetrics.uniqueClicks,
      video_ctr: Math.round(videoCtr * 10000) / 10000, // Round to 4 decimal places for precision
      conversions: conversionMetrics.totalConversions,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      revenue: Math.round(conversionMetrics.totalRevenue * 100) / 100
    };
  }

  /**
   * Get conversion funnel analysis for a campaign link
   */
  async getConversionFunnel(linkId: string, filters: AnalyticsFilters = {}): Promise<ConversionFunnelStep[]> {
    const dateConditions = this.buildDateFilterConditions(filters);
    
    // Get total clicks (funnel entry point)
    const clickMetrics = await this.getClickMetrics(linkId, dateConditions);
    const totalClicks = clickMetrics.totalClicks;

    if (totalClicks === 0) {
      return [{
        step: 'clicks',
        count: 0,
        rate: 0
      }];
    }

    // Get conversions by type in funnel order
    const conversionQuery = `
      SELECT 
        event_type,
        COUNT(*) as count
      FROM conversion_events 
      WHERE campaign_link_id = $1 
        ${dateConditions.whereClause}
        ${filters.eventType ? 'AND event_type = $' + (dateConditions.paramCount + 1) : ''}
      GROUP BY event_type
      ORDER BY 
        CASE event_type 
          WHEN 'newsletter_signup' THEN 1
          WHEN 'course_enrollment' THEN 2
          WHEN 'purchase' THEN 3
          ELSE 4
        END
    `;

    const params = [linkId, ...dateConditions.params];
    if (filters.eventType) {
      params.push(filters.eventType);
    }

    const conversionResult = await this.db.query(conversionQuery, params);

    // Build funnel steps
    const funnel: ConversionFunnelStep[] = [{
      step: 'clicks',
      count: totalClicks,
      rate: 100,
      dropOffRate: 0
    }];

    let previousCount = totalClicks;
    for (const row of conversionResult.rows) {
      const count = parseInt(row.count);
      const rate = (count / totalClicks) * 100;
      const dropOffRate = previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0;
      
      funnel.push({
        step: row.event_type,
        count,
        rate: Math.round(rate * 100) / 100,
        dropOffRate: Math.round(dropOffRate * 100) / 100
      });
      
      previousCount = count;
    }

    return funnel;
  }

  /**
   * Get revenue attribution analysis
   */
  async getRevenueAttribution(linkId: string, filters: AnalyticsFilters = {}): Promise<RevenueAttribution> {
    const dateConditions = this.buildDateFilterConditions(filters);
    
    // Get total revenue
    const totalRevenueQuery = `
      SELECT COALESCE(SUM(revenue_amount), 0) as total_revenue 
      FROM conversion_events 
      WHERE campaign_link_id = $1 
        AND revenue_amount IS NOT NULL
        ${dateConditions.whereClause}
        ${filters.eventType ? 'AND event_type = $' + (dateConditions.paramCount + 1) : ''}
    `;

    const params = [linkId, ...dateConditions.params];
    if (filters.eventType) {
      params.push(filters.eventType);
    }

    const totalRevenueResult = await this.db.query(totalRevenueQuery, params);
    const totalRevenue = parseFloat(totalRevenueResult.rows[0].total_revenue) || 0;

    // Get revenue by event type
    const revenueByTypeQuery = `
      SELECT 
        event_type,
        COALESCE(SUM(revenue_amount), 0) as revenue,
        COUNT(*) as count,
        COALESCE(AVG(revenue_amount), 0) as avg_order_value
      FROM conversion_events 
      WHERE campaign_link_id = $1 
        AND revenue_amount IS NOT NULL
        ${dateConditions.whereClause}
        ${filters.eventType ? 'AND event_type = $' + (dateConditions.paramCount + 1) : ''}
      GROUP BY event_type
      ORDER BY revenue DESC
    `;

    const revenueByTypeResult = await this.db.query(revenueByTypeQuery, params);
    const revenueByEventType = revenueByTypeResult.rows.map((row: any) => ({
      eventType: row.event_type as ConversionEventType,
      revenue: Math.round(parseFloat(row.revenue) * 100) / 100,
      count: parseInt(row.count),
      averageOrderValue: Math.round(parseFloat(row.avg_order_value) * 100) / 100
    }));

    // Get revenue by timeframe (daily)
    const revenueByTimeQuery = `
      SELECT 
        DATE(converted_at) as date,
        COALESCE(SUM(revenue_amount), 0) as revenue,
        COUNT(*) as conversions
      FROM conversion_events 
      WHERE campaign_link_id = $1 
        AND revenue_amount IS NOT NULL
        ${dateConditions.whereClause}
        ${filters.eventType ? 'AND event_type = $' + (dateConditions.paramCount + 1) : ''}
      GROUP BY DATE(converted_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const revenueByTimeResult = await this.db.query(revenueByTimeQuery, params);
    const revenueByTimeframe = revenueByTimeResult.rows.map((row: any) => ({
      date: row.date,
      revenue: Math.round(parseFloat(row.revenue) * 100) / 100,
      conversions: parseInt(row.conversions)
    }));

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueByEventType,
      revenueByTimeframe
    };
  }

  /**
   * Get campaign performance comparison
   */
  async getCampaignComparison(campaignIds: string[], filters: AnalyticsFilters = {}): Promise<Array<{
    campaignId: string;
    campaignName: string;
    totalClicks: number;
    uniqueClicks: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    averageOrderValue: number;
  }>> {
    const results = [];

    for (const campaignId of campaignIds) {
      const campaign = await this.campaignModel.findById(campaignId);
      if (!campaign) continue;

      const analytics = await this.getCampaignAnalytics(campaignId, filters);
      const averageOrderValue = analytics.total_conversions > 0 ? analytics.total_revenue / analytics.total_conversions : 0;

      results.push({
        campaignId,
        campaignName: campaign.name,
        totalClicks: analytics.total_clicks,
        uniqueClicks: analytics.unique_clicks,
        conversions: analytics.total_conversions,
        conversionRate: analytics.conversion_rate,
        revenue: analytics.total_revenue,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100
      });
    }

    return results;
  }

  /**
   * Get top performing links across all campaigns
   */
  async getTopPerformingLinks(limit: number = 10, metric: 'clicks' | 'conversions' | 'revenue' | 'ctr' = 'clicks'): Promise<Array<{
    linkId: string;
    campaignId: string;
    campaignName: string;
    shortCode: string;
    youtubeVideoTitle: string;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number;
    conversionRate: number;
  }>> {
    const orderByClause = {
      clicks: 'total_clicks DESC',
      conversions: 'total_conversions DESC', 
      revenue: 'total_revenue DESC',
      ctr: 'video_ctr DESC'
    }[metric];

    const query = `
      SELECT 
        cl.id as link_id,
        cl.campaign_id,
        c.name as campaign_name,
        cl.short_code,
        cl.youtube_video_title,
        COUNT(DISTINCT ce.id) as total_clicks,
        COUNT(DISTINCT conv.id) as total_conversions,
        COALESCE(SUM(conv.revenue_amount), 0) as total_revenue,
        COALESCE(yvs.view_count, 0) as video_views,
        CASE 
          WHEN COALESCE(yvs.view_count, 0) > 0 
          THEN (COUNT(DISTINCT ce.id)::float / yvs.view_count * 100)
          ELSE 0 
        END as video_ctr,
        CASE 
          WHEN COUNT(DISTINCT ce.id) > 0 
          THEN (COUNT(DISTINCT conv.id)::float / COUNT(DISTINCT ce.id) * 100)
          ELSE 0 
        END as conversion_rate
      FROM campaign_links cl
      JOIN campaigns c ON cl.campaign_id = c.id
      LEFT JOIN click_events ce ON cl.id = ce.campaign_link_id
      LEFT JOIN conversion_events conv ON cl.id = conv.campaign_link_id
      LEFT JOIN youtube_video_stats yvs ON cl.youtube_video_id = yvs.video_id
      GROUP BY cl.id, cl.campaign_id, c.name, cl.short_code, cl.youtube_video_title, yvs.view_count
      ORDER BY ${orderByClause}
      LIMIT $1
    `;

    const result = await this.db.query(query, [limit]);
    return result.rows.map((row: any) => ({
      linkId: row.link_id,
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      shortCode: row.short_code,
      youtubeVideoTitle: row.youtube_video_title || 'Unknown Video',
      clicks: parseInt(row.total_clicks),
      conversions: parseInt(row.total_conversions),
      revenue: Math.round(parseFloat(row.total_revenue) * 100) / 100,
      ctr: Math.round(parseFloat(row.video_ctr) * 10000) / 10000,
      conversionRate: Math.round(parseFloat(row.conversion_rate) * 100) / 100
    }));
  }

  /**
   * Helper method to build date filter conditions
   */
  private buildDateFilterConditions(filters: AnalyticsFilters): {
    whereClause: string;
    params: any[];
    paramCount: number;
  } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1; // Start from 1 since linkId is usually $1

    if (filters.startDate) {
      paramCount++;
      conditions.push(`converted_at >= $${paramCount}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      conditions.push(`converted_at <= $${paramCount}`);
      params.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
    
    return {
      whereClause,
      params,
      paramCount
    };
  }

  /**
   * Helper method to get click metrics
   */
  private async getClickMetrics(linkId: string, dateConditions: { whereClause: string; params: any[] }): Promise<{
    totalClicks: number;
    uniqueClicks: number;
  }> {
    // Adjust the date filter for click events (use clicked_at instead of converted_at)
    const clickDateFilter = dateConditions.whereClause.replace(/converted_at/g, 'clicked_at');
    
    const query = `
      SELECT 
        COUNT(*) as total_clicks,
        COUNT(DISTINCT tracking_id) as unique_clicks
      FROM click_events 
      WHERE campaign_link_id = $1 
        ${clickDateFilter}
    `;

    const params = [linkId, ...dateConditions.params];
    const result = await this.db.query(query, params);
    
    return {
      totalClicks: parseInt(result.rows[0].total_clicks),
      uniqueClicks: parseInt(result.rows[0].unique_clicks)
    };
  }

  /**
   * Helper method to get conversion metrics
   */
  private async getConversionMetrics(linkId: string, dateConditions: { whereClause: string; params: any[] }, eventType?: ConversionEventType): Promise<{
    totalConversions: number;
    totalRevenue: number;
  }> {
    let query = `
      SELECT 
        COUNT(*) as total_conversions,
        COALESCE(SUM(revenue_amount), 0) as total_revenue
      FROM conversion_events 
      WHERE campaign_link_id = $1 
        ${dateConditions.whereClause}
    `;

    const params = [linkId, ...dateConditions.params];

    if (eventType) {
      query += ` AND event_type = $${params.length + 1}`;
      params.push(eventType);
    }

    const result = await this.db.query(query, params);
    
    return {
      totalConversions: parseInt(result.rows[0].total_conversions),
      totalRevenue: parseFloat(result.rows[0].total_revenue) || 0
    };
  }
}