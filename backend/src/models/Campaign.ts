import Database from '../config/database';
import { Campaign, CreateCampaignRequest, UpdateCampaignRequest } from '../types';

export class CampaignModel {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async create(campaignData: CreateCampaignRequest): Promise<Campaign> {
    const query = `
      INSERT INTO campaigns (name, description, tags)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const values = [
      campaignData.name,
      campaignData.description || null,
      campaignData.tags || null
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<Campaign | null> {
    const query = 'SELECT * FROM campaigns WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findAll(limit: number = 50, offset: number = 0): Promise<Campaign[]> {
    const query = `
      SELECT * FROM campaigns 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await this.db.query(query, [limit, offset]);
    return result.rows;
  }

  async findByName(name: string): Promise<Campaign | null> {
    const query = 'SELECT * FROM campaigns WHERE name = $1';
    const result = await this.db.query(query, [name]);
    return result.rows[0] || null;
  }

  async search(searchTerm: string, limit: number = 50): Promise<Campaign[]> {
    const query = `
      SELECT * FROM campaigns 
      WHERE name ILIKE $1 OR description ILIKE $1
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await this.db.query(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  }

  async update(id: string, updateData: UpdateCampaignRequest): Promise<Campaign | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updateData.name);
    }

    if (updateData.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updateData.description);
    }

    if (updateData.tags !== undefined) {
      setClauses.push(`tags = $${paramIndex++}`);
      values.push(updateData.tags);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE campaigns 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM campaigns WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM campaigns';
    const result = await this.db.query(query);
    return parseInt(result.rows[0].count);
  }

  async exists(id: string): Promise<boolean> {
    const query = 'SELECT 1 FROM campaigns WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }
}