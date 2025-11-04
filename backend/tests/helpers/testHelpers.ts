import request from 'supertest';
import app from '../../src/index';
import { CampaignModel, CampaignLinkModel, ClickEventModel, ConversionEventModel } from '../../src/models';
import { CreateCampaignRequest, CreateCampaignLinkRequest, ConversionEventType } from '../../src/types';
import { v4 as uuidv4 } from 'uuid';

export class TestHelpers {
  static campaignModel = new CampaignModel();
  static campaignLinkModel = new CampaignLinkModel();
  static clickEventModel = new ClickEventModel();
  static conversionEventModel = new ConversionEventModel();

  // Authentication helpers
  static async createTestUser(userData = {}) {
    const defaultUser = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      first_name: 'Test',
      last_name: 'User'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...defaultUser, ...userData });

    return response.body;
  }

  static async loginTestUser(email = 'test@example.com', password = 'TestPassword123!') {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    return response.body.token;
  }

  // Campaign helpers
  static async createTestCampaign(campaignData: Partial<CreateCampaignRequest> = {}) {
    const defaultCampaign: CreateCampaignRequest = {
      name: `Test Campaign ${Date.now()}`,
      description: 'Test campaign description',
      tags: ['test', 'automation']
    };

    return await this.campaignModel.create({ ...defaultCampaign, ...campaignData });
  }

  static async createTestCampaignLink(campaignId: string, linkData: Partial<CreateCampaignLinkRequest> = {}) {
    const defaultLink: CreateCampaignLinkRequest = {
      landing_page_url: 'https://example.com/landing',
      youtube_video_id: 'dQw4w9WgXcQ',
      custom_alias: `test-alias-${Date.now()}`
    };

    return await this.campaignLinkModel.create(campaignId, { ...defaultLink, ...linkData });
  }

  // Click and conversion helpers
  static async createTestClick(campaignLinkId: string, trackingId?: string) {
    const clickData = {
      campaign_link_id: campaignLinkId,
      tracking_id: trackingId || uuidv4(),
      ip_address: '192.168.1.1',
      user_agent: 'Test User Agent',
      referrer: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
    };

    return await this.clickEventModel.create(clickData);
  }

  static async createTestConversion(campaignLinkId: string, trackingId: string, eventType: ConversionEventType = ConversionEventType.NEWSLETTER_SIGNUP) {
    const conversionData = {
      tracking_id: trackingId,
      campaign_link_id: campaignLinkId,
      event_type: eventType,
      revenue_amount: eventType === ConversionEventType.PURCHASE ? 99.99 : undefined,
      event_data: { test: true }
    };

    return await this.conversionEventModel.create(conversionData);
  }

  // API request helpers
  static async authenticatedRequest(method: 'get' | 'post' | 'put' | 'delete', url: string, token: string, data?: any) {
    const req = request(app)[method](url).set('Authorization', `Bearer ${token}`);
    
    if (data && (method === 'post' || method === 'put')) {
      req.send(data);
    }
    
    return req;
  }

  // Assertion helpers
  static expectValidCampaign(campaign: any) {
    expect(campaign).toHaveProperty('id');
    expect(campaign).toHaveProperty('name');
    expect(campaign).toHaveProperty('created_at');
    expect(campaign).toHaveProperty('updated_at');
    expect(typeof campaign.id).toBe('string');
    expect(typeof campaign.name).toBe('string');
  }

  static expectValidCampaignLink(link: any) {
    expect(link).toHaveProperty('id');
    expect(link).toHaveProperty('campaign_id');
    expect(link).toHaveProperty('short_code');
    expect(link).toHaveProperty('landing_page_url');
    expect(link).toHaveProperty('youtube_video_id');
    expect(typeof link.short_code).toBe('string');
    expect(link.short_code.length).toBeGreaterThan(0);
  }

  static expectValidClickEvent(click: any) {
    expect(click).toHaveProperty('id');
    expect(click).toHaveProperty('campaign_link_id');
    expect(click).toHaveProperty('tracking_id');
    expect(click).toHaveProperty('clicked_at');
  }

  // Performance testing helpers
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  }

  static async runConcurrentRequests<T>(requests: (() => Promise<T>)[], concurrency = 10): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(req => req()));
      results.push(...batchResults);
    }
    
    return results;
  }
}

// Mock YouTube API responses
export const mockYouTubeResponses = {
  validVideo: {
    items: [{
      id: 'dQw4w9WgXcQ',
      snippet: {
        title: 'Rick Astley - Never Gonna Give You Up',
        channelTitle: 'RickAstleyVEVO',
        publishedAt: '2009-10-25T06:57:33Z',
        thumbnails: {
          default: { url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg' },
          medium: { url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg' },
          high: { url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }
        }
      },
      statistics: {
        viewCount: '1234567890'
      }
    }]
  },
  
  invalidVideo: {
    items: []
  },
  
  apiError: {
    error: {
      code: 403,
      message: 'The request cannot be completed because you have exceeded your quota.'
    }
  }
};