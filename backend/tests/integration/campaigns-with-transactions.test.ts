import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';
import { TestTransaction, withTransactionIsolation } from '../helpers/TestTransaction';

describe('Campaign API with Transaction Isolation', () => {
  let authToken: string;
  let transaction: TestTransaction;

  // Use transaction isolation for all tests
  withTransactionIsolation(() => {
    beforeEach(async () => {
      // Create and login test user within the transaction
      await TestHelpers.createTestUser();
      authToken = await TestHelpers.loginTestUser();
    });

    describe('POST /api/campaigns', () => {
      it('should create a new campaign with transaction isolation', async () => {
        const campaignData = {
          name: 'Transaction Test Campaign',
          description: 'Test with transaction isolation',
          tags: ['test', 'transaction']
        };

        const response = await request(app)
          .post('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .send(campaignData)
          .expect(201);

        TestHelpers.expectValidCampaign(response.body);
        expect(response.body.data.name).toBe(campaignData.name);
        expect(response.body.data.description).toBe(campaignData.description);
        expect(response.body.data.tags).toEqual(campaignData.tags);

        // Verify the campaign exists within this transaction
        const listResponse = await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(listResponse.body.data.length).toBe(1);
        expect(listResponse.body.data[0].name).toBe(campaignData.name);
      });

      it('should not see data from previous test due to transaction isolation', async () => {
        // This test should not see the campaign created in the previous test
        // because each test runs in its own transaction that gets rolled back
        const listResponse = await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(listResponse.body.data.length).toBe(0);
      });

      it('should handle multiple campaigns within same transaction', async () => {
        // Create multiple campaigns within the same transaction
        const campaign1Data = { name: 'Campaign 1', description: 'First campaign' };
        const campaign2Data = { name: 'Campaign 2', description: 'Second campaign' };

        await request(app)
          .post('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .send(campaign1Data)
          .expect(201);

        await request(app)
          .post('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .send(campaign2Data)
          .expect(201);

        // Both campaigns should be visible within this transaction
        const listResponse = await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(listResponse.body.data.length).toBe(2);
        expect(listResponse.body.data.map((c: any) => c.name)).toContain('Campaign 1');
        expect(listResponse.body.data.map((c: any) => c.name)).toContain('Campaign 2');
      });
    });

    describe('Transaction Isolation Verification', () => {
      it('should demonstrate true isolation between tests', async () => {
        // Create a campaign
        const campaignData = { name: 'Isolation Test Campaign' };
        
        const createResponse = await request(app)
          .post('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .send(campaignData)
          .expect(201);

        const campaignId = createResponse.body.data.id;

        // Update the campaign
        await request(app)
          .put(`/api/campaigns/${campaignId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Updated Campaign Name' })
          .expect(200);

        // Verify the update
        const getResponse = await request(app)
          .get(`/api/campaigns/${campaignId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(getResponse.body.data.name).toBe('Updated Campaign Name');
      });

      it('should not see any data from previous test', async () => {
        // This test should start with a clean slate
        const listResponse = await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(listResponse.body.data.length).toBe(0);
      });
    });
  });
});