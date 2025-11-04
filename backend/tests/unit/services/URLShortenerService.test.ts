import { URLShortenerService } from '../../../src/services/URLShortenerService';
import { CampaignLinkModel } from '../../../src/models/CampaignLink';
import { ClickEventModel } from '../../../src/models/ClickEvent';
import { TestHelpers } from '../../helpers/testHelpers';
import { v4 as uuidv4 } from 'uuid';

// Mock the models
jest.mock('../../../src/models/CampaignLink');
jest.mock('../../../src/models/ClickEvent');

describe('URLShortenerService', () => {
  let urlShortenerService: URLShortenerService;
  let mockCampaignLinkModel: jest.Mocked<CampaignLinkModel>;
  let mockClickEventModel: jest.Mocked<ClickEventModel>;

  beforeEach(() => {
    jest.clearAllMocks();
    urlShortenerService = new URLShortenerService();
    mockCampaignLinkModel = new CampaignLinkModel() as jest.Mocked<CampaignLinkModel>;
    mockClickEventModel = new ClickEventModel() as jest.Mocked<ClickEventModel>;
    
    // Replace the service's models with mocks
    (urlShortenerService as any).campaignLinkModel = mockCampaignLinkModel;
    (urlShortenerService as any).clickEventModel = mockClickEventModel;
  });

  describe('generateUniqueShortCode', () => {
    it('should generate a unique short code', async () => {
      mockCampaignLinkModel.isShortCodeAvailable.mockResolvedValue(true);

      const shortCode = await urlShortenerService.generateUniqueShortCode();

      expect(shortCode).toHaveLength(8);
      expect(shortCode).toMatch(/^[a-zA-Z0-9]+$/);
      expect(mockCampaignLinkModel.isShortCodeAvailable).toHaveBeenCalledWith(shortCode);
    });

    it('should retry on collision and generate unique code', async () => {
      mockCampaignLinkModel.isShortCodeAvailable
        .mockResolvedValueOnce(false) // First attempt fails
        .mockResolvedValueOnce(false) // Second attempt fails
        .mockResolvedValueOnce(true);  // Third attempt succeeds

      const shortCode = await urlShortenerService.generateUniqueShortCode();

      expect(shortCode).toHaveLength(8);
      expect(mockCampaignLinkModel.isShortCodeAvailable).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts', async () => {
      mockCampaignLinkModel.isShortCodeAvailable.mockResolvedValue(false);

      await expect(urlShortenerService.generateUniqueShortCode(8, 3))
        .rejects.toThrow('Unable to generate unique short code after 3 attempts');
    });

    it('should generate different length codes', async () => {
      mockCampaignLinkModel.isShortCodeAvailable.mockResolvedValue(true);

      const shortCode6 = await urlShortenerService.generateUniqueShortCode(6);
      const shortCode10 = await urlShortenerService.generateUniqueShortCode(10);

      expect(shortCode6).toHaveLength(6);
      expect(shortCode10).toHaveLength(10);
    });
  });

  describe('shortenUrl', () => {
    const mockCampaignLink = {
      id: uuidv4(),
      campaign_id: uuidv4(),
      short_code: 'abc123',
      landing_page_url: 'https://example.com',
      youtube_video_id: 'dQw4w9WgXcQ',
      custom_alias: undefined,
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should create shortened URL with generated short code', async () => {
      mockCampaignLinkModel.isShortCodeAvailable.mockResolvedValue(true);
      mockCampaignLinkModel.create.mockResolvedValue(mockCampaignLink);

      const request = {
        campaignId: uuidv4(),
        landingPageUrl: 'https://example.com',
        youtubeVideoId: 'dQw4w9WgXcQ'
      };

      const result = await urlShortenerService.shortenUrl(request);

      expect(result.campaignLinkId).toBe(mockCampaignLink.id);
      expect(result.landingPageUrl).toBe(request.landingPageUrl);
      expect(result.youtubeVideoId).toBe(request.youtubeVideoId);
      expect(result.shortCode).toMatch(/^[a-zA-Z0-9]+$/);
      expect(result.shortUrl).toContain(result.shortCode);

      expect(mockCampaignLinkModel.create).toHaveBeenCalledWith(request.campaignId, {
        landing_page_url: request.landingPageUrl,
        youtube_video_id: request.youtubeVideoId,
        custom_alias: undefined
      });
    });

    it('should create shortened URL with custom alias', async () => {
      const customAlias = 'my-custom-link';
      mockCampaignLinkModel.isCustomAliasAvailable.mockResolvedValue(true);
      mockCampaignLinkModel.create.mockResolvedValue({
        ...mockCampaignLink,
        short_code: customAlias,
        custom_alias: customAlias
      });

      const request = {
        campaignId: uuidv4(),
        landingPageUrl: 'https://example.com',
        youtubeVideoId: 'dQw4w9WgXcQ',
        customAlias
      };

      const result = await urlShortenerService.shortenUrl(request);

      expect(result.shortCode).toBe(customAlias);
      expect(result.shortUrl).toContain(customAlias);
      expect(mockCampaignLinkModel.isCustomAliasAvailable).toHaveBeenCalledWith(customAlias);
      expect(mockCampaignLinkModel.create).toHaveBeenCalledWith(request.campaignId, {
        landing_page_url: request.landingPageUrl,
        youtube_video_id: request.youtubeVideoId,
        custom_alias: customAlias
      });
    });

    it('should throw error if custom alias is taken', async () => {
      mockCampaignLinkModel.isCustomAliasAvailable.mockResolvedValue(false);

      const request = {
        campaignId: uuidv4(),
        landingPageUrl: 'https://example.com',
        youtubeVideoId: 'dQw4w9WgXcQ',
        customAlias: 'taken-alias'
      };

      await expect(urlShortenerService.shortenUrl(request))
        .rejects.toThrow('Custom alias is already taken');
    });
  });

  describe('handleClick', () => {
    const mockCampaignLink = {
      id: uuidv4(),
      campaign_id: uuidv4(),
      short_code: 'abc123',
      landing_page_url: 'https://example.com',
      youtube_video_id: 'dQw4w9WgXcQ',
      custom_alias: undefined,
      created_at: new Date(),
      updated_at: new Date()
    };

    const mockClickEvent = {
      id: uuidv4(),
      campaign_link_id: mockCampaignLink.id,
      tracking_id: uuidv4(),
      ip_address: '192.168.1.1',
      user_agent: 'Test Agent',
      referrer: 'https://youtube.com',
      clicked_at: new Date()
    };

    it('should handle click and return redirect info', async () => {
      mockCampaignLinkModel.findByShortCode.mockResolvedValue(mockCampaignLink);
      mockClickEventModel.create.mockResolvedValue(mockClickEvent);

      const trackingData = {
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
        referrer: 'https://youtube.com'
      };

      const result = await urlShortenerService.handleClick('abc123', trackingData);

      expect(result.campaignLinkId).toBe(mockCampaignLink.id);
      expect(result.landingPageUrl).toContain('https://example.com');
      expect(result.landingPageUrl).toContain('utm_source=youtube');
      expect(result.landingPageUrl).toContain('tracking_id=');
      expect(result.trackingId).toBeDefined();

      expect(mockCampaignLinkModel.findByShortCode).toHaveBeenCalledWith('abc123');
      expect(mockClickEventModel.create).toHaveBeenCalledWith({
        campaign_link_id: mockCampaignLink.id,
        tracking_id: expect.any(String),
        ip_address: trackingData.ipAddress,
        user_agent: trackingData.userAgent,
        referrer: trackingData.referrer
      });
    });

    it('should find campaign link by custom alias if short code not found', async () => {
      mockCampaignLinkModel.findByShortCode.mockResolvedValue(null);
      mockCampaignLinkModel.findByCustomAlias.mockResolvedValue(mockCampaignLink);
      mockClickEventModel.create.mockResolvedValue(mockClickEvent);

      const result = await urlShortenerService.handleClick('custom-alias', {});

      expect(mockCampaignLinkModel.findByShortCode).toHaveBeenCalledWith('custom-alias');
      expect(mockCampaignLinkModel.findByCustomAlias).toHaveBeenCalledWith('custom-alias');
      expect(result.campaignLinkId).toBe(mockCampaignLink.id);
    });

    it('should throw error if short URL not found', async () => {
      mockCampaignLinkModel.findByShortCode.mockResolvedValue(null);
      mockCampaignLinkModel.findByCustomAlias.mockResolvedValue(null);

      await expect(urlShortenerService.handleClick('nonexistent', {}))
        .rejects.toThrow('Short URL not found');
    });

    it('should add tracking parameters to landing page URL', async () => {
      mockCampaignLinkModel.findByShortCode.mockResolvedValue(mockCampaignLink);
      mockClickEventModel.create.mockResolvedValue(mockClickEvent);

      const result = await urlShortenerService.handleClick('abc123', {});

      const url = new URL(result.landingPageUrl);
      expect(url.searchParams.get('utm_source')).toBe('youtube');
      expect(url.searchParams.get('utm_medium')).toBe('campaign_link');
      expect(url.searchParams.get('utm_campaign')).toBe(mockCampaignLink.id);
      expect(url.searchParams.get('tracking_id')).toBe(result.trackingId);
      expect(url.searchParams.get('click_id')).toBe(result.trackingId);
    });
  });

  describe('URL validation', () => {
    it('should validate valid HTTP URLs', () => {
      expect(urlShortenerService.validateUrl('http://example.com')).toBe(true);
      expect(urlShortenerService.validateUrl('https://example.com')).toBe(true);
      expect(urlShortenerService.validateUrl('https://example.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(urlShortenerService.validateUrl('ftp://example.com')).toBe(false);
      expect(urlShortenerService.validateUrl('not-a-url')).toBe(false);
      expect(urlShortenerService.validateUrl('')).toBe(false);
    });
  });

  describe('YouTube video ID validation', () => {
    it('should validate valid YouTube video IDs', () => {
      expect(urlShortenerService.validateYouTubeVideoId('dQw4w9WgXcQ')).toBe(true);
      expect(urlShortenerService.validateYouTubeVideoId('abc123DEF45')).toBe(true);
      expect(urlShortenerService.validateYouTubeVideoId('_-_-_-_-_-_')).toBe(true);
    });

    it('should reject invalid YouTube video IDs', () => {
      expect(urlShortenerService.validateYouTubeVideoId('short')).toBe(false);
      expect(urlShortenerService.validateYouTubeVideoId('toolongvideoid')).toBe(false);
      expect(urlShortenerService.validateYouTubeVideoId('invalid@chars')).toBe(false);
      expect(urlShortenerService.validateYouTubeVideoId('')).toBe(false);
    });
  });

  describe('YouTube video ID extraction', () => {
    it('should extract video ID from various YouTube URL formats', () => {
      const videoId = 'dQw4w9WgXcQ';
      
      expect(urlShortenerService.extractYouTubeVideoId(`https://youtube.com/watch?v=${videoId}`))
        .toBe(videoId);
      expect(urlShortenerService.extractYouTubeVideoId(`https://www.youtube.com/watch?v=${videoId}&t=30s`))
        .toBe(videoId);
      expect(urlShortenerService.extractYouTubeVideoId(`https://youtu.be/${videoId}`))
        .toBe(videoId);
      expect(urlShortenerService.extractYouTubeVideoId(`https://youtube.com/embed/${videoId}`))
        .toBe(videoId);
      expect(urlShortenerService.extractYouTubeVideoId(`https://youtube.com/v/${videoId}`))
        .toBe(videoId);
    });

    it('should return null for invalid YouTube URLs', () => {
      expect(urlShortenerService.extractYouTubeVideoId('https://example.com')).toBeNull();
      expect(urlShortenerService.extractYouTubeVideoId('not-a-url')).toBeNull();
      expect(urlShortenerService.extractYouTubeVideoId('')).toBeNull();
    });
  });

  describe('batchProcessClicks', () => {
    it('should process multiple clicks in parallel', async () => {
      const mockCampaignLink = {
        id: uuidv4(),
        campaign_id: uuidv4(),
        short_code: 'abc123',
        landing_page_url: 'https://example.com',
        youtube_video_id: 'dQw4w9WgXcQ',
        custom_alias: undefined,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockCampaignLinkModel.findByShortCode.mockResolvedValue(mockCampaignLink);
      mockClickEventModel.create.mockResolvedValue({
        id: uuidv4(),
        campaign_link_id: mockCampaignLink.id,
        tracking_id: uuidv4(),
        ip_address: '192.168.1.1',
        user_agent: 'Test Agent',
        referrer: 'https://youtube.com',
        clicked_at: new Date()
      });

      const clicks = [
        { shortCode: 'abc123', trackingData: { ipAddress: '192.168.1.1' } },
        { shortCode: 'abc123', trackingData: { ipAddress: '192.168.1.2' } },
        { shortCode: 'abc123', trackingData: { ipAddress: '192.168.1.3' } }
      ];

      const results = await urlShortenerService.batchProcessClicks(clicks);

      expect(results).toHaveLength(3);
      expect(results.every(result => !(result instanceof Error))).toBe(true);
      expect(mockClickEventModel.create).toHaveBeenCalledTimes(3);
    });

    it('should handle errors in batch processing', async () => {
      mockCampaignLinkModel.findByShortCode.mockResolvedValue(null);
      mockCampaignLinkModel.findByCustomAlias.mockResolvedValue(null);

      const clicks = [
        { shortCode: 'nonexistent', trackingData: {} }
      ];

      const results = await urlShortenerService.batchProcessClicks(clicks);

      expect(results).toHaveLength(1);
      expect(results[0]).toBeInstanceOf(Error);
      expect((results[0] as Error).message).toBe('Short URL not found');
    });
  });

  describe('getClickStats', () => {
    it('should return click statistics', async () => {
      const campaignLinkId = uuidv4();
      
      mockClickEventModel.countByCampaignLinkId.mockResolvedValue(100);
      mockClickEventModel.countUniqueByCampaignLinkId.mockResolvedValue(75);
      mockClickEventModel.getClicksByHour.mockResolvedValue([
        { hour: '2023-01-01 12:00:00', clicks: 10 },
        { hour: '2023-01-01 13:00:00', clicks: 15 }
      ]);
      mockClickEventModel.getTopReferrers.mockResolvedValue([
        { referrer: 'https://youtube.com', clicks: 50 },
        { referrer: 'Direct', clicks: 25 }
      ]);

      const stats = await urlShortenerService.getClickStats(campaignLinkId);

      expect(stats).toEqual({
        totalClicks: 100,
        uniqueClicks: 75,
        recentClicks: [
          { hour: '2023-01-01 12:00:00', clicks: 10 },
          { hour: '2023-01-01 13:00:00', clicks: 15 }
        ],
        topReferrers: [
          { referrer: 'https://youtube.com', clicks: 50 },
          { referrer: 'Direct', clicks: 25 }
        ]
      });
    });
  });

  describe('cleanupOldClicks', () => {
    it('should clean up old click events', async () => {
      mockClickEventModel.deleteOldEvents.mockResolvedValue(50);

      const deletedCount = await urlShortenerService.cleanupOldClicks(90);

      expect(deletedCount).toBe(50);
      expect(mockClickEventModel.deleteOldEvents).toHaveBeenCalledWith(90);
    });
  });
});