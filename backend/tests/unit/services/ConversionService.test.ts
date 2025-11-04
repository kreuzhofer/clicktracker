import { ConversionService } from '../../../src/services/ConversionService';
import { ConversionEventModel } from '../../../src/models/ConversionEvent';
import { ClickEventModel } from '../../../src/models/ClickEvent';
import { CampaignLinkModel } from '../../../src/models/CampaignLink';
import { ConversionEventType, CreateConversionEventRequest } from '../../../src/types';
import { v4 as uuidv4 } from 'uuid';

// Mock the models
jest.mock('../../../src/models/ConversionEvent');
jest.mock('../../../src/models/ClickEvent');
jest.mock('../../../src/models/CampaignLink');

describe('ConversionService', () => {
  let conversionService: ConversionService;
  let mockConversionModel: jest.Mocked<ConversionEventModel>;
  let mockClickModel: jest.Mocked<ClickEventModel>;
  let mockCampaignLinkModel: jest.Mocked<CampaignLinkModel>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create service instance
    conversionService = new ConversionService();
    
    // Get mocked instances
    mockConversionModel = ConversionEventModel.prototype as jest.Mocked<ConversionEventModel>;
    mockClickModel = ClickEventModel.prototype as jest.Mocked<ClickEventModel>;
    mockCampaignLinkModel = CampaignLinkModel.prototype as jest.Mocked<CampaignLinkModel>;
  });

  describe('validateConversion', () => {
    it('should validate newsletter signup conversion', async () => {
      const conversionData: CreateConversionEventRequest = {
        tracking_id: uuidv4(),
        campaign_link_id: uuidv4(),
        event_type: ConversionEventType.NEWSLETTER_SIGNUP,
        event_data: { email: 'test@example.com' }
      };

      const result = await conversionService.validateConversion(conversionData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should validate purchase conversion with revenue', async () => {
      const conversionData: CreateConversionEventRequest = {
        tracking_id: uuidv4(),
        campaign_link_id: uuidv4(),
        event_type: ConversionEventType.PURCHASE,
        revenue_amount: 99.99,
        event_data: { product_id: 'prod_123' }
      };

      const result = await conversionService.validateConversion(conversionData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require revenue for purchase events', async () => {
      const conversionData: CreateConversionEventRequest = {
        tracking_id: uuidv4(),
        campaign_link_id: uuidv4(),
        event_type: ConversionEventType.PURCHASE
      };

      const result = await conversionService.validateConversion(conversionData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Purchase events must include a positive revenue amount');
    });

    it('should warn about high revenue amounts', async () => {
      const conversionData: CreateConversionEventRequest = {
        tracking_id: uuidv4(),
        campaign_link_id: uuidv4(),
        event_type: ConversionEventType.PURCHASE,
        revenue_amount: 15000
      };

      const result = await conversionService.validateConversion(conversionData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Revenue amount is unusually high');
    });

    it('should validate course enrollment with optional revenue', async () => {
      const conversionData: CreateConversionEventRequest = {
        tracking_id: uuidv4(),
        campaign_link_id: uuidv4(),
        event_type: ConversionEventType.COURSE_ENROLLMENT,
        revenue_amount: 299.99,
        event_data: { course_id: 'course_123' }
      };

      const result = await conversionService.validateConversion(conversionData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid event types', async () => {
      const conversionData = {
        tracking_id: uuidv4(),
        campaign_link_id: uuidv4(),
        event_type: 'invalid_type' as ConversionEventType
      };

      const result = await conversionService.validateConversion(conversionData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid event type');
    });

    it('should require tracking ID and campaign link ID', async () => {
      const conversionData = {
        event_type: ConversionEventType.NEWSLETTER_SIGNUP
      } as CreateConversionEventRequest;

      const result = await conversionService.validateConversion(conversionData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tracking ID is required');
      expect(result.errors).toContain('Campaign link ID is required');
    });
  });

  describe('getAttributionData', () => {
    it('should return attribution data within window', async () => {
      const trackingId = uuidv4();
      const campaignLinkId = uuidv4();
      const clickTimestamp = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      const mockClick = {
        id: uuidv4(),
        campaign_link_id: campaignLinkId,
        tracking_id: trackingId,
        clicked_at: clickTimestamp,
        ip_address: '192.168.1.1',
        user_agent: 'Test Agent',
        referrer: 'https://youtube.com'
      };

      const mockConversions = [
        {
          id: uuidv4(),
          tracking_id: trackingId,
          campaign_link_id: campaignLinkId,
          event_type: ConversionEventType.NEWSLETTER_SIGNUP,
          revenue_amount: undefined,
          converted_at: new Date(),
          event_data: {}
        }
      ];

      mockClickModel.findByTrackingId.mockResolvedValue([mockClick]);
      mockConversionModel.findByTrackingId.mockResolvedValue(mockConversions);

      const result = await conversionService.getAttributionData(trackingId);

      expect(result.tracking_id).toBe(trackingId);
      expect(result.campaign_link_id).toBe(campaignLinkId);
      expect(result.is_within_window).toBe(true);
      expect(result.conversion_count).toBe(1);
      expect(result.total_revenue).toBe(0);
      expect(result.attribution_window_days).toBe(30);
    });

    it('should return attribution data outside window', async () => {
      const trackingId = uuidv4();
      const campaignLinkId = uuidv4();
      const clickTimestamp = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago

      const mockClick = {
        id: uuidv4(),
        campaign_link_id: campaignLinkId,
        tracking_id: trackingId,
        clicked_at: clickTimestamp,
        ip_address: '192.168.1.1',
        user_agent: 'Test Agent',
        referrer: 'https://youtube.com'
      };

      mockClickModel.findByTrackingId.mockResolvedValue([mockClick]);
      mockConversionModel.findByTrackingId.mockResolvedValue([]);

      const result = await conversionService.getAttributionData(trackingId);

      expect(result.is_within_window).toBe(false);
      expect(result.conversion_count).toBe(0);
    });

    it('should calculate total revenue correctly', async () => {
      const trackingId = uuidv4();
      const campaignLinkId = uuidv4();

      const mockClick = {
        id: uuidv4(),
        campaign_link_id: campaignLinkId,
        tracking_id: trackingId,
        clicked_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        ip_address: '192.168.1.1',
        user_agent: 'Test Agent',
        referrer: 'https://youtube.com'
      };

      const mockConversions = [
        {
          id: uuidv4(),
          tracking_id: trackingId,
          campaign_link_id: campaignLinkId,
          event_type: ConversionEventType.PURCHASE,
          revenue_amount: 99.99,
          converted_at: new Date(),
          event_data: {}
        },
        {
          id: uuidv4(),
          tracking_id: trackingId,
          campaign_link_id: campaignLinkId,
          event_type: ConversionEventType.COURSE_ENROLLMENT,
          revenue_amount: 299.99,
          converted_at: new Date(),
          event_data: {}
        }
      ];

      mockClickModel.findByTrackingId.mockResolvedValue([mockClick]);
      mockConversionModel.findByTrackingId.mockResolvedValue(mockConversions);

      const result = await conversionService.getAttributionData(trackingId);

      expect(result.total_revenue).toBe(399.98);
      expect(result.conversion_count).toBe(2);
    });

    it('should throw error when no click found', async () => {
      const trackingId = uuidv4();
      mockClickModel.findByTrackingId.mockResolvedValue([]);

      await expect(conversionService.getAttributionData(trackingId))
        .rejects.toThrow('No click event found for tracking ID');
    });
  });

  describe('recordConversion', () => {
    it('should record valid conversion within attribution window', async () => {
      const trackingId = uuidv4();
      const campaignLinkId = uuidv4();
      
      const conversionData: CreateConversionEventRequest = {
        tracking_id: trackingId,
        campaign_link_id: campaignLinkId,
        event_type: ConversionEventType.PURCHASE,
        revenue_amount: 99.99
      };

      const mockClick = {
        id: uuidv4(),
        campaign_link_id: campaignLinkId,
        tracking_id: trackingId,
        clicked_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        ip_address: '192.168.1.1',
        user_agent: 'Test Agent',
        referrer: 'https://youtube.com'
      };

      const mockCampaignLink = {
        id: campaignLinkId,
        campaign_id: uuidv4(),
        short_code: 'abc123',
        landing_page_url: 'https://example.com',
        youtube_video_id: 'dQw4w9WgXcQ',
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockConversion = {
        id: uuidv4(),
        ...conversionData,
        converted_at: new Date()
      };

      mockClickModel.findByTrackingId.mockResolvedValue([mockClick]);
      mockConversionModel.findByTrackingId.mockResolvedValue([]);
      mockCampaignLinkModel.findById.mockResolvedValue(mockCampaignLink);
      mockConversionModel.create.mockResolvedValue(mockConversion);

      const result = await conversionService.recordConversion(conversionData);

      expect(result).toEqual(mockConversion);
      expect(mockConversionModel.create).toHaveBeenCalledWith(conversionData);
    });

    it('should reject conversion outside attribution window', async () => {
      const trackingId = uuidv4();
      const campaignLinkId = uuidv4();
      
      const conversionData: CreateConversionEventRequest = {
        tracking_id: trackingId,
        campaign_link_id: campaignLinkId,
        event_type: ConversionEventType.PURCHASE,
        revenue_amount: 99.99
      };

      const mockClick = {
        id: uuidv4(),
        campaign_link_id: campaignLinkId,
        tracking_id: trackingId,
        clicked_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        ip_address: '192.168.1.1',
        user_agent: 'Test Agent',
        referrer: 'https://youtube.com'
      };

      mockClickModel.findByTrackingId.mockResolvedValue([mockClick]);
      mockConversionModel.findByTrackingId.mockResolvedValue([]);

      await expect(conversionService.recordConversion(conversionData))
        .rejects.toThrow('Conversion is outside the 30-day attribution window');
    });

    it('should reject conversion for non-existent campaign link', async () => {
      const trackingId = uuidv4();
      const campaignLinkId = uuidv4();
      
      const conversionData: CreateConversionEventRequest = {
        tracking_id: trackingId,
        campaign_link_id: campaignLinkId,
        event_type: ConversionEventType.PURCHASE,
        revenue_amount: 99.99
      };

      const mockClick = {
        id: uuidv4(),
        campaign_link_id: campaignLinkId,
        tracking_id: trackingId,
        clicked_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        ip_address: '192.168.1.1',
        user_agent: 'Test Agent',
        referrer: 'https://youtube.com'
      };

      mockClickModel.findByTrackingId.mockResolvedValue([mockClick]);
      mockConversionModel.findByTrackingId.mockResolvedValue([]);
      mockCampaignLinkModel.findById.mockResolvedValue(null);

      await expect(conversionService.recordConversion(conversionData))
        .rejects.toThrow('Campaign link not found');
    });
  });

  describe('generateTrackingScript', () => {
    it('should generate valid JavaScript tracking script', () => {
      const baseUrl = 'https://example.com';
      const script = conversionService.generateTrackingScript(baseUrl);

      expect(script).toContain(baseUrl);
      expect(script).toContain('CampaignTracker');
      expect(script).toContain('trackNewsletterSignup');
      expect(script).toContain('trackPurchase');
      expect(script).toContain('trackCourseEnrollment');
      expect(script).toContain('/api/conversions');
    });

    it('should include proper error handling in script', () => {
      const baseUrl = 'https://example.com';
      const script = conversionService.generateTrackingScript(baseUrl);

      expect(script).toContain('console.warn');
      expect(script).toContain('console.error');
      expect(script).toContain('catch');
    });
  });

  describe('getConversionRate', () => {
    it('should calculate conversion rate correctly', async () => {
      const campaignLinkId = uuidv4();
      
      mockClickModel.countByCampaignLinkId.mockResolvedValue(100);
      mockConversionModel.countByCampaignLinkId.mockResolvedValue(5);

      const rate = await conversionService.getConversionRate(campaignLinkId);

      expect(rate).toBe(5); // 5%
    });

    it('should return 0 when no clicks', async () => {
      const campaignLinkId = uuidv4();
      
      mockClickModel.countByCampaignLinkId.mockResolvedValue(0);

      const rate = await conversionService.getConversionRate(campaignLinkId);

      expect(rate).toBe(0);
    });

    it('should calculate conversion rate for specific event type', async () => {
      const campaignLinkId = uuidv4();
      
      mockClickModel.countByCampaignLinkId.mockResolvedValue(100);
      mockConversionModel.countByEventType.mockResolvedValue(3);

      const rate = await conversionService.getConversionRate(campaignLinkId, ConversionEventType.PURCHASE);

      expect(rate).toBe(3); // 3%
      expect(mockConversionModel.countByEventType).toHaveBeenCalledWith(ConversionEventType.PURCHASE, campaignLinkId);
    });
  });

  describe('testAttributionAccuracy', () => {
    it('should test attribution accuracy across different scenarios', async () => {
      const trackingId = uuidv4();
      const campaignLinkId = uuidv4();

      const mockClick = {
        id: uuidv4(),
        campaign_link_id: campaignLinkId,
        tracking_id: trackingId,
        clicked_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        ip_address: '192.168.1.1',
        user_agent: 'Test Agent',
        referrer: 'https://youtube.com'
      };

      mockClickModel.findByTrackingId.mockResolvedValue([mockClick]);
      mockConversionModel.findByTrackingId.mockResolvedValue([]);

      const testScenarios = [
        {
          conversionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          eventType: ConversionEventType.PURCHASE,
          expectedWithinWindow: true
        },
        {
          conversionDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
          eventType: ConversionEventType.NEWSLETTER_SIGNUP,
          expectedWithinWindow: false
        }
      ];

      const results = await conversionService.testAttributionAccuracy(trackingId, testScenarios);

      expect(results).toHaveLength(2);
      expect(results[0].accuracyCheck).toBe(true);
      // The second scenario should fail because the click is only 10 days old, not 35 days
      // So it's still within the window, making the accuracy check false
      expect(results[1].accuracyCheck).toBe(false);
    });
  });
});