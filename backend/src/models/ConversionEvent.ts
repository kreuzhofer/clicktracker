import Database from '../config/database';
import { ConversionEvent, CreateConversionEventRequest, ConversionEventType } from '../types';

export class ConversionEventModel {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Convert database row to ConversionEvent with proper number types
   */
  private convertRowToConversionEvent(row: any): ConversionEvent {
    return {
      ...row,
      revenue_amount: row.revenue_amount ? parseFloat(row.revenue_amount) : null,
      event_data: row.event_data ? (typeof row.event_data === 'string' ? JSON.parse(row.event_data) : row.event_data) : null
    };
  }

  async create(conversionData: CreateConversionEventRequest): Promise<ConversionEvent> {
    const query = `
      INSERT INTO conversion_events (tracking_id, campaign_link_id, event_type, revenue_amount, event_data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      conversionData.tracking_id,
      conversionData.campaign_link_id,
      conversionData.event_type,
      conversionData.revenue_amount || null,
      conversionData.event_data ? JSON.stringify(conversionData.event_data) : null
    ];

    const result = await this.db.query(query, values);
    return this.convertRowToConversionEvent(result.rows[0]);
  }

  async findById(id: string): Promise<ConversionEvent | null> {
    const query = 'SELECT * FROM conversion_events WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.convertRowToConversionEvent(result.rows[0]) : null;
  }

  async findByTrackingId(trackingId: string): Promise<ConversionEvent[]> {
    const query = `
      SELECT * FROM conversion_events 
      WHERE tracking_id = $1 
      ORDER BY converted_at DESC
    `;
    const result = await this.db.query(query, [trackingId]);
    return result.rows.map((row: any) => this.convertRowToConversionEvent(row));
  }

  async findByCampaignLinkId(campaignLinkId: string, limit: number = 100, offset: number = 0): Promise<ConversionEvent[]> {
    const query = `
      SELECT * FROM conversion_events 
      WHERE campaign_link_id = $1 
      ORDER BY converted_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [campaignLinkId, limit, offset]);
    return result.rows.map((row: any) => this.convertRowToConversionEvent(row));
  }

  async findByEventType(eventType: ConversionEventType, campaignLinkId?: string): Promise<ConversionEvent[]> {
    let query = `
      SELECT * FROM conversion_events 
      WHERE event_type = $1
    `;
    const values: any[] = [eventType];

    if (campaignLinkId) {
      query += ' AND campaign_link_id = $2';
      values.push(campaignLinkId);
    }

    query += ' ORDER BY converted_at DESC';

    const result = await this.db.query(query, values);
    return result.rows.map((row: any) => this.convertRowToConversionEvent(row));
  }

  async findByDateRange(startDate: Date, endDate: Date, campaignLinkId?: string): Promise<ConversionEvent[]> {
    let query = `
      SELECT * FROM conversion_events 
      WHERE converted_at >= $1 AND converted_at <= $2
    `;
    const values: any[] = [startDate, endDate];

    if (campaignLinkId) {
      query += ' AND campaign_link_id = $3';
      values.push(campaignLinkId);
    }

    query += ' ORDER BY converted_at DESC';

    const result = await this.db.query(query, values);
    return result.rows.map((row: any) => this.convertRowToConversionEvent(row));
  }

  async countByCampaignLinkId(campaignLinkId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM conversion_events WHERE campaign_link_id = $1';
    const result = await this.db.query(query, [campaignLinkId]);
    return parseInt(result.rows[0].count);
  }

  async countByEventType(eventType: ConversionEventType, campaignLinkId?: string): Promise<number> {
    let query = `
      SELECT COUNT(*) as count 
      FROM conversion_events 
      WHERE event_type = $1
    `;
    const values: any[] = [eventType];

    if (campaignLinkId) {
      query += ' AND campaign_link_id = $2';
      values.push(campaignLinkId);
    }

    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].count);
  }

  async getTotalRevenueByCampaignLinkId(campaignLinkId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(revenue_amount), 0) as total_revenue 
      FROM conversion_events 
      WHERE campaign_link_id = $1 AND revenue_amount IS NOT NULL
    `;
    const result = await this.db.query(query, [campaignLinkId]);
    return parseFloat(result.rows[0].total_revenue) || 0;
  }

  async getRevenueByEventType(campaignLinkId: string): Promise<Array<{ event_type: string; revenue: number; count: number }>> {
    const query = `
      SELECT 
        event_type,
        COALESCE(SUM(revenue_amount), 0) as revenue,
        COUNT(*) as count
      FROM conversion_events 
      WHERE campaign_link_id = $1 
      GROUP BY event_type
      ORDER BY revenue DESC
    `;
    const result = await this.db.query(query, [campaignLinkId]);
    return result.rows.map((row: any) => ({
      event_type: row.event_type,
      revenue: parseFloat(row.revenue) || 0,
      count: parseInt(row.count)
    }));
  }

  async getConversionFunnel(campaignLinkId: string): Promise<Array<{ step: string; count: number; rate: number }>> {
    // Get click count first
    const clickQuery = `
      SELECT COUNT(*) as clicks 
      FROM click_events 
      WHERE campaign_link_id = $1
    `;
    const clickResult = await this.db.query(clickQuery, [campaignLinkId]);
    const totalClicks = parseInt(clickResult.rows[0].clicks);

    // Get conversion counts by type
    const conversionQuery = `
      SELECT 
        event_type,
        COUNT(*) as count
      FROM conversion_events 
      WHERE campaign_link_id = $1 
      GROUP BY event_type
      ORDER BY 
        CASE event_type 
          WHEN 'newsletter_signup' THEN 1
          WHEN 'course_enrollment' THEN 2
          WHEN 'purchase' THEN 3
          ELSE 4
        END
    `;
    const conversionResult = await this.db.query(conversionQuery, [campaignLinkId]);

    const funnel = [
      {
        step: 'clicks',
        count: totalClicks,
        rate: 100
      }
    ];

    let previousCount = totalClicks;
    for (const row of conversionResult.rows) {
      const count = parseInt(row.count);
      const rate = totalClicks > 0 ? (count / totalClicks) * 100 : 0;
      
      funnel.push({
        step: row.event_type,
        count,
        rate: parseFloat(rate.toFixed(2))
      });
    }

    return funnel;
  }

  async getConversionsByDay(campaignLinkId: string, days: number = 30): Promise<Array<{ date: string; conversions: number; revenue: number }>> {
    const query = `
      SELECT 
        DATE(converted_at) as date,
        COUNT(*) as conversions,
        COALESCE(SUM(revenue_amount), 0) as revenue
      FROM conversion_events 
      WHERE campaign_link_id = $1 
        AND converted_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(converted_at)
      ORDER BY date DESC
    `;
    const result = await this.db.query(query, [campaignLinkId]);
    return result.rows.map((row: any) => ({
      date: row.date,
      conversions: parseInt(row.conversions),
      revenue: parseFloat(row.revenue) || 0
    }));
  }

  async deleteOldEvents(daysToKeep: number = 90): Promise<number> {
    const query = `
      DELETE FROM conversion_events 
      WHERE converted_at < NOW() - INTERVAL '${daysToKeep} days'
    `;
    const result = await this.db.query(query);
    return result.rowCount;
  }

  // Attribution window cleanup - remove conversions older than 30 days from their original click
  async cleanupAttributionWindow(): Promise<number> {
    const query = `
      DELETE FROM conversion_events 
      WHERE tracking_id NOT IN (
        SELECT DISTINCT tracking_id 
        FROM click_events 
        WHERE clicked_at >= NOW() - INTERVAL '30 days'
      )
    `;
    const result = await this.db.query(query);
    return result.rowCount;
  }
}