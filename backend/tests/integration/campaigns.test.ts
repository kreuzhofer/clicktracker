import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';

describe('Campaign API Integration Tests', () => {
  let authToken: string;

  beforeEach(async () => {
    // Create and login test user
    await TestHelpers.createTestUser();
    authToken = await TestHelpers.loginTestUser();
  });

  describe('POST /api/campaigns', () => {
    it('should create a new campaign with valid data', async () => {
      const campaignData = {
        name: 'Test Campaign',
        description: 'Test description',
        tags: ['test', 'integration']
      };

      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData)
        .expect(201);

      TestHelpers.expectValidCampaign(response.body);
      expect(response.body.name).toBe(campaignData.name);
      expect(response.body.description).toBe(campaignData.description);
      expect(response.body.tags).toEqual(campaignData.tags);
    });

    it('should reject campaign with duplicate name', async () => {
      const campaignData = { name: 'Duplicate Campaign' };

      // Create first campaign
      await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData)
        .expect(201);

      // Try to create duplicate
      await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData)
        .expect(409);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/campaigns')
        .send({ name: 'Test Campaign' })
        .expect(401);
    });
  });

  describe('GET /api/campaigns', () => {
    it('should return list of campaigns', async () => {
      // Create test campaigns
      await TestHelpers.createTestCampaign({ name: 'Campaign 1' });
      await TestHelpers.createTestCampaign({ name: 'Campaign 2' });

      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      response.body.forEach(TestHelpers.expectValidCampaign);
    });

    it('should support search functionality', async () => {
      await TestHelpers.createTestCampaign({ name: 'Summer Campaign' });
      await TestHelpers.createTestCampaign({ name: 'Winter Campaign' });

      const response = await request(app)
        .get('/api/campaigns?search=summer')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toContain('Summer');
    });
  });

  describe('Performance Tests', () => {
    it('should handle campaign creation under load', async () => {
      const requests = Array.from({ length: 50 }, (_, i) => 
        () => request(app)
          .post('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: `Load Test Campaign ${i}` })
      );

      const { duration } = await TestHelpers.measureExecutionTime(async () => {
        await TestHelpers.runConcurrentRequests(requests, 10);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });
  });
});