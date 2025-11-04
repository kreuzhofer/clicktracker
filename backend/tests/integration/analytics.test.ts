import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';
import { ConversionEventType } from '../../src/types';
import { v4 as uuidv4 } from 'uuid';

describe('Analytics API Integration Tests', () => {
  let authToken: string;
  let testCampaign: any;
  let testCampaignLink: any;
  let testUser: any;

  beforeEach(async () => {
    // Create isolated test context
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    
    const userEmail = `analytics-test-${timestamp}-${randomId}@example.com`;
    
    testUser = await TestHelpers.createTestUser({
      email: userEmail,
      password: 'TestPassword123!'
    });
    
    // Debug the user creation response
    if (!testUser.success || !testUser.data || !testUser.data.token) {
      console.error('User creation failed:', testUser);
      throw new Error('Failed to create test user');
    }
    
    authToken = testUser.data.token;
    
    testCampaign = await TestHelpers.createTestCampaign({
      name: `Analytics API Test Campaign ${timestamp}-${randomId}`
    });
    
    testCampaignLink = await TestHelpers.createTestCampaignLink(testCampaign.id, {
      landing_page_url: 'https://example.com/analytics-test',
      youtube_video_id: 'test_video_123'
    });
  });

  describe('GET /api/analytics/campaigns/:id', () => {
    it('should return campaign analytics with no data', async () => {
      const response = await request(app)
        .get(`/api/analytics/campaigns/${testCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      const analytics = response.body.data;
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
    });

    it('should return campaign analytics with click and conversion data', async () => {
      // Create test data
      const trackingId1 = uuidv4();
      const trackingId2 = uuidv4();
      
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId1);
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId2);
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId1); // Duplicate for unique count test
      
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId1, ConversionEventType.NEWSLETTER_SIGNUP);
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId2, ConversionEventType.PURCHASE);

      const response = await request(app)
        .get(`/api/analytics/campaigns/${testCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const analytics = response.body.data;
      expect(analytics.total_clicks).toBe(3);
      expect(analytics.unique_clicks).toBe(2);
      expect(analytics.total_conversions).toBe(2);
      expect(analytics.total_revenue).toBe(99.99);
      expect(analytics.conversion_rate).toBe(66.67);
    });

    it('should filter analytics by date range', async () => {
      const trackingId = uuidv4();
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId);
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId, ConversionEventType.PURCHASE);

      // Query with date range that excludes today
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const response = await request(app)
        .get(`/api/analytics/campaigns/${testCampaign.id}`)
        .query({
          start_date: twoDaysAgo.toISOString().split('T')[0],
          end_date: yesterday.toISOString().split('T')[0]
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const analytics = response.body.data;
      expect(analytics.total_clicks).toBe(0);
      expect(analytics.total_conversions).toBe(0);
    });

    it('should filter analytics by event type', async () => {
      const trackingId1 = uuidv4();
      const trackingId2 = uuidv4();
      
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId1);
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId2);
      
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId1, ConversionEventType.NEWSLETTER_SIGNUP);
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId2, ConversionEventType.PURCHASE);

      const response = await request(app)
        .get(`/api/analytics/campaigns/${testCampaign.id}`)
        .query({ event_type: 'purchase' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const analytics = response.body.data;
      expect(analytics.total_conversions).toBe(1);
      expect(analytics.total_revenue).toBe(99.99);
    });

    it('should return 404 for non-existent campaign', async () => {
      const nonExistentId = uuidv4();
      
      const response = await request(app)
        .get(`/api/analytics/campaigns/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      TestHelpers.expectNotFoundError(response, 'Campaign');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/analytics/campaigns/${testCampaign.id}`)
        .expect(401);

      TestHelpers.expectUnauthorizedError(response);
    });

    it('should validate date parameters', async () => {
      const response = await request(app)
        .get(`/api/analytics/campaigns/${testCampaign.id}`)
        .query({
          start_date: 'invalid-date',
          end_date: '2023-12-31'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should validate end_date is after start_date', async () => {
      const response = await request(app)
        .get(`/api/analytics/campaigns/${testCampaign.id}`)
        .query({
          start_date: '2023-12-31',
          end_date: '2023-12-01'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/analytics/links/:linkId', () => {
    it('should return link analytics with no data', async () => {
      const response = await request(app)
        .get(`/api/analytics/links/${testCampaignLink.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      const analytics = response.body.data;
      expect(analytics).toMatchObject({
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

    it('should calculate CTR with video views', async () => {
      // Mock YouTube video stats by creating them directly
      const { YouTubeVideoStatsModel } = require('../../src/models');
      const youtubeStatsModel = new YouTubeVideoStatsModel();
      await youtubeStatsModel.upsert('test_video_123', 1000);

      // Create 5 clicks
      for (let i = 0; i < 5; i++) {
        await TestHelpers.createTestClick(testCampaignLink.id, uuidv4());
      }

      const response = await request(app)
        .get(`/api/analytics/links/${testCampaignLink.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const analytics = response.body.data;
      expect(analytics.video_views).toBe(1000);
      expect(analytics.total_clicks).toBe(5);
      expect(analytics.video_ctr).toBe(0.5); // 5/1000 * 100 = 0.5%
    });

    it('should return 404 for non-existent link', async () => {
      const nonExistentId = uuidv4();
      
      const response = await request(app)
        .get(`/api/analytics/links/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      TestHelpers.expectNotFoundError(response, 'Campaign link');
    });
  });

  describe('GET /api/analytics/links/:linkId/funnel', () => {
    it('should return conversion funnel with no data', async () => {
      const response = await request(app)
        .get(`/api/analytics/links/${testCampaignLink.id}/funnel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      const funnel = response.body.data;
      expect(funnel).toEqual([{
        step: 'clicks',
        count: 0,
        rate: 0
      }]);
    });

    it('should return complete conversion funnel', async () => {
      // Create funnel data: 10 clicks -> 5 signups -> 2 purchases
      const trackingIds = [];
      
      for (let i = 0; i < 10; i++) {
        const trackingId = uuidv4();
        trackingIds.push(trackingId);
        await TestHelpers.createTestClick(testCampaignLink.id, trackingId);
      }
      
      for (let i = 0; i < 5; i++) {
        await TestHelpers.createTestConversion(
          testCampaignLink.id, 
          trackingIds[i], 
          ConversionEventType.NEWSLETTER_SIGNUP
        );
      }
      
      for (let i = 0; i < 2; i++) {
        await TestHelpers.createTestConversion(
          testCampaignLink.id, 
          trackingIds[i], 
          ConversionEventType.PURCHASE
        );
      }

      const response = await request(app)
        .get(`/api/analytics/links/${testCampaignLink.id}/funnel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const funnel = response.body.data;
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
        rate: 50,
        dropOffRate: 50
      });
      
      expect(funnel[2]).toMatchObject({
        step: 'purchase',
        count: 2,
        rate: 20,
        dropOffRate: 60
      });
    });
  });

  describe('GET /api/analytics/links/:linkId/revenue', () => {
    it('should return revenue attribution with no data', async () => {
      const response = await request(app)
        .get(`/api/analytics/links/${testCampaignLink.id}/revenue`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      const attribution = response.body.data;
      expect(attribution).toMatchObject({
        totalRevenue: 0,
        revenueByEventType: [],
        revenueByTimeframe: []
      });
    });

    it('should return revenue attribution with data', async () => {
      const trackingId1 = uuidv4();
      const trackingId2 = uuidv4();
      
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId1);
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId2);
      
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId1, ConversionEventType.PURCHASE);
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId2, ConversionEventType.PURCHASE);

      const response = await request(app)
        .get(`/api/analytics/links/${testCampaignLink.id}/revenue`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const attribution = response.body.data;
      expect(attribution.totalRevenue).toBe(199.98);
      expect(attribution.revenueByEventType).toHaveLength(1);
      expect(attribution.revenueByEventType[0]).toMatchObject({
        eventType: 'purchase',
        revenue: 199.98,
        count: 2,
        averageOrderValue: 99.99
      });
    });
  });

  describe('GET /api/analytics/top-links', () => {
    it('should return top performing links', async () => {
      // Create another campaign and link for comparison
      const campaign2 = await TestHelpers.createTestCampaign({
        name: `Analytics API Test Campaign 2 ${Date.now()}`
      });
      
      const link2 = await TestHelpers.createTestCampaignLink(campaign2.id, {
        landing_page_url: 'https://example.com/analytics-test-2',
        youtube_video_id: 'test_video_2'
      });
      
      // Create different amounts of clicks
      for (let i = 0; i < 3; i++) {
        await TestHelpers.createTestClick(testCampaignLink.id, uuidv4());
      }
      
      for (let i = 0; i < 7; i++) {
        await TestHelpers.createTestClick(link2.id, uuidv4());
      }

      const response = await request(app)
        .get('/api/analytics/top-links')
        .query({ limit: 5, metric: 'clicks' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      const topLinks = response.body.data;
      expect(topLinks).toHaveLength(2);
      expect(topLinks[0].clicks).toBe(7);
      expect(topLinks[0].linkId).toBe(link2.id);
      expect(topLinks[1].clicks).toBe(3);
      expect(topLinks[1].linkId).toBe(testCampaignLink.id);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/analytics/top-links')
        .query({ limit: 'invalid', metric: 'invalid_metric' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/analytics/campaigns/compare', () => {
    it('should compare multiple campaigns', async () => {
      // Create second campaign with data
      const campaign2 = await TestHelpers.createTestCampaign({
        name: `Analytics API Test Campaign 2 ${Date.now()}`
      });
      
      const link2 = await TestHelpers.createTestCampaignLink(campaign2.id);
      
      // Add data to both campaigns
      const trackingId1 = uuidv4();
      const trackingId2 = uuidv4();
      
      await TestHelpers.createTestClick(testCampaignLink.id, trackingId1);
      await TestHelpers.createTestConversion(testCampaignLink.id, trackingId1, ConversionEventType.PURCHASE);
      
      await TestHelpers.createTestClick(link2.id, trackingId2);
      await TestHelpers.createTestClick(link2.id, uuidv4());

      const response = await request(app)
        .post('/api/analytics/campaigns/compare')
        .send({
          campaign_ids: [testCampaign.id, campaign2.id]
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      const comparison = response.body.data;
      expect(comparison).toHaveLength(2);
      
      // Find campaigns in results
      const campaign1Result = comparison.find((c: any) => c.campaignId === testCampaign.id);
      const campaign2Result = comparison.find((c: any) => c.campaignId === campaign2.id);
      
      expect(campaign1Result).toMatchObject({
        campaignId: testCampaign.id,
        totalClicks: 1,
        conversions: 1,
        revenue: 99.99
      });
      
      expect(campaign2Result).toMatchObject({
        campaignId: campaign2.id,
        totalClicks: 2,
        conversions: 0,
        revenue: 0
      });
    });

    it('should validate campaign_ids parameter', async () => {
      const response = await request(app)
        .post('/api/analytics/campaigns/compare')
        .send({})
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should handle empty campaign_ids array', async () => {
      const response = await request(app)
        .post('/api/analytics/campaigns/compare')
        .send({ campaign_ids: [] })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent analytics requests', async () => {
      // Create test data
      for (let i = 0; i < 10; i++) {
        const trackingId = uuidv4();
        await TestHelpers.createTestClick(testCampaignLink.id, trackingId);
        await TestHelpers.createTestConversion(testCampaignLink.id, trackingId, ConversionEventType.NEWSLETTER_SIGNUP);
      }

      // Make concurrent requests
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .get(`/api/analytics/campaigns/${testCampaign.id}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      // All requests should succeed with consistent data
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.total_clicks).toBe(10);
        expect(response.body.data.total_conversions).toBe(10);
      });
    });

    it('should complete analytics queries within reasonable time', async () => {
      // Create substantial test data
      const trackingIds = [];
      for (let i = 0; i < 50; i++) {
        const trackingId = uuidv4();
        trackingIds.push(trackingId);
        await TestHelpers.createTestClick(testCampaignLink.id, trackingId);
      }
      
      for (let i = 0; i < 25; i++) {
        await TestHelpers.createTestConversion(
          testCampaignLink.id, 
          trackingIds[i], 
          ConversionEventType.NEWSLETTER_SIGNUP
        );
      }

      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/analytics/campaigns/${testCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const executionTime = Date.now() - startTime;
      
      expect(response.body.data.total_clicks).toBe(50);
      expect(response.body.data.total_conversions).toBe(25);
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});