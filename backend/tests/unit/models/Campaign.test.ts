import { CampaignModel } from '../../../src/models/Campaign';
import { TestHelpers } from '../../helpers/testHelpers';

describe('Campaign Model Unit Tests', () => {
  let campaignModel: CampaignModel;

  beforeEach(() => {
    campaignModel = new CampaignModel();
  });

  describe('create', () => {
    it('should create a campaign with valid data', async () => {
      const campaignData = {
        name: 'Unit Test Campaign',
        description: 'Test description',
        tags: ['unit', 'test']
      };

      const campaign = await campaignModel.create(campaignData);

      TestHelpers.expectValidCampaign(campaign);
      expect(campaign.name).toBe(campaignData.name);
      expect(campaign.description).toBe(campaignData.description);
      expect(campaign.tags).toEqual(campaignData.tags);
    });

    it('should create campaign with minimal data', async () => {
      const campaignData = { name: 'Minimal Campaign' };
      const campaign = await campaignModel.create(campaignData);

      TestHelpers.expectValidCampaign(campaign);
      expect(campaign.name).toBe(campaignData.name);
      expect(campaign.description).toBeNull();
      expect(campaign.tags).toBeNull();
    });

    it('should throw error for duplicate name', async () => {
      const campaignData = { name: 'Duplicate Test' };
      
      await campaignModel.create(campaignData);
      
      await expect(campaignModel.create(campaignData))
        .rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find existing campaign', async () => {
      const created = await TestHelpers.createTestCampaign();
      const found = await campaignModel.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe(created.name);
    });

    it('should return null for non-existent campaign', async () => {
      const found = await campaignModel.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update campaign fields', async () => {
      const campaign = await TestHelpers.createTestCampaign();
      const updateData = {
        name: 'Updated Campaign Name',
        description: 'Updated description'
      };

      const updated = await campaignModel.update(campaign.id, updateData);

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe(updateData.name);
      expect(updated!.description).toBe(updateData.description);
      expect(updated!.updated_at.getTime()).toBeGreaterThan(campaign.updated_at.getTime());
    });

    it('should handle partial updates', async () => {
      const campaign = await TestHelpers.createTestCampaign({ name: 'Original Name' });
      const updated = await campaignModel.update(campaign.id, { description: 'New description' });

      expect(updated!.name).toBe('Original Name'); // Unchanged
      expect(updated!.description).toBe('New description'); // Changed
    });
  });

  describe('delete', () => {
    it('should delete existing campaign', async () => {
      const campaign = await TestHelpers.createTestCampaign();
      const deleted = await campaignModel.delete(campaign.id);

      expect(deleted).toBe(true);

      const found = await campaignModel.findById(campaign.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent campaign', async () => {
      const deleted = await campaignModel.delete('00000000-0000-0000-0000-000000000000');
      expect(deleted).toBe(false);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await TestHelpers.createTestCampaign({ name: 'Summer Sale Campaign', description: 'Hot deals' });
      await TestHelpers.createTestCampaign({ name: 'Winter Promotion', description: 'Cold weather gear' });
      await TestHelpers.createTestCampaign({ name: 'Spring Launch', description: 'New products for summer' });
    });

    it('should search by name', async () => {
      const results = await campaignModel.search('summer');
      expect(results.length).toBe(2); // "Summer Sale" and "Spring Launch" (description contains summer)
    });

    it('should search by description', async () => {
      const results = await campaignModel.search('deals');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Summer Sale Campaign');
    });

    it('should be case insensitive', async () => {
      const results = await campaignModel.search('WINTER');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Winter Promotion');
    });
  });
});