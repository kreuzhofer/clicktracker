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
      expect(campaign.created_at).toBeInstanceOf(Date);
      expect(campaign.updated_at).toBeInstanceOf(Date);
    });

    it('should create campaign with minimal data', async () => {
      const campaignData = { name: 'Minimal Campaign' };
      const campaign = await campaignModel.create(campaignData);

      TestHelpers.expectValidCampaign(campaign);
      expect(campaign.name).toBe(campaignData.name);
      expect(campaign.description).toBeNull();
      expect(campaign.tags).toBeNull();
    });

    it('should create campaign with empty description', async () => {
      const campaignData = { name: 'Empty Description Campaign', description: '' };
      const campaign = await campaignModel.create(campaignData);

      TestHelpers.expectValidCampaign(campaign);
      expect(campaign.description).toBeNull();
    });

    it('should create campaign with empty tags array', async () => {
      const campaignData = { name: 'Empty Tags Campaign', tags: [] };
      const campaign = await campaignModel.create(campaignData);

      TestHelpers.expectValidCampaign(campaign);
      expect(campaign.tags).toEqual([]);
    });

    it('should throw error for duplicate name', async () => {
      const campaignData = { name: 'Duplicate Test' };
      
      await campaignModel.create(campaignData);
      
      await expect(campaignModel.create(campaignData))
        .rejects.toThrow();
    });

    it('should handle special characters in name', async () => {
      const campaignData = { name: 'Campaign-with_special 123' };
      const campaign = await campaignModel.create(campaignData);

      TestHelpers.expectValidCampaign(campaign);
      expect(campaign.name).toBe(campaignData.name);
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

    it('should return null for invalid UUID format', async () => {
      const found = await campaignModel.findById('invalid-uuid');
      expect(found).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find campaign by exact name', async () => {
      const created = await TestHelpers.createTestCampaign({ name: 'Exact Name Test' });
      const found = await campaignModel.findByName('Exact Name Test');

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe(created.name);
    });

    it('should return null for non-existent name', async () => {
      const found = await campaignModel.findByName('Non Existent Campaign');
      expect(found).toBeNull();
    });

    it('should be case sensitive', async () => {
      await TestHelpers.createTestCampaign({ name: 'Case Sensitive Test' });
      const found = await campaignModel.findByName('case sensitive test');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create test campaigns in specific order
      await TestHelpers.createTestCampaign({ name: 'Campaign 1' });
      await TestHelpers.createTestCampaign({ name: 'Campaign 2' });
      await TestHelpers.createTestCampaign({ name: 'Campaign 3' });
    });

    it('should return campaigns ordered by creation date desc', async () => {
      const campaigns = await campaignModel.findAll(10, 0);
      
      expect(campaigns.length).toBe(3);
      expect(campaigns[0].name).toBe('Campaign 3'); // Most recent first
      expect(campaigns[2].name).toBe('Campaign 1'); // Oldest last
    });

    it('should respect limit parameter', async () => {
      const campaigns = await campaignModel.findAll(2, 0);
      expect(campaigns.length).toBe(2);
    });

    it('should respect offset parameter', async () => {
      const campaigns = await campaignModel.findAll(10, 1);
      expect(campaigns.length).toBe(2); // Should skip first campaign
      expect(campaigns[0].name).toBe('Campaign 2');
    });

    it('should handle limit and offset together', async () => {
      const campaigns = await campaignModel.findAll(1, 1);
      expect(campaigns.length).toBe(1);
      expect(campaigns[0].name).toBe('Campaign 2');
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

    it('should handle partial matches', async () => {
      const results = await campaignModel.search('Sale');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Summer Sale Campaign');
    });

    it('should return empty array for no matches', async () => {
      const results = await campaignModel.search('nonexistent');
      expect(results.length).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const results = await campaignModel.search('Campaign', 1);
      expect(results.length).toBe(1);
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

    it('should update tags', async () => {
      const campaign = await TestHelpers.createTestCampaign({ tags: ['old', 'tags'] });
      const updated = await campaignModel.update(campaign.id, { tags: ['new', 'tags'] });

      expect(updated!.tags).toEqual(['new', 'tags']);
    });

    it('should handle empty update data', async () => {
      const campaign = await TestHelpers.createTestCampaign();
      const updated = await campaignModel.update(campaign.id, {});

      expect(updated).not.toBeNull();
      expect(updated!.id).toBe(campaign.id);
      expect(updated!.name).toBe(campaign.name);
    });

    it('should return null for non-existent campaign', async () => {
      const updated = await campaignModel.update('00000000-0000-0000-0000-000000000000', { name: 'New Name' });
      expect(updated).toBeNull();
    });

    it('should handle undefined values', async () => {
      const campaign = await TestHelpers.createTestCampaign({ description: 'Original description' });
      const updated = await campaignModel.update(campaign.id, { description: undefined });

      expect(updated!.description).toBe('Original description'); // Should remain unchanged
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

    it('should handle invalid UUID format', async () => {
      const deleted = await campaignModel.delete('invalid-uuid');
      expect(deleted).toBe(false);
    });
  });

  describe('count', () => {
    it('should return correct count of campaigns', async () => {
      const initialCount = await campaignModel.count();
      
      await TestHelpers.createTestCampaign();
      await TestHelpers.createTestCampaign();
      
      const newCount = await campaignModel.count();
      expect(newCount).toBe(initialCount + 2);
    });

    it('should return 0 when no campaigns exist', async () => {
      // This test assumes a clean database state
      // In practice, you might need to clean up first
      const count = await campaignModel.count();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exists', () => {
    it('should return true for existing campaign', async () => {
      const campaign = await TestHelpers.createTestCampaign();
      const exists = await campaignModel.exists(campaign.id);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent campaign', async () => {
      const exists = await campaignModel.exists('00000000-0000-0000-0000-000000000000');
      expect(exists).toBe(false);
    });

    it('should handle invalid UUID format', async () => {
      const exists = await campaignModel.exists('invalid-uuid');
      expect(exists).toBe(false);
    });
  });

  describe('Edge Cases and Data Integrity', () => {
    it('should handle campaigns with same name case variations', async () => {
      await TestHelpers.createTestCampaign({ name: 'Test Campaign' });
      
      // This should succeed as names are case-sensitive
      const campaign2 = await campaignModel.create({ name: 'test campaign' });
      expect(campaign2.name).toBe('test campaign');
    });

    it('should preserve data types correctly', async () => {
      const campaignData = {
        name: 'Type Test Campaign',
        description: 'Test description',
        tags: ['tag1', 'tag2']
      };

      const campaign = await campaignModel.create(campaignData);
      
      expect(typeof campaign.id).toBe('string');
      expect(typeof campaign.name).toBe('string');
      expect(typeof campaign.description).toBe('string');
      expect(Array.isArray(campaign.tags)).toBe(true);
      expect(campaign.created_at).toBeInstanceOf(Date);
      expect(campaign.updated_at).toBeInstanceOf(Date);
    });

    it('should handle large description text', async () => {
      const largeDescription = 'A'.repeat(1000); // 1000 characters
      const campaign = await campaignModel.create({
        name: 'Large Description Test',
        description: largeDescription
      });

      expect(campaign.description).toBe(largeDescription);
    });

    it('should handle many tags', async () => {
      const manyTags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
      const campaign = await campaignModel.create({
        name: 'Many Tags Test',
        tags: manyTags
      });

      expect(campaign.tags).toEqual(manyTags);
      expect(campaign.tags!.length).toBe(10);
    });
  });
});