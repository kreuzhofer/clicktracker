import { Router, Response } from 'express';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  createCampaignSchema, 
  updateCampaignSchema, 
  campaignParamsSchema, 
  campaignQuerySchema 
} from '../schemas/campaign';
import { AuthenticatedRequest } from '../types';
import { CampaignModel } from '../models/Campaign';

const router = Router();
const campaignModel = new CampaignModel();

// Create new campaign
router.post('/',
  validateRequest(createCampaignSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, description, tags } = req.body;

    // Check if campaign with same name already exists
    const existingCampaign = await campaignModel.findByName(name);
    if (existingCampaign) {
      return res.status(409).json({
        error: 'Campaign with this name already exists',
        code: 'DUPLICATE_CAMPAIGN_NAME'
      });
    }

    const campaign = await campaignModel.create({
      name,
      description,
      tags
    });

    return res.status(201).json(campaign);
  })
);

// Get all campaigns with search and filtering
router.get('/',
  validateQuery(campaignQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { search, limit, offset, sort, order } = req.query;

    let campaigns;
    let totalCount;

    if (search) {
      campaigns = await campaignModel.search(search as string, limit as number);
      totalCount = campaigns.length; // For search, we return the actual count
    } else {
      campaigns = await campaignModel.findAll(limit as number, offset as number);
      totalCount = await campaignModel.count();
    }

    // Apply sorting if specified
    if (sort && sort !== 'created_at') {
      campaigns.sort((a, b) => {
        const aValue = a[sort as keyof typeof a];
        const bValue = b[sort as keyof typeof b];
        
        // Handle undefined values
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return 1;
        if (bValue === undefined) return -1;
        
        if (order === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return res.json({
      campaigns,
      pagination: {
        total: totalCount,
        limit: limit as number,
        offset: offset as number,
        hasMore: (offset as number) + (limit as number) < totalCount
      }
    });
  })
);

// Get campaign by ID
router.get('/:id',
  validateParams(campaignParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const campaign = await campaignModel.findById(id);
    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found',
        code: 'CAMPAIGN_NOT_FOUND'
      });
    }

    return res.json(campaign);
  })
);

// Update campaign
router.put('/:id',
  validateParams(campaignParamsSchema),
  validateRequest(updateCampaignSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    // Check if campaign exists
    const existingCampaign = await campaignModel.findById(id);
    if (!existingCampaign) {
      return res.status(404).json({
        error: 'Campaign not found',
        code: 'CAMPAIGN_NOT_FOUND'
      });
    }

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== existingCampaign.name) {
      const nameConflict = await campaignModel.findByName(updateData.name);
      if (nameConflict) {
        return res.status(409).json({
          error: 'Campaign with this name already exists',
          code: 'DUPLICATE_CAMPAIGN_NAME'
        });
      }
    }

    const updatedCampaign = await campaignModel.update(id, updateData);
    return res.json(updatedCampaign);
  })
);

// Delete campaign
router.delete('/:id',
  validateParams(campaignParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    // Check if campaign exists
    const existingCampaign = await campaignModel.findById(id);
    if (!existingCampaign) {
      return res.status(404).json({
        error: 'Campaign not found',
        code: 'CAMPAIGN_NOT_FOUND'
      });
    }

    const deleted = await campaignModel.delete(id);
    if (deleted) {
      return res.status(204).send();
    } else {
      return res.status(500).json({
        error: 'Failed to delete campaign',
        code: 'DELETE_FAILED'
      });
    }
  })
);

export default router;