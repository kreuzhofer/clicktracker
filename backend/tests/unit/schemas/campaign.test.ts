import { 
  createCampaignSchema, 
  updateCampaignSchema, 
  campaignParamsSchema, 
  campaignQuerySchema 
} from '../../../src/schemas/campaign';

describe('Campaign Schema Validation Tests', () => {
  describe('createCampaignSchema', () => {
    const validCampaignData = {
      name: 'Test Campaign',
      description: 'Test campaign description',
      tags: ['test', 'campaign']
    };

    it('should validate correct campaign data', () => {
      const { error, value } = createCampaignSchema.validate(validCampaignData);
      
      expect(error).toBeUndefined();
      expect(value).toEqual(validCampaignData);
    });

    it('should require name field', () => {
      const { error } = createCampaignSchema.validate({
        description: 'Test description'
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['name']);
    });

    it('should not allow empty name', () => {
      const { error } = createCampaignSchema.validate({
        ...validCampaignData,
        name: ''
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['name']);
    });

    it('should limit name length', () => {
      const { error } = createCampaignSchema.validate({
        ...validCampaignData,
        name: 'a'.repeat(256)
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['name']);
      expect(error?.details[0].message).toContain('255 characters');
    });

    it('should validate name pattern', () => {
      const { error } = createCampaignSchema.validate({
        ...validCampaignData,
        name: 'Invalid@Name!'
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['name']);
    });

    it('should allow valid name patterns', () => {
      const validNames = [
        'Campaign Name',
        'Campaign-Name',
        'Campaign_Name',
        'Campaign123',
        'Campaign Name 123'
      ];

      validNames.forEach(name => {
        const { error } = createCampaignSchema.validate({
          ...validCampaignData,
          name
        });
        
        expect(error).toBeUndefined();
      });
    });

    it('should make description optional', () => {
      const { error } = createCampaignSchema.validate({
        name: 'Test Campaign'
      });
      
      expect(error).toBeUndefined();
    });

    it('should allow empty description', () => {
      const { error } = createCampaignSchema.validate({
        ...validCampaignData,
        description: ''
      });
      
      expect(error).toBeUndefined();
    });

    it('should limit description length', () => {
      const { error } = createCampaignSchema.validate({
        ...validCampaignData,
        description: 'a'.repeat(1001)
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['description']);
      expect(error?.details[0].message).toContain('1000 characters');
    });

    it('should make tags optional', () => {
      const { error } = createCampaignSchema.validate({
        name: 'Test Campaign'
      });
      
      expect(error).toBeUndefined();
    });

    it('should limit number of tags', () => {
      const { error } = createCampaignSchema.validate({
        ...validCampaignData,
        tags: Array.from({ length: 11 }, (_, i) => `tag${i}`)
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['tags']);
      expect(error?.details[0].message).toContain('10 tags');
    });

    it('should validate individual tag length', () => {
      const { error } = createCampaignSchema.validate({
        ...validCampaignData,
        tags: ['a'.repeat(51)]
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['tags', 0]);
      expect(error?.details[0].message).toContain('50 characters');
    });

    it('should not allow empty tags', () => {
      const { error } = createCampaignSchema.validate({
        ...validCampaignData,
        tags: ['']
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['tags', 0]);
    });

    it('should trim whitespace from fields', () => {
      const { error, value } = createCampaignSchema.validate({
        name: '  Test Campaign  ',
        description: '  Test description  ',
        tags: ['  tag1  ', '  tag2  ']
      });
      
      expect(error).toBeUndefined();
      expect(value.name).toBe('Test Campaign');
      expect(value.description).toBe('Test description');
      expect(value.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('updateCampaignSchema', () => {
    it('should make all fields optional', () => {
      const { error } = updateCampaignSchema.validate({});
      
      expect(error).toBeUndefined();
    });

    it('should validate name when provided', () => {
      const { error } = updateCampaignSchema.validate({
        name: 'Invalid@Name!'
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['name']);
    });

    it('should validate description when provided', () => {
      const { error } = updateCampaignSchema.validate({
        description: 'a'.repeat(1001)
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['description']);
    });

    it('should validate tags when provided', () => {
      const { error } = updateCampaignSchema.validate({
        tags: Array.from({ length: 11 }, (_, i) => `tag${i}`)
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['tags']);
    });
  });

  describe('campaignParamsSchema', () => {
    it('should validate correct UUID', () => {
      const { error, value } = campaignParamsSchema.validate({
        id: '123e4567-e89b-12d3-a456-426614174000'
      });
      
      expect(error).toBeUndefined();
      expect(value.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should require id field', () => {
      const { error } = campaignParamsSchema.validate({});
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['id']);
    });

    it('should validate UUID format', () => {
      const { error } = campaignParamsSchema.validate({
        id: 'invalid-uuid'
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['id']);
      expect(error?.details[0].message).toContain('Invalid campaign ID format');
    });
  });

  describe('campaignQuerySchema', () => {
    it('should validate with no query parameters', () => {
      const { error, value } = campaignQuerySchema.validate({});
      
      expect(error).toBeUndefined();
      expect(value.limit).toBe(20);
      expect(value.offset).toBe(0);
      expect(value.sort).toBe('created_at');
      expect(value.order).toBe('desc');
    });

    it('should validate search parameter', () => {
      const { error, value } = campaignQuerySchema.validate({
        search: 'test campaign'
      });
      
      expect(error).toBeUndefined();
      expect(value.search).toBe('test campaign');
    });

    it('should validate search parameter length', () => {
      const { error } = campaignQuerySchema.validate({
        search: 'a'.repeat(101)
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['search']);
      expect(error?.details[0].message).toContain('100 characters');
    });

    it('should not allow empty search', () => {
      const { error } = campaignQuerySchema.validate({
        search: ''
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['search']);
    });

    it('should validate limit parameter', () => {
      const { error, value } = campaignQuerySchema.validate({
        limit: 50
      });
      
      expect(error).toBeUndefined();
      expect(value.limit).toBe(50);
    });

    it('should validate limit bounds', () => {
      const { error: errorMin } = campaignQuerySchema.validate({ limit: 0 });
      const { error: errorMax } = campaignQuerySchema.validate({ limit: 101 });
      
      expect(errorMin).toBeDefined();
      expect(errorMax).toBeDefined();
    });

    it('should validate offset parameter', () => {
      const { error, value } = campaignQuerySchema.validate({
        offset: 100
      });
      
      expect(error).toBeUndefined();
      expect(value.offset).toBe(100);
    });

    it('should not allow negative offset', () => {
      const { error } = campaignQuerySchema.validate({
        offset: -1
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['offset']);
    });

    it('should validate sort parameter', () => {
      const validSorts = ['name', 'created_at', 'updated_at'];
      
      validSorts.forEach(sort => {
        const { error, value } = campaignQuerySchema.validate({ sort });
        
        expect(error).toBeUndefined();
        expect(value.sort).toBe(sort);
      });
    });

    it('should reject invalid sort values', () => {
      const { error } = campaignQuerySchema.validate({
        sort: 'invalid_sort'
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['sort']);
    });

    it('should validate order parameter', () => {
      const validOrders = ['asc', 'desc'];
      
      validOrders.forEach(order => {
        const { error, value } = campaignQuerySchema.validate({ order });
        
        expect(error).toBeUndefined();
        expect(value.order).toBe(order);
      });
    });

    it('should reject invalid order values', () => {
      const { error } = campaignQuerySchema.validate({
        order: 'invalid_order'
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['order']);
    });
  });
});