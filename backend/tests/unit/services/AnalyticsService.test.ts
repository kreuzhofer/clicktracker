import { AnalyticsService } from '../../../src/services/AnalyticsService';
import { TestHelpers } from '../../helpers/testHelpers';
import { ConversionEventType } from '../../../src/types';
import { v4 as uuidv4 } from 'uuid';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let testCampaign: any;
  let testCampaignLink: any;

  beforeEach(async () => {
    analyticsService = new AnalyticsService();
    
    // Create test data
    testCampaign = await TestHelpers.createTestCampaign({
      name: `Analytics Test Campaign ${Date.now()}`
    });
    
    testCampaignLink = await TestHelpers.createTestCampaignLink(testCampaign.id, {
      landing_page_url: 'https://example.com/test-landing',
      youtube_video_id: 'test_video_123'
    });
  });

  describe('getCampaignAnalytics', () => {
    it('should return analytics for campaign with no data', async () => {
      const analytics = await analyticsService.getCampaignAnalytics(testCampaign.id);
      
      expect(analytics).toMatchObject({
        campaign_id: testCampaign.id,
        total_clicks: 0,
        unique_clicks: 0,
        total_conversions: 0,
        total_revenue: 0,
        conversion_rate: 0,
        links: expect.any(Array)
      });
      
      expect(analytics.links).toHaveLength(1);
      expect(analytics.links[0]).toMatchObject({
        link_id: testCampaignLink.id,
        short_code: testCampaignLink.short_code,
        youtube_video_id: 'test_video_123',
        video_views: 0,
        total_clicks: 0,
        unique_clicks: 0,
        video_ctr: 0,
        conversions: 0,
        conversion_rate: 0,
        revenue: 0
      });
    });

    it('should calculate correct metrics with click and conversion data', async () => {
      // Create test clicks and conversions
      const trackingId1 = uuidv4();
      const trackingId2 = uuidv4();
      
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId1);
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId2);
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId1); // Duplicate tracking ID
      
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId1, ConversionEventType.NEWSLETTER_SIGNUP);
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId2, ConversionEventType.PURCHASE);
      
      const analytics = await analyticsService.getCampaignAnalytics(testCampaign.id);
      
      expect(analytics.total_clicks).toBe(3);
      expect(analytics.unique_clicks).toBe(2);
      expect(analytics.total_conversions).toBe(2);
      expect(analytics.conversion_rate).toBe(66.67); // 2/3 * 100, rounded to 2 decimals
      expect(analytics.total_revenue).toBe(99.99); // Only purchase has revenue
    });

    it('should handle date filtering correctly', async () => {
      const trackingId = uuidv4();
      
      // Create clicks and conversions
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId);
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId, ConversionEventType.PURCHASE);
      
      // Test with date range that excludes today's data
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const analytics = await analyticsService.getCampaignAnalytics(testCampaign.id, {
        startDate: twoDaysAgo,
        endDate: yesterday
      });
      
      expect(analytics.total_clicks).toBe(0);
      expect(analytics.total_conversions).toBe(0);
      expect(analytics.total_revenue).toBe(0);
    });

    it('should filter by event type correctly', async () => {
      const trackingId1 = uuidv4();
      const trackingId2 = uuidv4();
      
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId1);
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId2);
      
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId1, ConversionEventType.NEWSLETTER_SIGNUP);
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId2, ConversionEventType.PURCHASE);
      
      const analytics = await analyticsService.getCampaignAnalytics(testCampaign.id, {
        eventType: ConversionEventType.PURCHASE
      });
      
      expect(analytics.total_conversions).toBe(1);
      expect(analytics.total_revenue).toBe(99.99);
    });

    it('should throw error for non-existent campaign', async () => {
      const nonExistentId = uuidv4();
      
      await expect(analyticsService.getCampaignAnalytics(nonExistentId))
        .rejects.toThrow('Campaign not found');
    });
  });

  describe('getCampaignLinkAnalytics', () => {
    it('should calculate video CTR correctly with YouTube stats', async () => {
      // Mock YouTube video stats
      const youtubeStatsModel = (analyticsService as any).youtubeStatsModel;
      jest.spyOn(youtubeStatsModel, 'findByVideoId').mockResolvedValue({
        video_id: 'test_video_123',
        view_count: 10000,
        last_updated: new Date()
      });
      
      // Create 50 clicks
      for (let i = 0; i < 50; i++) {
        await TestHelpers.createTestClick(testCampaignLink.id, uuidv4());
      }
      
      const analytics = await analyticsService.getCampaignLinkAnalytics(testCampaignLink.id);
      
      expect(analytics.video_views).toBe(10000);
      expect(analytics.total_clicks).toBe(50);
      expect(analytics.video_ctr).toBe(0.5); // 50/10000 * 100 = 0.5%
      
      youtubeStatsModel.findByVideoId.mockRestore();
    });

    it('should handle precision in CTR calculations', async () => {
      // Mock YouTube video stats with specific view count for precision testing
      const youtubeStatsModel = (analyticsService as any).youtubeStatsModel;
      jest.spyOn(youtubeStatsModel, 'findByVideoId').mockResolvedValue({
        video_id: 'test_video_123',
        view_count: 3333,
        last_updated: new Date()
      });
      
      // Create 1 click
      await TestHelpers.createTestClick(testCampaignLink.id, uuidv4());
      
      const analytics = await analyticsService.getCampaignLinkAnalytics(testCampaignLink.id);
      
      // 1/3333 * 100 = 0.030003000300030003... should be rounded to 4 decimal places
      expect(analytics.video_ctr).toBe(0.03);
      
      youtubeStatsModel.findByVideoId.mockRestore();
    });

    it('should handle zero video views gracefully', async () => {
      // Mock YouTube video stats with zero views
      const youtubeStatsModel = (analyticsService as any).youtubeStatsModel;
      jest.spyOn(youtubeStatsModel, 'findByVideoId').mockResolvedValue({
        video_id: 'test_video_123',
        view_count: 0,
        last_updated: new Date()
      });
      
      await TestHelpers.createTestClick(testCampaignLink.id, uuidv4());
      
      const analytics = await analyticsService.getCampaignLinkAnalytics(testCampaignLink.id);
      
      expect(analytics.video_ctr).toBe(0);
      
      youtubeStatsModel.findByVideoId.mockRestore();
    });

    it('should throw error for non-existent campaign link', async () => {
      const nonExistentId = uuidv4();
      
      await expect(analyticsService.getCampaignLinkAnalytics(nonExistentId))
        .rejects.toThrow('Campaign link not found');
    });
  });

  describe('getConversionFunnel', () => {
    it('should return correct funnel with no data', async () => {
      const funnel = await analyticsService.getConversionFunnel(testCampaignLink.id);
      
      expect(funnel).toEqual([{
        step: 'clicks',
        count: 0,
        rate: 0
      }]);
    });

    it('should calculate funnel steps correctly', async () => {
      // Create test data: 10 clicks, 5 newsletter signups, 2 purchases
      const trackingIds = [];
      
      for (let i = 0; i < 10; i++) {
        const trackingId = uuidv4();
        trackingIds.push(trackingId);
        await TestHelpers.createTestClick(testCampaignLink.id, trackingId);
      }
      
      // 5 newsletter signups
      for (let i = 0; i < 5; i++) {
        await TestHelpers.createTestConversion(
          testCampaignLink.id, 
          trackingIds[i], 
          ConversionEventType.NEWSLETTER_SIGNUP
        );
      }
      
      // 2 purchases
      for (let i = 0; i < 2; i++) {
        await TestHelpers.createTestConversion(
          testCampaignLink.id, 
          trackingIds[i], 
          ConversionEventType.PURCHASE
        );
      }
      
      const funnel = await analyticsService.getConversionFunnel(testCampaignLink.id);
      
      expect(funnel).toHaveLength(3);
      
      expect(funnel[0]).toMatchObject({
        step: 'clicks',
        count: 10,
        rate: 100,
        dropOffRate: 0
      });
      
      expect(funnel[1]).toMatchObject({
        step: 'newsletter_signup',
        count: 5,
        rate: 50, // 5/10 * 100
        dropOffRate: 50 // (10-5)/10 * 100
      });
      
      expect(funnel[2]).toMatchObject({
        step: 'purchase',
        count: 2,
        rate: 20, // 2/10 * 100
        dropOffRate: 60 // (5-2)/5 * 100
      });
    });

    it('should handle funnel ordering correctly', async () => {
      const trackingId = uuidv4();
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId);
      
      // Create conversions in reverse order
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId, ConversionEventType.PURCHASE);
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId, ConversionEventType.NEWSLETTER_SIGNUP);
      
      const funnel = await analyticsService.getConversionFunnel(testCampaignLink.id);
      
      expect(funnel[1].step).toBe('newsletter_signup');
      expect(funnel[2].step).toBe('purchase');
    });
  });

  describe('getRevenueAttribution', () => {
    it('should calculate revenue attribution correctly', async () => {
      const trackingId1 = uuidv4();
      const trackingId2 = uuidv4();
      
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId1);
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId2);
      
      // Create conversions with different revenue amounts
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId1, ConversionEventType.PURCHASE);
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId2, ConversionEventType.PURCHASE);
      
      const attribution = await analyticsService.getRevenueAttribution(testCampaignLink.id);
      
      expect(attribution.totalRevenue).toBe(199.98); // 2 * 99.99
      expect(attribution.revenueByEventType).toHaveLength(1);
      expect(attribution.revenueByEventType[0]).toMatchObject({
        eventType: ConversionEventType.PURCHASE,
        revenue: 199.98,
        count: 2,
        averageOrderValue: 99.99
      });
    });

    it('should handle revenue rounding correctly', async () => {
      const trackingId = uuidv4();
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId);
      
      // Create conversion with precise decimal amount
      const conversionEventModel = (analyticsService as any).conversionEventModel;
      await conversionEventModel.create({
        tracking_id: trackingId,
        campaign_link_id: testCampaignLink.id,
        event_type: ConversionEventType.PURCHASE,
        revenue_amount: 123.456789 // Should be rounded to 123.46
      });
      
      const attribution = await analyticsService.getRevenueAttribution(testCampaignLink.id);
      
      expect(attribution.totalRevenue).toBe(123.46);
      expect(attribution.revenueByEventType[0].revenue).toBe(123.46);
      expect(attribution.revenueByEventType[0].averageOrderValue).toBe(123.46);
    });

    it('should exclude conversions without revenue', async () => {
      const trackingId1 = uuidv4();
      const trackingId2 = uuidv4();
      
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId1);
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId2);
      
      // Newsletter signup (no revenue) and purchase (with revenue)
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId1, ConversionEventType.NEWSLETTER_SIGNUP);
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId2, ConversionEventType.PURCHASE);
      
      const attribution = await analyticsService.getRevenueAttribution(testCampaignLink.id);
      
      expect(attribution.totalRevenue).toBe(99.99);
      expect(attribution.revenueByEventType).toHaveLength(1);
      expect(attribution.revenueByEventType[0].eventType).toBe(ConversionEventType.PURCHASE);
    });
  });

  describe('getTopPerformingLinks', () => {
    it('should return top links by clicks', async () => {
      // Create another campaign and link for comparison
      const campaign2 = await TestHelpers.createTestCampaign({
        name: `Analytics Test Campaign 2 ${Date.now()}`
      });
      
      const link2 = await TestHelpers.createTestCampaignLink(campaign2.id, {
        landing_page_url: 'https://example.com/test-landing-2',
        youtube_video_id: 'test_video_456'
      });
      
      // Create more clicks for link2
      for (let i = 0; i < 5; i++) {
        await TestHelpers.createTestClick(testCampaignLink.id, uuidv4());
      }
      
      for (let i = 0; i < 10; i++) {
        await TestHelpers.createTestClick(link2.id, uuidv4());
      }
      
      const topLinks = await analyticsService.getTopPerformingLinks(5, 'clicks');
      
      expect(topLinks).toHaveLength(2);
      expect(topLinks[0].clicks).toBe(10);
      expect(topLinks[0].linkId).toBe(link2.id);
      expect(topLinks[1].clicks).toBe(5);
      expect(topLinks[1].linkId).toBe(testCampaignLink.id);
    });

    it('should return top links by revenue', async () => {
      const campaign2 = await TestHelpers.createTestCampaign({
        name: `Analytics Test Campaign 2 ${Date.now()}`
      });
      
      const link2 = await TestHelpers.createTestCampaignLink(campaign2.id);
      
      // Create conversions with different revenue
      const trackingId1 = uuidv4();
      const trackingId2 = uuidv4();
      
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId1);
      await TestHelpers.createTestClick(link2.id, trackingId2);
      
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId1, ConversionEventType.PURCHASE); // 99.99
      
      // Create higher revenue conversion for link2
      const conversionEventModel = (analyticsService as any).conversionEventModel;
      await conversionEventModel.create({
        tracking_id: trackingId2,
        campaign_link_id: link2.id,
        event_type: ConversionEventType.PURCHASE,
        revenue_amount: 199.99
      });
      
      const topLinks = await analyticsService.getTopPerformingLinks(5, 'revenue');
      
      expect(topLinks[0].revenue).toBe(199.99);
      expect(topLinks[0].linkId).toBe(link2.id);
      expect(topLinks[1].revenue).toBe(99.99);
      expect(topLinks[1].linkId).toBe(testCampaignLink.id);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();
      
      // Create 100 clicks and 50 conversions
      const trackingIds = [];
      for (let i = 0; i < 100; i++) {
        const trackingId = uuidv4();
        trackingIds.push(trackingId);
        await TestHelpers.createTestClick(testCampaignLink.id, trackingId);
      }
      
      for (let i = 0; i < 50; i++) {
        await TestHelpers.createTestConversion(
          testCampaignLink.id, 
          trackingIds[i], 
          ConversionEventType.NEWSLETTER_SIGNUP
        );
      }
      
      const analytics = await analyticsService.getCampaignAnalytics(testCampaign.id);
      
      const executionTime = Date.now() - startTime;
      
      expect(analytics.total_clicks).toBe(100);
      expect(analytics.total_conversions).toBe(50);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle zero division gracefully', async () => {
      // Test with no clicks
      const analytics = await analyticsService.getCampaignLinkAnalytics(testCampaignLink.id);
      
      expect(analytics.video_ctr).toBe(0);
      expect(analytics.conversion_rate).toBe(0);
      
      const funnel = await analyticsService.getConversionFunnel(testCampaignLink.id);
      expect(funnel[0].rate).toBe(0);
      
      const attribution = await analyticsService.getRevenueAttribution(testCampaignLink.id);
      expect(attribution.totalRevenue).toBe(0);
    });

    it('should maintain precision in financial calculations', async () => {
      const trackingIds = [];
      
      // Create multiple small revenue conversions
      for (let i = 0; i < 3; i++) {
        const trackingId = uuidv4();
        trackingIds.push(trackingId);
        await TestHelpers.createTestClick(testCampaignLink.id, trackingId);
      }
      
      const conversionEventModel = (analyticsService as any).conversionEventModel;
      
      // Create conversions with precise amounts that could cause rounding errors
      await conversionEventModel.create({
        tracking_id: trackingIds[0],
        campaign_link_id: testCampaignLink.id,
        event_type: ConversionEventType.PURCHASE,
        revenue_amount: 10.01
      });
      
      await conversionEventModel.create({
        tracking_id: trackingIds[1],
        campaign_link_id: testCampaignLink.id,
        event_type: ConversionEventType.PURCHASE,
        revenue_amount: 10.02
      });
      
      await conversionEventModel.create({
        tracking_id: trackingIds[2],
        campaign_link_id: testCampaignLink.id,
        event_type: ConversionEventType.PURCHASE,
        revenue_amount: 10.03
      });
      
      const analytics = await analyticsService.getCampaignAnalytics(testCampaign.id);
      
      expect(analytics.total_revenue).toBe(30.06); // Should be exactly 30.06, not 30.059999999999995
    });
  });
});