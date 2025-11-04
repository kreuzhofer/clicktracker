import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';

describe('Standardized Error Handling Demo', () => {
  let authToken: string;

  beforeEach(async () => {
    await TestHelpers.createTestUser();
    authToken = await TestHelpers.loginTestUser();
  });

  describe('Validation Errors', () => {
    it('should handle validation errors with standardized helper', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing required 'name' field
        .expect(400);

      TestHelpers.expectValidationError(response, 'name');
    });

    it('should handle multiple validation errors', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          name: '', // Invalid empty name
          tags: 'not-an-array' // Invalid tags format
        })
        .expect(400);

      TestHelpers.expectValidationError(response);
      // Check that multiple fields are reported
      expect(response.body.details.length).toBeGreaterThan(1);
    });
  });

  describe('Not Found Errors', () => {
    it('should handle not found errors with standardized helper', async () => {
      const response = await request(app)
        .get('/api/campaigns/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      TestHelpers.expectNotFoundError(response, 'Campaign');
    });
  });

  describe('Conflict Errors', () => {
    it('should handle conflict errors with standardized helper', async () => {
      const campaignData = { name: 'Duplicate Test Campaign' };
      
      // Create first campaign
      await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData)
        .expect(409);

      TestHelpers.expectConflictError(response, 'already exists');
    });
  });

  describe('Unauthorized Errors', () => {
    it('should handle unauthorized errors with standardized helper', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .expect(401);

      TestHelpers.expectUnauthorizedError(response);
    });

    it('should handle invalid token errors', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      TestHelpers.expectUnauthorizedError(response);
    });
  });

  describe('Success Responses', () => {
    it('should handle success responses with standardized helper', async () => {
      const campaignData = { name: 'Success Test Campaign' };
      
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData);

      TestHelpers.expectSuccessResponse(response, 201);
      expect(response.body.data.name).toBe(campaignData.name);
    });

    it('should handle list responses with standardized helper', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`);

      TestHelpers.expectSuccessResponse(response, 200);
      TestHelpers.expectValidCampaignList(response.body);
    });
  });

  describe('Error Helper Consistency', () => {
    it('should demonstrate consistent error format across all endpoints', async () => {
      // Test validation error format consistency
      const validationResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(validationResponse.body).toMatchObject({
        success: false,
        error: 'VALIDATION_ERROR',
        message: expect.any(String),
        details: expect.any(Array)
      });

      // Test not found error format consistency
      const notFoundResponse = await request(app)
        .get('/api/campaigns/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(notFoundResponse.body).toMatchObject({
        success: false,
        error: 'NOT_FOUND',
        message: expect.any(String)
      });

      // Test unauthorized error format consistency
      const unauthorizedResponse = await request(app)
        .get('/api/campaigns')
        .expect(401);

      expect(unauthorizedResponse.body).toMatchObject({
        success: false,
        error: 'UNAUTHORIZED',
        message: expect.any(String)
      });
    });
  });
});