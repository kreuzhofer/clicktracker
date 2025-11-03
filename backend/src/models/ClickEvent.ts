import Database from '../config/database';
import { ClickEvent, CreateClickEventRequest } from '../types';

export class ClickEventModel {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async create(clickData: CreateClickEventRequest): Promise<ClickEvent> {
    const query = `
      INSERT INTO click_events (campaign_link_id, tracking_id, ip_address, user_agent, referrer)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      clickData.campaign_link_id,
      clickData.tracking_id,
      clickData.ip_address || null,
      clickData.user_agent || null,
      clickData.referrer || null
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<ClickEvent | null> {
    const query = 'SELECT * FROM click_events WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByTrackingId(trackingId: string): Promise<ClickEvent[]> {
    const query = `
      SELECT * FROM click_events 
      WHERE tracking_id = $1 
      ORDER BY clicked_at DESC
    `;
    const result = await this.db.query(query, [trackingId]);
    return result.rows;
  }

  async findByCampaignLinkId(campaignLinkId: string, limit: number = 100, offset: number = 0): Promise<ClickEvent[]> {
    const query = `
      SELECT * FROM click_events 
      WHERE campaign_link_id = $1 
      ORDER BY clicked_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [campaignLinkId, limit, offset]);
    return result.rows;
  }

  async findByDateRange(startDate: Date, endDate: Date, campaignLinkId?: string): Promise<ClickEvent[]> {
    let query = `
      SELECT * FROM click_events 
      WHERE clicked_at >= $1 AND clicked_at <= $2
    `;
    const values: any[] = [startDate, endDate];

    if (campaignLinkId) {
      query += ' AND campaign_link_id = $3';
      values.push(campaignLinkId);
    }

    query += ' ORDER BY clicked_at DESC';

    const result = await this.db.query(query, values);
    return result.rows;
  }

  async countByCampaignLinkId(campaignLinkId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM click_events WHERE campaign_link_id = $1';
    const result = await this.db.query(query, [campaignLinkId]);
    return parseInt(result.rows[0].count);
  }

  async countUniqueByCampaignLinkId(campaignLinkId: string): Promise<number> {
    const query = `
      SELECT COUNT(DISTINCT tracking_id) as count 
      FROM click_events 
      WHERE campaign_link_id = $1
    `;
    const result = await this.db.query(query, [campaignLinkId]);
    return parseInt(result.rows[0].count);
  }

  async countByDateRange(startDate: Date, endDate: Date, campaignLinkId?: string): Promise<number> {
    let query = `
      SELECT COUNT(*) as count 
      FROM click_events 
      WHERE clicked_at >= $1 AND clicked_at <= $2
    `;
    const values: any[] = [startDate, endDate];

    if (campaignLinkId) {
      query += ' AND campaign_link_id = $3';
      values.push(campaignLinkId);
    }

    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].count);
  }

  async countUniqueByDateRange(startDate: Date, endDate: Date, campaignLinkId?: string): Promise<number> {
    let query = `
      SELECT COUNT(DISTINCT tracking_id) as count 
      FROM click_events 
      WHERE clicked_at >= $1 AND clicked_at <= $2
    `;
    const values: any[] = [startDate, endDate];

    if (campaignLinkId) {
      query += ' AND campaign_link_id = $3';
      values.push(campaignLinkId);
    }

    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].count);
  }

  async getClicksByHour(campaignLinkId: string, hours: number = 24): Promise<Array<{ hour: string; clicks: number }>> {
    const query = `
      SELECT 
        DATE_TRUNC('hour', clicked_at) as hour,
        COUNT(*) as clicks
      FROM click_events 
      WHERE campaign_link_id = $1 
        AND clicked_at >= NOW() - INTERVAL '${hours} hours'
      GROUP BY DATE_TRUNC('hour', clicked_at)
      ORDER BY hour DESC
    `;
    const result = await this.db.query(query, [campaignLinkId]);
    return result.rows;
  }

  async getTopReferrers(campaignLinkId: string, limit: number = 10): Promise<Array<{ referrer: string; clicks: number }>> {
    const query = `
      SELECT 
        COALESCE(referrer, 'Direct') as referrer,
        COUNT(*) as clicks
      FROM click_events 
      WHERE campaign_link_id = $1 
      GROUP BY referrer
      ORDER BY clicks DESC
      LIMIT $2
    `;
    const result = await this.db.query(query, [campaignLinkId, limit]);
    return result.rows;
  }

  async deleteOldEvents(daysToKeep: number = 90): Promise<number> {
    const query = `
      DELETE FROM click_events 
      WHERE clicked_at < NOW() - INTERVAL '${daysToKeep} days'
    `;
    const result = await this.db.query(query);
    return result.rowCount;
  }
}