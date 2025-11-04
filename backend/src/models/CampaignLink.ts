import Database from '../config/database';
import { CampaignLink, CreateCampaignLinkRequest, UpdateCampaignLinkRequest } from '../types';

export class CampaignLinkModel {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async create(campaignId: string, linkData: CreateCampaignLinkRequest): Promise<CampaignLink> {
    // Use custom alias as short code if provided, otherwise generate unique short code
    const shortCode = linkData.custom_alias || await this.generateUniqueShortCode();
    
    const query = `
      INSERT INTO campaign_links (campaign_id, short_code, landing_page_url, youtube_video_id, custom_alias)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      campaignId,
      shortCode,
      linkData.landing_page_url,
      linkData.youtube_video_id,
      linkData.custom_alias || null
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<CampaignLink | null> {
    const query = 'SELECT * FROM campaign_links WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByShortCode(shortCode: string): Promise<CampaignLink | null> {
    const query = 'SELECT * FROM campaign_links WHERE short_code = $1';
    const result = await this.db.query(query, [shortCode]);
    return result.rows[0] || null;
  }

  async findByCustomAlias(alias: string): Promise<CampaignLink | null> {
    const query = 'SELECT * FROM campaign_links WHERE custom_alias = $1';
    const result = await this.db.query(query, [alias]);
    return result.rows[0] || null;
  }

  async findByCampaignId(campaignId: string): Promise<CampaignLink[]> {
    const query = `
      SELECT * FROM campaign_links 
      WHERE campaign_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [campaignId]);
    return result.rows;
  }

  async findByYouTubeVideoId(videoId: string): Promise<CampaignLink[]> {
    const query = `
      SELECT * FROM campaign_links 
      WHERE youtube_video_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [videoId]);
    return result.rows;
  }

  async update(id: string, updateData: UpdateCampaignLinkRequest): Promise<CampaignLink | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.landing_page_url !== undefined) {
      setClauses.push(`landing_page_url = $${paramIndex++}`);
      values.push(updateData.landing_page_url);
    }

    if (updateData.youtube_video_id !== undefined) {
      setClauses.push(`youtube_video_id = $${paramIndex++}`);
      values.push(updateData.youtube_video_id);
    }

    if (updateData.custom_alias !== undefined) {
      setClauses.push(`custom_alias = $${paramIndex++}`);
      values.push(updateData.custom_alias);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE campaign_links 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  async updateYouTubeMetadata(id: string, title: string, thumbnailUrl: string): Promise<CampaignLink | null> {
    const query = `
      UPDATE campaign_links 
      SET youtube_video_title = $1, youtube_thumbnail_url = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.db.query(query, [title, thumbnailUrl, id]);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM campaign_links WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  async exists(id: string): Promise<boolean> {
    const query = 'SELECT 1 FROM campaign_links WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }

  async isShortCodeAvailable(shortCode: string): Promise<boolean> {
    const query = 'SELECT 1 FROM campaign_links WHERE short_code = $1';
    const result = await this.db.query(query, [shortCode]);
    return result.rows.length === 0;
  }

  async isCustomAliasAvailable(alias: string): Promise<boolean> {
    const query = 'SELECT 1 FROM campaign_links WHERE custom_alias = $1';
    const result = await this.db.query(query, [alias]);
    return result.rows.length === 0;
  }

  private generateShortCode(): string {
    // Generate a random 6-character alphanumeric string to fit in VARCHAR(10)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async generateUniqueShortCode(): Promise<string> {
    let shortCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shortCode = this.generateShortCode();
      attempts++;
      
      if (attempts > maxAttempts) {
        throw new Error('Unable to generate unique short code after maximum attempts');
      }
    } while (!(await this.isShortCodeAvailable(shortCode)));

    return shortCode;
  }
}