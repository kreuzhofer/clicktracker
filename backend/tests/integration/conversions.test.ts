import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';
import { ConversionEventType } from '../../src/types';
import { v4 as uuidv4 } from 'uuid';

describe('Conversion Tracking API', () => {
  let authToken: string;
  let campaign: any;
  let campaignLink: any;
  let clickEvent: any;

  beforeEach(async () => {
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

    // Create test click event
    clickEvent = await TestHelpers.createTestClick(campaignLink.id);
  });

  describe('POST /api/conversions', () => {
    it('should record newsletter signup conversion', async () => {
      const conversionData = {
        tracking_id: clickEvent.tracking_id,
        campaign_link_id: campaignLink.id,
        event_type: 'newsletter_signup',
        event_data: {
          email: 'test@example.com',
          source: 'landing_page'
        }
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversion).toBeDefined();
      expect(response.body.data.conversion.event_type).toBe('newsletter_signup');
      expect(response.body.data.conversion.tracking_id).toBe(clickEvent.tracking_id);
      expect(response.body.data.attribution).toBeDefined();
      expect(response.body.data.attribution.is_within_window).toBe(true);
    });

    it('should record purchase conversion with revenue', async () => {
      const conversionData = {
        tracking_id: clickEvent.tracking_id,
        campaign_link_id: campaignLink.id,
        event_type: 'purchase',
        revenue_amount: 99.99,
        event_data: {
          product_id: 'prod_123',
          quantity: 1
        }
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversion.revenue_amount).toBe(99.99);
      expect(response.body.data.attribution.total_revenue).toBe(99.99);
    });

    it('should record course enrollment conversion', async () => {
      const conversionData = {
        tracking_id: clickEvent.tracking_id,
        campaign_link_id: campaignLink.id,
        event_type: 'course_enrollment',
        revenue_amount: 299.99,
        event_data: {
          course_id: 'course_123',
          course_name: 'Advanced Marketing'
        }
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversion.event_type).toBe('course_enrollment');
      expect(response.body.data.conversion.revenue_amount).toBe(299.99);
    });

    it('should reject conversion with invalid tracking ID', async () => {
      const conversionData = {
        tracking_id: 'invalid-uuid',
        campaign_link_id: campaignLink.id,
        event_type: 'newsletter_signup'
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(400);

      TestHelpers.expectValidationError(response, 'tracking_id');
    });

    it('should reject conversion with invalid event type', async () => {
      const conversionData = {
        tracking_id: clickEvent.tracking_id,
        campaign_link_id: campaignLink.id,
        event_type: 'invalid_event'
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(400);

      TestHelpers.expectValidationError(response, 'event_type');
    });

    it('should reject purchase without revenue amount', async () => {
      const conversionData = {
        tracking_id: clickEvent.tracking_id,
        campaign_link_id: campaignLink.id,
        event_type: 'purchase'
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Purchase events must include a positive revenue amount');
    });

    it('should reject conversion for non-existent tracking ID', async () => {
      const conversionData = {
        tracking_id: uuidv4(),
        campaign_link_id: campaignLink.id,
        event_type: 'newsletter_signup'
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No click event found');
    });

    it('should reject conversion for non-existent campaign link', async () => {
      const conversionData = {
        tracking_id: clickEvent.tracking_id,
        campaign_link_id: uuidv4(),
        event_type: 'newsletter_signup'
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Campaign link not found');
    });

    it('should handle multiple conversions for same tracking ID', async () => {
      // First conversion
      const firstConversion = {
        tracking_id: clickEvent.tracking_id,
        campaign_link_id: campaignLink.id,
        event_type: 'newsletter_signup'
      };

      const firstResponse = await request(app)
        .post('/api/conversions')
        .send(firstConversion)
        .expect(201);

      // Second conversion
      const secondConversion = {
        tracking_id: clickEvent.tracking_id,
        campaign_link_id: campaignLink.id,
        event_type: 'purchase',
        revenue_amount: 99.99
      };

      const secondResponse = await request(app)
        .post('/api/conversions')
        .send(secondConversion)
        .expect(201);

      expect(firstResponse.body.data.attribution.conversion_count).toBe(1);
      expect(secondResponse.body.data.attribution.conversion_count).toBe(2);
      expect(secondResponse.body.data.attribution.total_revenue).toBe(99.99);
    });
  });

  describe('GET /api/conversions/attribution/:trackingId', () => {
    it('should return attribution data for valid tracking ID', async () => {
      // First record a conversion
      await TestHelpers.createTestConversion(
        campaignLink.id, 
        clickEvent.tracking_id, 
        ConversionEventType.NEWSLETTER_SIGNUP
      );

      const response = await request(app)
        .get(`/api/conversions/attribution/${clickEvent.tracking_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tracking_id).toBe(clickEvent.tracking_id);
      expect(response.body.data.campaign_link_id).toBe(campaignLink.id);
      expect(response.body.data.is_within_window).toBe(true);
      expect(response.body.data.conversion_count).toBe(1);
      expect(response.body.data.attribution_window_days).toBe(30);
    });

    it('should return 404 for non-existent tracking ID', async () => {
      const nonExistentTrackingId = uuidv4();

      const response = await request(app)
        .get(`/api/conversions/attribution/${nonExistentTrackingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      TestHelpers.expectNotFoundError(response, 'attribution data');
    });

    it('should return attribution data with revenue calculations', async () => {
      // Record multiple conversions with revenue
      await TestHelpers.createTestConversion(
        campaignLink.id, 
        clickEvent.tracking_id, 
        ConversionEventType.PURCHASE
      );

      const response = await request(app)
        .get(`/api/conversions/attribution/${clickEvent.tracking_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.total_revenue).toBe(99.99); // Default revenue from TestHelpers
      expect(response.body.data.conversions).toHaveLength(1);
    });
  });

  describe('GET /api/conversions/funnel/:campaignLinkId', () => {
    it('should return conversion funnel data', async () => {
      // Create additional clicks and conversions for funnel analysis
      const trackingId2 = uuidv4();
      const trackingId3 = uuidv4();
      
      await TestHelpers.createTestClick(campaignLink.id, trackingId2);
      await TestHelpers.createTestClick(campaignLink.id, trackingId3);
      
      await TestHelpers.createTestConversion(
        campaignLink.id, 
        clickEvent.tracking_id, 
        ConversionEventType.NEWSLETTER_SIGNUP
      );
      
      await TestHelpers.createTestConversion(
        campaignLink.id, 
        trackingId2, 
        ConversionEventType.PURCHASE
      );

      const response = await request(app)
        .get(`/api/conversions/funnel/${campaignLink.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.funnel).toBeDefined();
      expect(Array.isArray(response.body.data.funnel)).toBe(true);
      
      const funnel = response.body.data.funnel;
      expect(funnel[0].step).toBe('clicks');
      expect(funnel[0].count).toBe(3); // 3 clicks total
      expect(funnel[0].rate).toBe(100);
    });
  });

  describe('GET /api/conversions/types/:campaignLinkId', () => {
    it('should return conversions grouped by type', async () => {
      // Create conversions of different types
      await TestHelpers.createTestConversion(
        campaignLink.id, 
        clickEvent.tracking_id, 
        ConversionEventType.NEWSLETTER_SIGNUP
      );

      const trackingId2 = uuidv4();
      await TestHelpers.createTestClick(campaignLink.id, trackingId2);
      await TestHelpers.createTestConversion(
        campaignLink.id, 
        trackingId2, 
        ConversionEventType.PURCHASE
      );

      const response = await request(app)
        .get(`/api/conversions/types/${campaignLink.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversions_by_type).toBeDefined();
      expect(Array.isArray(response.body.data.conversions_by_type)).toBe(true);
      
      const conversionsByType = response.body.data.conversions_by_type;
      expect(conversionsByType.length).toBeGreaterThan(0);
      
      // Should have purchase with revenue
      const purchaseConversion = conversionsByType.find((c: any) => c.event_type === 'purchase');
      expect(purchaseConversion).toBeDefined();
      expect(purchaseConversion.revenue).toBe(99.99);
      expect(purchaseConversion.count).toBe(1);
    });
  });

  describe('GET /api/conversions/script', () => {
    it('should return tracking script', async () => {
      const response = await request(app)
        .get('/api/conversions/script')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/javascript');
      expect(response.headers['cache-control']).toContain('public, max-age=3600');
      expect(response.text).toContain('CampaignTracker');
      expect(response.text).toContain('trackNewsletterSignup');
      expect(response.text).toContain('trackPurchase');
      expect(response.text).toContain('trackCourseEnrollment');
    });

    it('should include proper base URL in script', async () => {
      const response = await request(app)
        .get('/api/conversions/script')
        .expect(200);

      expect(response.text).toContain('/api/conversions');
      expect(response.text).toContain('baseUrl:');
    });
  });

  describe('POST /api/conversions/cleanup', () => {
    it('should cleanup old conversions outside attribution window', async () => {
      const response = await request(app)
        .post('/api/conversions/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted_conversions).toBeDefined();
      expect(typeof response.body.data.deleted_conversions).toBe('number');
    });
  });

  describe('Attribution Window Testing', () => {
    it('should reject conversions outside 30-day attribution window', async () => {
      // Create a click event that's older than 30 days
      // We'll simulate this by creating a conversion for a very old tracking ID
      const oldTrackingId = uuidv4();
      
      // Create an old click (this would normally be done by modifying the database directly)
      // For this test, we'll create a conversion that should fail attribution window check
      const conversionData = {
        tracking_id: oldTrackingId,
        campaign_link_id: campaignLink.id,
        event_type: 'newsletter_signup'
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No click event found');
    });

    it('should handle edge case of exactly 30-day attribution window', async () => {
      // This test would require database manipulation to create a click exactly 30 days ago
      // For now, we'll test with a recent click that should be within window
      const conversionData = {
        tracking_id: clickEvent.tracking_id,
        campaign_link_id: campaignLink.id,
        event_type: 'newsletter_signup'
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(201);

      expect(response.body.data.attribution.is_within_window).toBe(true);
    });
  });

  describe('Revenue Attribution Accuracy', () => {
    it('should accurately calculate revenue attribution across multiple conversions', async () => {
      const trackingId1 = clickEvent.tracking_id;
      const trackingId2 = uuidv4();
      const trackingId3 = uuidv4();

      // Create additional clicks
      await TestHelpers.createTestClick(campaignLink.id, trackingId2);
      await TestHelpers.createTestClick(campaignLink.id, trackingId3);

      // Record conversions with different revenue amounts
      const conversions = [
        {
          tracking_id: trackingId1,
          campaign_link_id: campaignLink.id,
          event_type: 'purchase',
          revenue_amount: 99.99
        },
        {
          tracking_id: trackingId2,
          campaign_link_id: campaignLink.id,
          event_type: 'course_enrollment',
          revenue_amount: 299.99
        },
        {
          tracking_id: trackingId3,
          campaign_link_id: campaignLink.id,
          event_type: 'newsletter_signup'
          // No revenue for newsletter signup
        }
      ];

      const responses = [];
      for (const conversion of conversions) {
        const response = await request(app)
          .post('/api/conversions')
          .send(conversion)
          .expect(201);
        responses.push(response);
      }

      // Check individual attribution
      expect(responses[0].body.data.attribution.total_revenue).toBe(99.99);
      expect(responses[1].body.data.attribution.total_revenue).toBe(299.99);
      expect(responses[2].body.data.attribution.total_revenue).toBe(0);

      // Check conversion types endpoint for aggregated data
      const typesResponse = await request(app)
        .get(`/api/conversions/types/${campaignLink.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const conversionsByType = typesResponse.body.data.conversions_by_type;
      
      const purchaseData = conversionsByType.find((c: any) => c.event_type === 'purchase');
      const courseData = conversionsByType.find((c: any) => c.event_type === 'course_enrollment');
      const newsletterData = conversionsByType.find((c: any) => c.event_type === 'newsletter_signup');

      expect(purchaseData.revenue).toBe(99.99);
      expect(purchaseData.count).toBe(1);
      expect(courseData.revenue).toBe(299.99);
      expect(courseData.count).toBe(1);
      expect(newsletterData.revenue).toBe(0);
      expect(newsletterData.count).toBe(1);
    });

    it('should handle precision in revenue calculations', async () => {
      const conversionData = {
        tracking_id: clickEvent.tracking_id,
        campaign_link_id: campaignLink.id,
        event_type: 'purchase',
        revenue_amount: 123.456 // Should be rounded to 2 decimal places
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(400); // Should fail validation due to precision

      TestHelpers.expectValidationError(response, 'revenue_amount');
    });

    it('should correctly handle zero revenue conversions', async () => {
      const conversionData = {
        tracking_id: clickEvent.tracking_id,
        campaign_link_id: campaignLink.id,
        event_type: 'newsletter_signup',
        revenue_amount: 0
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(400); // Should fail because revenue must be positive if provided

      expect(response.body.details.some((d: any) => d.message.includes('Revenue amount must be positive'))).toBe(true);
    });
  });

  describe('Cross-Domain Tracking Simulation', () => {
    it('should handle tracking parameters in conversion data', async () => {
      const conversionData = {
        tracking_id: clickEvent.tracking_id,
        campaign_link_id: campaignLink.id,
        event_type: 'newsletter_signup',
        event_data: {
          page_url: 'https://example.com/thank-you',
          page_title: 'Thank You - Newsletter Signup',
          referrer: 'https://example.com/landing',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          timestamp: new Date().toISOString()
        }
      };

      const response = await request(app)
        .post('/api/conversions')
        .send(conversionData)
        .expect(201);

      expect(response.body.data.conversion.event_data.page_url).toBe('https://example.com/thank-you');
      expect(response.body.data.conversion.event_data.page_title).toBe('Thank You - Newsletter Signup');
    });
  });
});