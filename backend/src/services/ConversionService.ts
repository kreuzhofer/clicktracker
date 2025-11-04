import { ConversionEventModel } from '../models/ConversionEvent';
import { ClickEventModel } from '../models/ClickEvent';
import { CampaignLinkModel } from '../models/CampaignLink';
import { CreateConversionEventRequest, ConversionEvent, ConversionEventType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface AttributionData {
  tracking_id: string;
  campaign_link_id: string;
  click_timestamp: Date;
  conversions: ConversionEvent[];
  total_revenue: number;
  conversion_count: number;
  attribution_window_days: number;
  is_within_window: boolean;
}

export interface ConversionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConversionService {
  private conversionModel: ConversionEventModel;
  private clickModel: ClickEventModel;
  private campaignLinkModel: CampaignLinkModel;
  private readonly ATTRIBUTION_WINDOW_DAYS = 30;

  constructor() {
    this.conversionModel = new ConversionEventModel();
    this.clickModel = new ClickEventModel();
    this.campaignLinkModel = new CampaignLinkModel();
  }

  /**
   * Record a conversion event with attribution validation
   */
  async recordConversion(conversionData: CreateConversionEventRequest): Promise<ConversionEvent> {
    // Validate the conversion data
    const validation = await this.validateConversion(conversionData);
    if (!validation.isValid) {
      throw new Error(`Conversion validation failed: ${validation.errors.join(', ')}`);
    }

    // Check if tracking ID exists and is within attribution window
    const attribution = await this.getAttributionData(conversionData.tracking_id);
    if (!attribution.is_within_window) {
      throw new Error('Conversion is outside the 30-day attribution window');
    }

    // Verify campaign link exists
    const campaignLink = await this.campaignLinkModel.findById(conversionData.campaign_link_id);
    if (!campaignLink) {
      throw new Error('Campaign link not found');
    }

    // Create the conversion event
    return await this.conversionModel.create(conversionData);
  }

  /**
   * Validate conversion data based on event type
   */
  async validateConversion(conversionData: CreateConversionEventRequest): Promise<ConversionValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!conversionData.tracking_id) {
      errors.push('Tracking ID is required');
    }

    if (!conversionData.campaign_link_id) {
      errors.push('Campaign link ID is required');
    }

    if (!Object.values(ConversionEventType).includes(conversionData.event_type)) {
      errors.push('Invalid event type');
    }

    // Event type specific validation
    switch (conversionData.event_type) {
      case ConversionEventType.PURCHASE:
        if (!conversionData.revenue_amount || conversionData.revenue_amount <= 0) {
          errors.push('Purchase events must include a positive revenue amount');
        }
        if (conversionData.revenue_amount && conversionData.revenue_amount > 10000) {
          warnings.push('Revenue amount is unusually high');
        }
        break;

      case ConversionEventType.COURSE_ENROLLMENT:
        if (conversionData.revenue_amount && conversionData.revenue_amount <= 0) {
          errors.push('Course enrollment revenue must be positive if provided');
        }
        break;

      case ConversionEventType.NEWSLETTER_SIGNUP:
        if (conversionData.revenue_amount !== undefined && conversionData.revenue_amount !== null) {
          if (conversionData.revenue_amount <= 0) {
            errors.push('Revenue amount must be positive');
          } else {
            warnings.push('Newsletter signups typically do not have revenue amounts');
          }
        }
        break;
    }

    // Validate event data structure if provided
    if (conversionData.event_data) {
      try {
        JSON.stringify(conversionData.event_data);
      } catch (error) {
        errors.push('Event data must be valid JSON');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get attribution data for a tracking ID
   */
  async getAttributionData(trackingId: string): Promise<AttributionData> {
    // Get the original click event
    const clicks = await this.clickModel.findByTrackingId(trackingId);
    if (clicks.length === 0) {
      throw new Error('No click event found for tracking ID');
    }

    const originalClick = clicks[0]; // Most recent click
    const clickTimestamp = new Date(originalClick.clicked_at);
    const now = new Date();
    const daysSinceClick = Math.floor((now.getTime() - clickTimestamp.getTime()) / (1000 * 60 * 60 * 24));
    const isWithinWindow = daysSinceClick <= this.ATTRIBUTION_WINDOW_DAYS;

    // Get all conversions for this tracking ID
    const conversions = await this.conversionModel.findByTrackingId(trackingId);
    
    // Calculate total revenue
    const totalRevenue = conversions.reduce((sum, conversion) => {
      const revenueAmount = conversion.revenue_amount ? 
        (typeof conversion.revenue_amount === 'string' ? parseFloat(conversion.revenue_amount) : conversion.revenue_amount) : 0;
      return sum + revenueAmount;
    }, 0);

    return {
      tracking_id: trackingId,
      campaign_link_id: originalClick.campaign_link_id,
      click_timestamp: clickTimestamp,
      conversions,
      total_revenue: totalRevenue,
      conversion_count: conversions.length,
      attribution_window_days: this.ATTRIBUTION_WINDOW_DAYS,
      is_within_window: isWithinWindow
    };
  }

  /**
   * Get conversion funnel data for a campaign link
   */
  async getConversionFunnel(campaignLinkId: string): Promise<Array<{ step: string; count: number; rate: number }>> {
    return await this.conversionModel.getConversionFunnel(campaignLinkId);
  }

  /**
   * Get conversions by event type for analytics
   */
  async getConversionsByType(campaignLinkId: string): Promise<Array<{ event_type: string; revenue: number; count: number }>> {
    return await this.conversionModel.getRevenueByEventType(campaignLinkId);
  }

  /**
   * Clean up conversions outside attribution window
   */
  async cleanupAttributionWindow(): Promise<number> {
    return await this.conversionModel.cleanupAttributionWindow();
  }

  /**
   * Get conversion rate for a specific event type
   */
  async getConversionRate(campaignLinkId: string, eventType?: ConversionEventType): Promise<number> {
    const totalClicks = await this.clickModel.countByCampaignLinkId(campaignLinkId);
    if (totalClicks === 0) return 0;

    let conversions: number;
    if (eventType) {
      conversions = await this.conversionModel.countByEventType(eventType, campaignLinkId);
    } else {
      conversions = await this.conversionModel.countByCampaignLinkId(campaignLinkId);
    }

    return (conversions / totalClicks) * 100;
  }

  /**
   * Generate tracking script for embedding in landing pages
   */
  generateTrackingScript(baseUrl: string): string {
    return `
(function() {
  // Campaign Click Tracker - Conversion Tracking Script
  var tracker = {
    baseUrl: '${baseUrl}',
    trackingId: null,
    
    init: function() {
      // Extract tracking ID from URL parameters with graceful fallback
      try {
        var search = window.location ? window.location.search : '';
        var urlParams = new URLSearchParams(search);
        this.trackingId = urlParams.get('ct_tracking_id') || urlParams.get('tracking_id');
        
        if (this.trackingId) {
          // Store tracking ID in session storage for cross-page tracking
          sessionStorage.setItem('ct_tracking_id', this.trackingId);
          
          // Store campaign link ID if provided
          var campaignLinkId = urlParams.get('ct_campaign_link_id') || urlParams.get('campaign_link_id');
          if (campaignLinkId) {
            sessionStorage.setItem('ct_campaign_link_id', campaignLinkId);
          }
        } else {
          // Try to get from session storage
          this.trackingId = sessionStorage.getItem('ct_tracking_id');
        }
      } catch (error) {
        console.warn('Campaign Tracker: Unable to access window.location, falling back to session storage');
        this.trackingId = sessionStorage.getItem('ct_tracking_id');
      }
    },
    
    track: function(eventType, options) {
      if (!this.trackingId) {
        console.warn('Campaign Tracker: No tracking ID found');
        return Promise.resolve();
      }
      
      var campaignLinkId = sessionStorage.getItem('ct_campaign_link_id');
      if (!campaignLinkId) {
        console.warn('Campaign Tracker: No campaign link ID found');
        return Promise.resolve();
      }
      
      var data = {
        tracking_id: this.trackingId,
        campaign_link_id: campaignLinkId,
        event_type: eventType,
        revenue_amount: options && options.revenue ? parseFloat(options.revenue) : undefined,
        event_data: options && options.data ? options.data : {}
      };
      
      // Add page context with graceful fallbacks
      try {
        data.event_data.page_url = window.location ? window.location.href : 'unknown';
      } catch (error) {
        data.event_data.page_url = 'unknown';
      }
      
      try {
        data.event_data.page_title = document.title || 'unknown';
      } catch (error) {
        data.event_data.page_title = 'unknown';
      }
      
      data.event_data.timestamp = new Date().toISOString();
      
      return fetch(this.baseUrl + '/api/conversions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }).then(function(response) {
        if (!response.ok) {
          console.error('Campaign Tracker: Failed to record conversion', response.status);
        }
        return response.json();
      }).catch(function(error) {
        console.error('Campaign Tracker: Network error', error);
      });
    },
    
    // Convenience methods for common events
    trackNewsletterSignup: function(options) {
      return this.track('newsletter_signup', options);
    },
    
    trackPurchase: function(revenue, options) {
      var opts = options || {};
      opts.revenue = revenue;
      return this.track('purchase', opts);
    },
    
    trackCourseEnrollment: function(options) {
      return this.track('course_enrollment', options);
    }
  };
  
  // Initialize tracker
  tracker.init();
  
  // Expose to global scope
  window.CampaignTracker = tracker;
  
  // Auto-track page view if enabled
  if (window.CT_AUTO_TRACK_PAGEVIEW !== false) {
    // Small delay to ensure page is loaded
    setTimeout(function() {
      if (tracker.trackingId) {
        tracker.track('page_view', {
          data: {
            referrer: document.referrer,
            user_agent: navigator.userAgent
          }
        });
      }
    }, 100);
  }
})();
`;
  }

  /**
   * Test attribution accuracy across different time windows
   */
  async testAttributionAccuracy(trackingId: string, testScenarios: Array<{
    conversionDate: Date;
    eventType: ConversionEventType;
    expectedWithinWindow: boolean;
  }>): Promise<Array<{
    scenario: any;
    result: AttributionData | null;
    accuracyCheck: boolean;
  }>> {
    const results = [];
    
    for (const scenario of testScenarios) {
      try {
        const attribution = await this.getAttributionData(trackingId);
        const accuracyCheck = attribution.is_within_window === scenario.expectedWithinWindow;
        
        results.push({
          scenario,
          result: attribution,
          accuracyCheck
        });
      } catch (error) {
        results.push({
          scenario,
          result: null,
          accuracyCheck: false
        });
      }
    }
    
    return results;
  }
}