import Database from '../config/database';
import { YouTubeVideoStats } from '../types';

export class YouTubeVideoStatsModel {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async upsert(videoId: string, viewCount: number): Promise<YouTubeVideoStats> {
    const query = `
      INSERT INTO youtube_video_stats (video_id, view_count, last_updated)
      VALUES ($1, $2, NOW())
      ON CONFLICT (video_id) 
      DO UPDATE SET 
        view_count = EXCLUDED.view_count,
        last_updated = NOW()
      RETURNING *
    `;
    
    const values = [videoId, viewCount];
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async findByVideoId(videoId: string): Promise<YouTubeVideoStats | null> {
    const query = 'SELECT * FROM youtube_video_stats WHERE video_id = $1';
    const result = await this.db.query(query, [videoId]);
    return result.rows[0] || null;
  }

  async findAll(): Promise<YouTubeVideoStats[]> {
    const query = 'SELECT * FROM youtube_video_stats ORDER BY last_updated DESC';
    const result = await this.db.query(query);
    return result.rows;
  }

  async findStaleStats(hoursOld: number = 24): Promise<YouTubeVideoStats[]> {
    const query = `
      SELECT * FROM youtube_video_stats 
      WHERE last_updated < NOW() - INTERVAL '${hoursOld} hours'
      ORDER BY last_updated ASC
    `;
    const result = await this.db.query(query);
    return result.rows;
  }

  async findActiveVideoIds(): Promise<string[]> {
    // Get video IDs that are currently used in campaign links
    const query = `
      SELECT DISTINCT youtube_video_id 
      FROM campaign_links 
      WHERE youtube_video_id IS NOT NULL
    `;
    const result = await this.db.query(query);
    return result.rows.map((row: any) => row.youtube_video_id);
  }

  async updateViewCount(videoId: string, viewCount: number): Promise<YouTubeVideoStats | null> {
    const query = `
      UPDATE youtube_video_stats 
      SET view_count = $1, last_updated = NOW()
      WHERE video_id = $2
      RETURNING *
    `;
    const result = await this.db.query(query, [viewCount, videoId]);
    return result.rows[0] || null;
  }

  async delete(videoId: string): Promise<boolean> {
    const query = 'DELETE FROM youtube_video_stats WHERE video_id = $1';
    const result = await this.db.query(query, [videoId]);
    return result.rowCount > 0;
  }

  async deleteUnusedStats(): Promise<number> {
    // Delete stats for videos that are no longer used in any campaign links
    const query = `
      DELETE FROM youtube_video_stats 
      WHERE video_id NOT IN (
        SELECT DISTINCT youtube_video_id 
        FROM campaign_links 
        WHERE youtube_video_id IS NOT NULL
      )
    `;
    const result = await this.db.query(query);
    return result.rowCount;
  }

  async getViewCountHistory(videoId: string, days: number = 30): Promise<Array<{ date: string; view_count: number }>> {
    // This would require a separate table to track historical view counts
    // For now, we'll return the current stats
    const stats = await this.findByVideoId(videoId);
    if (!stats) return [];

    return [{
      date: stats.last_updated.toISOString().split('T')[0],
      view_count: stats.view_count
    }];
  }

  async getBulkStats(videoIds: string[]): Promise<YouTubeVideoStats[]> {
    if (videoIds.length === 0) return [];

    const placeholders = videoIds.map((_, index) => `$${index + 1}`).join(',');
    const query = `
      SELECT * FROM youtube_video_stats 
      WHERE video_id IN (${placeholders})
      ORDER BY last_updated DESC
    `;
    
    const result = await this.db.query(query, videoIds);
    return result.rows;
  }

  async getStatsWithCampaignInfo(): Promise<Array<{
    video_id: string;
    view_count: number;
    last_updated: Date;
    campaign_links_count: number;
    total_clicks: number;
    video_ctr: number;
  }>> {
    const query = `
      SELECT 
        yvs.video_id,
        yvs.view_count,
        yvs.last_updated,
        COUNT(DISTINCT cl.id) as campaign_links_count,
        COUNT(ce.id) as total_clicks,
        CASE 
          WHEN yvs.view_count > 0 THEN (COUNT(ce.id)::float / yvs.view_count * 100)
          ELSE 0 
        END as video_ctr
      FROM youtube_video_stats yvs
      LEFT JOIN campaign_links cl ON yvs.video_id = cl.youtube_video_id
      LEFT JOIN click_events ce ON cl.id = ce.campaign_link_id
      GROUP BY yvs.video_id, yvs.view_count, yvs.last_updated
      ORDER BY video_ctr DESC
    `;
    
    const result = await this.db.query(query);
    return result.rows.map((row: any) => ({
      video_id: row.video_id,
      view_count: parseInt(row.view_count),
      last_updated: row.last_updated,
      campaign_links_count: parseInt(row.campaign_links_count),
      total_clicks: parseInt(row.total_clicks),
      video_ctr: parseFloat(row.video_ctr) || 0
    }));
  }
}