import Database from '../config/database';
import { CampaignModel, CampaignLinkModel, YouTubeVideoStatsModel, ClickEventModel, ConversionEventModel } from '../models';
import { ConversionEventType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class SeedRunner {
  private db: Database;
  private campaignModel: CampaignModel;
  private campaignLinkModel: CampaignLinkModel;
  private youtubeStatsModel: YouTubeVideoStatsModel;
  private clickEventModel: ClickEventModel;
  private conversionEventModel: ConversionEventModel;

  constructor() {
    this.db = Database.getInstance();
    this.campaignModel = new CampaignModel();
    this.campaignLinkModel = new CampaignLinkModel();
    this.youtubeStatsModel = new YouTubeVideoStatsModel();
    this.clickEventModel = new ClickEventModel();
    this.conversionEventModel = new ConversionEventModel();
  }

  async seedDevelopmentData(): Promise<void> {
    console.log('Seeding development data...');

    try {
      // Create sample campaigns
      const campaign1 = await this.campaignModel.create({
        name: 'Summer Product Launch',
        description: 'Marketing campaign for our new summer product line',
        tags: ['summer', 'product-launch', 'youtube']
      });

      const campaign2 = await this.campaignModel.create({
        name: 'Educational Content Series',
        description: 'Educational videos about our industry',
        tags: ['education', 'content-marketing', 'youtube']
      });

      const campaign3 = await this.campaignModel.create({
        name: 'Black Friday Promotion',
        description: 'Special promotional campaign for Black Friday sales',
        tags: ['promotion', 'black-friday', 'sales']
      });

      console.log('✓ Created sample campaigns');

      // Create sample YouTube video stats
      const videoStats = [
        { video_id: 'dQw4w9WgXcQ', view_count: 1234567890 }, // Rick Roll
        { video_id: 'jNQXAC9IVRw', view_count: 987654321 },  // Sample video
        { video_id: 'M7lc1UVf-VE', view_count: 456789123 },  // Sample video
        { video_id: 'ZZ5LpwO-An4', view_count: 234567890 },  // Sample video
        { video_id: 'fJ9rUzIMcZQ', view_count: 123456789 },  // Sample video
      ];

      for (const stats of videoStats) {
        await this.youtubeStatsModel.upsert(stats.video_id, stats.view_count);
      }

      console.log('✓ Created sample YouTube video stats');

      // Create sample campaign links
      const campaignLinks = [
        {
          campaign: campaign1,
          landing_page_url: 'https://example.com/summer-products',
          youtube_video_id: 'dQw4w9WgXcQ',
          custom_alias: 'summer-launch'
        },
        {
          campaign: campaign1,
          landing_page_url: 'https://example.com/summer-sale',
          youtube_video_id: 'jNQXAC9IVRw',
          custom_alias: null
        },
        {
          campaign: campaign2,
          landing_page_url: 'https://example.com/learn-more',
          youtube_video_id: 'M7lc1UVf-VE',
          custom_alias: 'education-series'
        },
        {
          campaign: campaign2,
          landing_page_url: 'https://example.com/tutorial',
          youtube_video_id: 'ZZ5LpwO-An4',
          custom_alias: null
        },
        {
          campaign: campaign3,
          landing_page_url: 'https://example.com/black-friday',
          youtube_video_id: 'fJ9rUzIMcZQ',
          custom_alias: 'bf-deals'
        }
      ];

      const createdLinks = [];
      for (const linkData of campaignLinks) {
        const link = await this.campaignLinkModel.create(linkData.campaign.id, {
          landing_page_url: linkData.landing_page_url,
          youtube_video_id: linkData.youtube_video_id,
          custom_alias: linkData.custom_alias || undefined
        });

        // Update with YouTube metadata
        await this.campaignLinkModel.updateYouTubeMetadata(
          link.id,
          `Sample Video Title for ${linkData.youtube_video_id}`,
          `https://img.youtube.com/vi/${linkData.youtube_video_id}/maxresdefault.jpg`
        );

        createdLinks.push(link);
      }

      console.log('✓ Created sample campaign links');

      // Create sample click events
      const now = new Date();
      const clickEvents = [];

      for (const link of createdLinks) {
        // Generate random clicks for each link (between 10-100 clicks)
        const clickCount = Math.floor(Math.random() * 90) + 10;
        
        for (let i = 0; i < clickCount; i++) {
          const trackingId = uuidv4();
          const clickedAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random time in last 30 days
          
          const clickEvent = await this.clickEventModel.create({
            campaign_link_id: link.id,
            tracking_id: trackingId,
            ip_address: this.generateRandomIP(),
            user_agent: this.getRandomUserAgent(),
            referrer: `https://youtube.com/watch?v=${link.youtube_video_id}`
          });

          clickEvents.push({ ...clickEvent, clicked_at: clickedAt });

          // Some clicks lead to conversions (10-30% conversion rate)
          if (Math.random() < 0.2) {
            // Newsletter signup (most common)
            await this.conversionEventModel.create({
              tracking_id: trackingId,
              campaign_link_id: link.id,
              event_type: ConversionEventType.NEWSLETTER_SIGNUP,
              event_data: { email: `user${i}@example.com` }
            });

            // Some newsletter signups lead to purchases (5-15% of signups)
            if (Math.random() < 0.1) {
              const revenue = Math.floor(Math.random() * 200) + 50; // $50-$250
              await this.conversionEventModel.create({
                tracking_id: trackingId,
                campaign_link_id: link.id,
                event_type: ConversionEventType.PURCHASE,
                revenue_amount: revenue,
                event_data: { 
                  product_id: `prod_${Math.floor(Math.random() * 100)}`,
                  amount: revenue
                }
              });
            }

            // Some signups lead to course enrollment (3-8% of signups)
            if (Math.random() < 0.05) {
              const courseRevenue = Math.floor(Math.random() * 500) + 100; // $100-$600
              await this.conversionEventModel.create({
                tracking_id: trackingId,
                campaign_link_id: link.id,
                event_type: ConversionEventType.COURSE_ENROLLMENT,
                revenue_amount: courseRevenue,
                event_data: { 
                  course_id: `course_${Math.floor(Math.random() * 20)}`,
                  amount: courseRevenue
                }
              });
            }
          }
        }
      }

      console.log('✓ Created sample click events and conversions');
      console.log('Development data seeding completed successfully!');

    } catch (error) {
      console.error('Error seeding development data:', error);
      throw error;
    }
  }

  async seedTestData(): Promise<void> {
    console.log('Seeding test data...');

    try {
      // Create minimal test data
      const testCampaign = await this.campaignModel.create({
        name: 'Test Campaign',
        description: 'Campaign for testing purposes',
        tags: ['test']
      });

      await this.youtubeStatsModel.upsert('test_video_123', 1000000);

      const testLink = await this.campaignLinkModel.create(testCampaign.id, {
        landing_page_url: 'https://test.example.com',
        youtube_video_id: 'test_video_123',
        custom_alias: 'test-link'
      });

      // Create a few test clicks and conversions
      const trackingId = uuidv4();
      await this.clickEventModel.create({
        campaign_link_id: testLink.id,
        tracking_id: trackingId,
        ip_address: '127.0.0.1',
        user_agent: 'Test User Agent',
        referrer: 'https://youtube.com/watch?v=test_video_123'
      });

      await this.conversionEventModel.create({
        tracking_id: trackingId,
        campaign_link_id: testLink.id,
        event_type: ConversionEventType.NEWSLETTER_SIGNUP,
        event_data: { email: 'test@example.com' }
      });

      console.log('✓ Test data seeding completed successfully!');

    } catch (error) {
      console.error('Error seeding test data:', error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    console.log('Clearing all data...');

    try {
      await this.db.query('DELETE FROM conversion_events');
      await this.db.query('DELETE FROM click_events');
      await this.db.query('DELETE FROM campaign_links');
      await this.db.query('DELETE FROM campaigns');
      await this.db.query('DELETE FROM youtube_video_stats');
      
      console.log('✓ All data cleared successfully!');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  private generateRandomIP(): string {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
}