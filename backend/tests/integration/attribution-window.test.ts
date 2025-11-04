import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';
import { ConversionEventModel } from '../../src/models/ConversionEvent';
import { ClickEventModel } from '../../src/models/ClickEvent';
import { ConversionEventType } from '../../src/types';
import { v4 as uuidv4 } from 'uuid';
import Database from '../../src/config/database';

describe('Attribution Window and Data Retention', () => {
  let authToken: string;
  let campaign: any;
  let campaignLink: any;
  let db: Database;
  let conversionModel: ConversionEventModel;
  let clickModel: ClickEventModel;

  beforeEach(async () => {
    db = Database.getInstance();
    conversionModel = new ConversionEventModel();
    clickModel = new ClickEventModel();

    // Create test user and get auth token
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const userEmail = `test-${timestamp}-${randomId}@example.com`;
    
    await TestHelpers.createTestUser({ email: userEmail });
    authToken = await TestHelpers.loginTestUser(userEmail);

    // Create test campaign and campaign link
    campaign = await TestHelpers.createTestCampaign({
      name: `Test Campaign ${timestamp}-${randomId}`
    });
    
    campaignLink = await TestHelpers.createTestCampaignLink(campaign.id, {
      landing_page_url: 'https://example.com/landing',
      youtube_video_id: 'dQw4w9WgXcQ'
    });
  });

  describe('30-Day Attribution Window', () => {
    it('should accept conversions within 30-day window', async () => {
      // Create a click event
      const trackingId = uuidv4();
      const clickEvent = await TestHelpers.createTestClick(campaignLink.id, trackingId);

      // Record conversion immediately (within window)
      const conversionData = {
        tracking_id: trackingId,
        campaign_link_id: campaignLink.id,
        event_type: 'newsletter_signup'
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(201);

      expect(response.body.data.attribution.is_within_window).toBe(true);
      expect(response.body.data.attribution.attribution_window_days).toBe(30);
    });

    it('should reject conversions outside 30-day window', async () => {
      // Create a click event that's older than 30 days by directly manipulating the database
      const trackingId = uuidv4();
      const oldClickDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago

      // Insert old click directly into database
      await db.query(`
        INSERT INTO click_events (campaign_link_id, tracking_id, ip_address, user_agent, referrer, clicked_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [campaignLink.id, trackingId, '192.168.1.1', 'Test Agent', 'https://youtube.com', oldClickDate]);

      // Try to record conversion (should fail)
      const conversionData = {
        tracking_id: trackingId,
        campaign_link_id: campaignLink.id,
        event_type: 'newsletter_signup'
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('outside the 30-day attribution window');
    });

    it('should handle edge case of exactly 30-day attribution window', async () => {
      // Create a click event exactly 30 days ago
      const trackingId = uuidv4();
      const exactlyThirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Insert click directly into database
      await db.query(`
        INSERT INTO click_events (campaign_link_id, tracking_id, ip_address, user_agent, referrer, clicked_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [campaignLink.id, trackingId, '192.168.1.1', 'Test Agent', 'https://youtube.com', exactlyThirtyDaysAgo]);

      // Try to record conversion (should succeed as it's exactly 30 days)
      const conversionData = {
        tracking_id: trackingId,
        campaign_link_id: campaignLink.id,
        event_type: 'newsletter_signup'
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(201);

      expect(response.body.data.attribution.is_within_window).toBe(true);
    });

    it('should calculate attribution window correctly for multiple time zones', async () => {
      // Test with different time scenarios
      const testScenarios = [
        { daysAgo: 1, shouldBeWithinWindow: true },
        { daysAgo: 15, shouldBeWithinWindow: true },
        { daysAgo: 29, shouldBeWithinWindow: true },
        { daysAgo: 30, shouldBeWithinWindow: true },
        { daysAgo: 31, shouldBeWithinWindow: false },
        { daysAgo: 45, shouldBeWithinWindow: false }
      ];

      for (const scenario of testScenarios) {
        const trackingId = uuidv4();
        const clickDate = new Date(Date.now() - scenario.daysAgo * 24 * 60 * 60 * 1000);

        // Insert click directly into database
        await db.query(`
          INSERT INTO click_events (campaign_link_id, tracking_id, ip_address, user_agent, referrer, clicked_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [campaignLink.id, trackingId, '192.168.1.1', 'Test Agent', 'https://youtube.com', clickDate]);

        // Check attribution data
        const response = await request(app)
          .get(`/api/conversions/attribution/${trackingId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.is_within_window).toBe(scenario.shouldBeWithinWindow);
      }
    });
  });

  describe('Attribution Window Cleanup', () => {
    it('should cleanup conversions outside attribution window', async () => {
      // Create old clicks and conversions
      const oldTrackingIds = [];
      const recentTrackingIds = [];

      // Create old clicks (35 days ago)
      for (let i = 0; i < 3; i++) {
        const trackingId = uuidv4();
        const oldClickDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
        
        await db.query(`
          INSERT INTO click_events (campaign_link_id, tracking_id, ip_address, user_agent, referrer, clicked_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [campaignLink.id, trackingId, '192.168.1.1', 'Test Agent', 'https://youtube.com', oldClickDate]);

        // Create conversions for old clicks
        await db.query(`
          INSERT INTO conversion_events (tracking_id, campaign_link_id, event_type, revenue_amount)
          VALUES ($1, $2, $3, $4)
        `, [trackingId, campaignLink.id, 'newsletter_signup', null]);

        oldTrackingIds.push(trackingId);
      }

      // Create recent clicks (5 days ago)
      for (let i = 0; i < 2; i++) {
        const trackingId = uuidv4();
        const recentClickDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        
        await db.query(`
          INSERT INTO click_events (campaign_link_id, tracking_id, ip_address, user_agent, referrer, clicked_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [campaignLink.id, trackingId, '192.168.1.1', 'Test Agent', 'https://youtube.com', recentClickDate]);

        // Create conversions for recent clicks
        await db.query(`
          INSERT INTO conversion_events (tracking_id, campaign_link_id, event_type, revenue_amount)
          VALUES ($1, $2, $3, $4)
        `, [trackingId, campaignLink.id, 'purchase', 99.99]);

        recentTrackingIds.push(trackingId);
      }

      // Count conversions before cleanup
      const beforeCleanup = await db.query('SELECT COUNT(*) as count FROM conversion_events');
      expect(parseInt(beforeCleanup.rows[0].count)).toBe(5);

      // Run cleanup
      const cleanupResponse = await request(app)
        .post('/api/conversions/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cleanupResponse.body.data.deleted_conversions).toBe(3);

      // Count conversions after cleanup
      const afterCleanup = await db.query('SELECT COUNT(*) as count FROM conversion_events');
      expect(parseInt(afterCleanup.rows[0].count)).toBe(2);

      // Verify only recent conversions remain
      for (const trackingId of recentTrackingIds) {
        const conversions = await conversionModel.findByTrackingId(trackingId);
        expect(conversions.length).toBe(1);
      }

      // Verify old conversions are gone
      for (const trackingId of oldTrackingIds) {
        const conversions = await conversionModel.findByTrackingId(trackingId);
        expect(conversions.length).toBe(0);
      }
    });

    it('should preserve click events during conversion cleanup', async () => {
      // Create old click and conversion
      const trackingId = uuidv4();
      const oldClickDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      
      await db.query(`
        INSERT INTO click_events (campaign_link_id, tracking_id, ip_address, user_agent, referrer, clicked_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [campaignLink.id, trackingId, '192.168.1.1', 'Test Agent', 'https://youtube.com', oldClickDate]);

      await db.query(`
        INSERT INTO conversion_events (tracking_id, campaign_link_id, event_type)
        VALUES ($1, $2, $3)
      `, [trackingId, campaignLink.id, 'newsletter_signup']);

      // Count clicks before cleanup
      const beforeCleanup = await db.query('SELECT COUNT(*) as count FROM click_events WHERE tracking_id = $1', [trackingId]);
      expect(parseInt(beforeCleanup.rows[0].count)).toBe(1);

      // Run cleanup
      await request(app)
        .post('/api/conversions/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify click event still exists
      const afterCleanup = await db.query('SELECT COUNT(*) as count FROM click_events WHERE tracking_id = $1', [trackingId]);
      expect(parseInt(afterCleanup.rows[0].count)).toBe(1);

      // Verify conversion is gone
      const conversions = await conversionModel.findByTrackingId(trackingId);
      expect(conversions.length).toBe(0);
    });
  });

  describe('Data Retention Verification', () => {
    it('should maintain data integrity during cleanup operations', async () => {
      // Create a complex scenario with multiple campaigns, links, and conversions
      const campaign2 = await TestHelpers.createTestCampaign({
        name: `Test Campaign 2 ${Date.now()}`
      });
      
      const campaignLink2 = await TestHelpers.createTestCampaignLink(campaign2.id, {
        landing_page_url: 'https://example.com/landing2',
        youtube_video_id: 'dQw4w9WgXcQ'
      });

      // Create data for both campaigns
      const scenarios = [
        { campaignLinkId: campaignLink.id, daysAgo: 35, shouldBeDeleted: true },
        { campaignLinkId: campaignLink.id, daysAgo: 5, shouldBeDeleted: false },
        { campaignLinkId: campaignLink2.id, daysAgo: 40, shouldBeDeleted: true },
        { campaignLinkId: campaignLink2.id, daysAgo: 10, shouldBeDeleted: false }
      ];

      const trackingIds = [];

      for (const scenario of scenarios) {
        const trackingId = uuidv4();
        const clickDate = new Date(Date.now() - scenario.daysAgo * 24 * 60 * 60 * 1000);
        
        // Create click
        await db.query(`
          INSERT INTO click_events (campaign_link_id, tracking_id, ip_address, user_agent, referrer, clicked_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [scenario.campaignLinkId, trackingId, '192.168.1.1', 'Test Agent', 'https://youtube.com', clickDate]);

        // Create conversion
        await db.query(`
          INSERT INTO conversion_events (tracking_id, campaign_link_id, event_type, revenue_amount)
          VALUES ($1, $2, $3, $4)
        `, [trackingId, scenario.campaignLinkId, 'purchase', 99.99]);

        trackingIds.push({ trackingId, ...scenario });
      }

      // Run cleanup
      const cleanupResponse = await request(app)
        .post('/api/conversions/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cleanupResponse.body.data.deleted_conversions).toBe(2);

      // Verify data integrity
      for (const scenario of trackingIds) {
        const conversions = await conversionModel.findByTrackingId(scenario.trackingId);
        
        if (scenario.shouldBeDeleted) {
          expect(conversions.length).toBe(0);
        } else {
          expect(conversions.length).toBe(1);
          expect(conversions[0].campaign_link_id).toBe(scenario.campaignLinkId);
        }

        // Click events should always remain
        const clicks = await clickModel.findByTrackingId(scenario.trackingId);
        expect(clicks.length).toBe(1);
      }
    });

    it('should handle cleanup with no data to clean', async () => {
      // Create only recent data (within window)
      const trackingId = uuidv4();
      const recentClick = await TestHelpers.createTestClick(campaignLink.id, trackingId);
      await TestHelpers.createTestConversion(campaignLink.id, trackingId, ConversionEventType.NEWSLETTER_SIGNUP);

      // Run cleanup
      const cleanupResponse = await request(app)
        .post('/api/conversions/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cleanupResponse.body.data.deleted_conversions).toBe(0);

      // Verify data is preserved
      const conversions = await conversionModel.findByTrackingId(trackingId);
      expect(conversions.length).toBe(1);
    });

    it('should handle cleanup with large datasets efficiently', async () => {
      // Create a large number of old conversions
      const batchSize = 50;
      const trackingIds = [];

      for (let i = 0; i < batchSize; i++) {
        const trackingId = uuidv4();
        const oldClickDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
        
        await db.query(`
          INSERT INTO click_events (campaign_link_id, tracking_id, ip_address, user_agent, referrer, clicked_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [campaignLink.id, trackingId, '192.168.1.1', 'Test Agent', 'https://youtube.com', oldClickDate]);

        await db.query(`
          INSERT INTO conversion_events (tracking_id, campaign_link_id, event_type)
          VALUES ($1, $2, $3)
        `, [trackingId, campaignLink.id, 'newsletter_signup']);

        trackingIds.push(trackingId);
      }

      // Measure cleanup performance
      const startTime = Date.now();
      
      const cleanupResponse = await request(app)
        .post('/api/conversions/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const cleanupTime = Date.now() - startTime;

      expect(cleanupResponse.body.data.deleted_conversions).toBe(batchSize);
      
      // Cleanup should complete within reasonable time (under 5 seconds)
      expect(cleanupTime).toBeLessThan(5000);

      // Verify all conversions are cleaned up
      const remainingConversions = await db.query('SELECT COUNT(*) as count FROM conversion_events');
      expect(parseInt(remainingConversions.rows[0].count)).toBe(0);
    });
  });

  describe('Attribution Accuracy Testing', () => {
    it('should accurately track attribution across different user journeys', async () => {
      // Scenario 1: Simple conversion path
      const journey1 = {
        trackingId: uuidv4(),
        clickDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        conversions: [
          { eventType: 'newsletter_signup', delay: 1 }, // 1 day after click
          { eventType: 'purchase', delay: 2, revenue: 99.99 } // 2 days after click
        ]
      };

      // Scenario 2: Long conversion path
      const journey2 = {
        trackingId: uuidv4(),
        clickDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
        conversions: [
          { eventType: 'newsletter_signup', delay: 5 }, // 5 days after click
          { eventType: 'course_enrollment', delay: 20, revenue: 299.99 } // 20 days after click
        ]
      };

      // Scenario 3: Edge case - conversion at window boundary
      const journey3 = {
        trackingId: uuidv4(),
        clickDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        conversions: [
          { eventType: 'purchase', delay: 0, revenue: 199.99 } // Same day as click
        ]
      };

      const journeys = [journey1, journey2, journey3];

      // Create clicks and conversions for each journey
      for (const journey of journeys) {
        // Create click
        await db.query(`
          INSERT INTO click_events (campaign_link_id, tracking_id, ip_address, user_agent, referrer, clicked_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [campaignLink.id, journey.trackingId, '192.168.1.1', 'Test Agent', 'https://youtube.com', journey.clickDate]);

        // Create conversions
        for (const conversion of journey.conversions) {
          const conversionDate = new Date(journey.clickDate.getTime() + conversion.delay * 24 * 60 * 60 * 1000);
          
          await db.query(`
            INSERT INTO conversion_events (tracking_id, campaign_link_id, event_type, revenue_amount, converted_at)
            VALUES ($1, $2, $3, $4, $5)
          `, [journey.trackingId, campaignLink.id, conversion.eventType, conversion.revenue || null, conversionDate]);
        }
      }

      // Test attribution accuracy for each journey
      for (const journey of journeys) {
        const response = await request(app)
          .get(`/api/conversions/attribution/${journey.trackingId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const attribution = response.body.data;
        
        expect(attribution.tracking_id).toBe(journey.trackingId);
        expect(attribution.conversion_count).toBe(journey.conversions.length);
        expect(attribution.is_within_window).toBe(true); // All should be within window
        
        const expectedRevenue = journey.conversions.reduce((sum, c) => sum + (c.revenue || 0), 0);
        expect(attribution.total_revenue).toBe(expectedRevenue);
      }
    });

    it('should handle complex attribution scenarios with multiple touchpoints', async () => {
      // Create multiple clicks for the same user (same tracking ID)
      const trackingId = uuidv4();
      const clickDates = [
        new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),  // 8 days ago
        new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)   // 5 days ago
      ];

      // Create multiple clicks (user clicked multiple times)
      for (const clickDate of clickDates) {
        await db.query(`
          INSERT INTO click_events (campaign_link_id, tracking_id, ip_address, user_agent, referrer, clicked_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [campaignLink.id, trackingId, '192.168.1.1', 'Test Agent', 'https://youtube.com', clickDate]);
      }

      // Create conversion after last click
      await db.query(`
        INSERT INTO conversion_events (tracking_id, campaign_link_id, event_type, revenue_amount)
        VALUES ($1, $2, $3, $4)
      `, [trackingId, campaignLink.id, 'purchase', 149.99]);

      // Test attribution
      const response = await request(app)
        .get(`/api/conversions/attribution/${trackingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const attribution = response.body.data;
      
      expect(attribution.tracking_id).toBe(trackingId);
      expect(attribution.conversion_count).toBe(1);
      expect(attribution.total_revenue).toBe(149.99);
      expect(attribution.is_within_window).toBe(true);
      
      // Should use the most recent click for attribution window calculation
      const daysSinceFirstClick = Math.floor((Date.now() - clickDates[0].getTime()) / (1000 * 60 * 60 * 24));
      expect(daysSinceFirstClick).toBeGreaterThan(5);
    });
  });
});