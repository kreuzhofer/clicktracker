import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';
import { JSDOM } from 'jsdom';

describe('Tracking Script Integration', () => {
  let authToken: string;
  let campaign: any;
  let campaignLink: any;
  let clickEvent: any;

  beforeEach(async () => {
    // Create test user and get auth token
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const userEmail = `test-${timestamp}-${randomId}@example.com`;
    
    await TestHelpers.createTestUser({ email: userEmail });
    authToken = await TestHelpers.loginTestUser(userEmail);

    // Create test campaign and campaign link
    campaign = await TestHelpers.createTestCampaign({
      name: `Test Campaign ${timestamp}-${randomId}`
    });
    
    campaignLink = await TestHelpers.createTestCampaignLink(campaign.id, {
      landing_page_url: 'https://example.com/landing',
      youtube_video_id: 'dQw4w9WgXcQ'
    });

    // Create test click event
    clickEvent = await TestHelpers.createTestClick(campaignLink.id);
  });

  describe('Tracking Script Generation', () => {
    it('should generate valid JavaScript tracking script', async () => {
      const response = await request(app)
        .get('/api/conversions/script')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/javascript');
      expect(response.text).toContain('CampaignTracker');
      
      // Validate JavaScript syntax by trying to parse it
      expect(() => {
        new Function(response.text);
      }).not.toThrow();
    });

    it('should include all required tracking methods', async () => {
      const response = await request(app)
        .get('/api/conversions/script')
        .expect(200);

      const script = response.text;
      
      // Check for core methods
      expect(script).toContain('trackNewsletterSignup');
      expect(script).toContain('trackPurchase');
      expect(script).toContain('trackCourseEnrollment');
      expect(script).toContain('track');
      expect(script).toContain('init');
    });

    it('should include proper error handling', async () => {
      const response = await request(app)
        .get('/api/conversions/script')
        .expect(200);

      const script = response.text;
      
      expect(script).toContain('console.warn');
      expect(script).toContain('console.error');
      expect(script).toContain('catch');
    });

    it('should set correct cache headers', async () => {
      const response = await request(app)
        .get('/api/conversions/script')
        .expect(200);

      expect(response.headers['cache-control']).toBe('public, max-age=3600');
    });
  });

  describe('Cross-Domain Tracking Simulation', () => {
    let dom: JSDOM;
    let window: any;
    let document: any;

    beforeEach(async () => {
      // Get the tracking script
      const scriptResponse = await request(app)
        .get('/api/conversions/script')
        .expect(200);

      // Create a simulated browser environment
      const landingPageUrl = `https://example.com/landing?ct_tracking_id=${clickEvent.tracking_id}&ct_campaign_link_id=${campaignLink.id}`;
      
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head><title>Test Landing Page</title></head>
          <body>
            <h1>Welcome to our landing page</h1>
            <form id="newsletter-form">
              <input type="email" id="email" value="test@example.com">
              <button type="submit">Subscribe</button>
            </form>
          </body>
        </html>
      `, {
        url: landingPageUrl,
        pretendToBeVisual: true,
        resources: 'usable'
      });

      window = dom.window;
      document = window.document;

      // Ensure window.location is properly accessible
      try {
        delete (window as any).location;
        Object.defineProperty(window, 'location', {
          value: new URL(landingPageUrl),
          writable: true,
          configurable: true
        });
      } catch (error) {
        // If we can't redefine location, at least ensure it has the required properties
        if (window.location) {
          (window.location as any).href = landingPageUrl;
          (window.location as any).search = new URL(landingPageUrl).search;
        }
      }

      // Mock fetch for the tracking calls
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      window.fetch = mockFetch;

      // Mock sessionStorage
      const mockStore: { [key: string]: string } = {};
      const sessionStorage = {
        store: mockStore,
        getItem: jest.fn((key: string): string | null => mockStore[key] || null),
        setItem: jest.fn((key: string, value: string): void => {
          mockStore[key] = value;
        }),
        removeItem: jest.fn((key: string): void => {
          delete mockStore[key];
        }),
        clear: jest.fn((): void => {
          Object.keys(mockStore).forEach(key => delete mockStore[key]);
        })
      };
      Object.defineProperty(window, 'sessionStorage', {
        value: sessionStorage,
        writable: true
      });

      // Execute the tracking script in the simulated environment
      const scriptFunction = new Function('window', 'document', 'sessionStorage', 'fetch', 'console', 'URLSearchParams', 'setTimeout', scriptResponse.text);
      scriptFunction(window, document, sessionStorage, mockFetch, console, window.URLSearchParams, setTimeout);
    });

    afterEach(() => {
      dom.window.close();
    });

    it('should initialize tracking ID from URL parameters', () => {
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('ct_tracking_id', clickEvent.tracking_id);
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('ct_campaign_link_id', campaignLink.id);
    });

    it('should expose CampaignTracker to global scope', () => {
      expect(window.CampaignTracker).toBeDefined();
      expect(typeof window.CampaignTracker.track).toBe('function');
      expect(typeof window.CampaignTracker.trackNewsletterSignup).toBe('function');
      expect(typeof window.CampaignTracker.trackPurchase).toBe('function');
      expect(typeof window.CampaignTracker.trackCourseEnrollment).toBe('function');
    });

    it('should track newsletter signup', async () => {
      const tracker = window.CampaignTracker;
      
      await tracker.trackNewsletterSignup({
        data: { email: 'test@example.com' }
      });

      expect(window.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversions'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"event_type":"newsletter_signup"')
        })
      );
    });

    it('should track purchase with revenue', async () => {
      const tracker = window.CampaignTracker;
      
      await tracker.trackPurchase(99.99, {
        data: { product_id: 'prod_123' }
      });

      expect(window.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversions'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"revenue_amount":99.99')
        })
      );
    });

    it('should track course enrollment', async () => {
      const tracker = window.CampaignTracker;
      
      await tracker.trackCourseEnrollment({
        data: { course_id: 'course_123' }
      });

      expect(window.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversions'),
        expect.objectContaining({
          body: expect.stringContaining('"event_type":"course_enrollment"')
        })
      );
    });

    it('should include page context in tracking data', async () => {
      const tracker = window.CampaignTracker;
      
      await tracker.track('newsletter_signup', {});

      const fetchCall = (window.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.event_data.page_url).toBe(window.location.href);
      expect(requestBody.event_data.page_title).toBe(document.title);
      expect(requestBody.event_data.timestamp).toBeDefined();
    });

    it('should handle missing tracking ID gracefully', () => {
      // Clear session storage
      window.sessionStorage.clear();
      
      // Create new tracker instance without tracking ID
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const tracker = window.CampaignTracker;
      tracker.trackingId = null;
      
      tracker.track('newsletter_signup', {});
      
      expect(consoleSpy).toHaveBeenCalledWith('Campaign Tracker: No tracking ID found');
      expect(window.fetch).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle missing campaign link ID gracefully', () => {
      // Set tracking ID but clear campaign link ID
      window.sessionStorage.setItem('ct_tracking_id', clickEvent.tracking_id);
      window.sessionStorage.removeItem('ct_campaign_link_id');
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const tracker = window.CampaignTracker;
      tracker.trackingId = clickEvent.tracking_id;
      
      tracker.track('newsletter_signup', {});
      
      expect(consoleSpy).toHaveBeenCalledWith('Campaign Tracker: No campaign link ID found');
      expect(window.fetch).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle network errors gracefully', async () => {
      // Get fresh script response
      const scriptResponse = await request(app)
        .get('/api/conversions/script')
        .expect(200);
        
      // Re-execute script with network error mock
      const networkErrorMock = jest.fn().mockRejectedValue(new Error('Network error'));
      window.fetch = networkErrorMock;
      
      const scriptFunction = new Function('window', 'document', 'sessionStorage', 'fetch', 'console', 'URLSearchParams', 'setTimeout', scriptResponse.text);
      scriptFunction(window, document, window.sessionStorage, networkErrorMock, console, window.URLSearchParams, setTimeout);
      
      const tracker = window.CampaignTracker;
      
      // Ensure tracker has required IDs
      tracker.trackingId = clickEvent.tracking_id;
      window.sessionStorage.setItem('ct_tracking_id', clickEvent.tracking_id);
      window.sessionStorage.setItem('ct_campaign_link_id', campaignLink.id);
      
      await tracker.trackNewsletterSignup({});
      
      // Verify fetch was called (which means the error handling was triggered)
      expect(networkErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversions'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      // Get fresh script response
      const scriptResponse = await request(app)
        .get('/api/conversions/script')
        .expect(200);
        
      // Re-execute script with API error mock
      const apiErrorMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad Request' })
      });
      window.fetch = apiErrorMock;
      
      const scriptFunction = new Function('window', 'document', 'sessionStorage', 'fetch', 'console', 'URLSearchParams', 'setTimeout', scriptResponse.text);
      scriptFunction(window, document, window.sessionStorage, apiErrorMock, console, window.URLSearchParams, setTimeout);
      
      const tracker = window.CampaignTracker;
      
      // Ensure tracker has required IDs
      tracker.trackingId = clickEvent.tracking_id;
      window.sessionStorage.setItem('ct_tracking_id', clickEvent.tracking_id);
      window.sessionStorage.setItem('ct_campaign_link_id', campaignLink.id);
      
      await tracker.trackNewsletterSignup({});
      
      // Verify fetch was called and response was handled
      expect(apiErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversions'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });

  describe('Multi-Page Tracking Simulation', () => {
    it('should persist tracking ID across page navigation', async () => {
      // Get the tracking script
      const scriptResponse = await request(app)
        .get('/api/conversions/script')
        .expect(200);

      // Simulate first page (landing page with tracking parameters)
      const landingPageUrl = `https://example.com/landing?ct_tracking_id=${clickEvent.tracking_id}&ct_campaign_link_id=${campaignLink.id}`;
      
      const landingDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: landingPageUrl
      });

      const landingWindow = landingDom.window;
      
      // Ensure window.location is properly accessible
      try {
        delete (landingWindow as any).location;
        Object.defineProperty(landingWindow, 'location', {
          value: new URL(landingPageUrl),
          writable: true,
          configurable: true
        });
      } catch (error) {
        // If we can't redefine location, at least ensure it has the required properties
        if (landingWindow.location) {
          (landingWindow.location as any).href = landingPageUrl;
          (landingWindow.location as any).search = new URL(landingPageUrl).search;
        }
      }
      const landingStore: { [key: string]: string } = {};
      const sessionStorage = {
        store: landingStore,
        getItem: (key: string): string | null => landingStore[key] || null,
        setItem: (key: string, value: string): void => { landingStore[key] = value; },
        removeItem: (key: string): void => { delete landingStore[key]; },
        clear: (): void => { Object.keys(landingStore).forEach(key => delete landingStore[key]); }
      };
      Object.defineProperty(landingWindow, 'sessionStorage', {
        value: sessionStorage,
        writable: true
      });

      // Execute script on landing page
      const scriptFunction = new Function('window', 'document', 'sessionStorage', 'fetch', 'console', 'URLSearchParams', 'setTimeout', scriptResponse.text);
      scriptFunction(landingWindow, landingWindow.document, sessionStorage, fetch, console, landingWindow.URLSearchParams, setTimeout);

      // Verify tracking ID is stored
      expect(sessionStorage.getItem('ct_tracking_id')).toBe(clickEvent.tracking_id);
      expect(sessionStorage.getItem('ct_campaign_link_id')).toBe(campaignLink.id);

      landingDom.window.close();

      // Simulate second page (thank you page without tracking parameters)
      const thankYouPageUrl = 'https://example.com/thank-you';
      
      const thankYouDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: thankYouPageUrl
      });

      const thankYouWindow = thankYouDom.window;
      
      // Ensure window.location is properly accessible
      try {
        delete (thankYouWindow as any).location;
        Object.defineProperty(thankYouWindow, 'location', {
          value: new URL(thankYouPageUrl),
          writable: true,
          configurable: true
        });
      } catch (error) {
        // If we can't redefine location, at least ensure it has the required properties
        if (thankYouWindow.location) {
          (thankYouWindow.location as any).href = thankYouPageUrl;
          (thankYouWindow.location as any).search = new URL(thankYouPageUrl).search;
        }
      }
      Object.defineProperty(thankYouWindow, 'sessionStorage', {
        value: sessionStorage,
        writable: true
      }); // Same session storage

      const thankYouMockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      thankYouWindow.fetch = thankYouMockFetch;

      // Execute script on thank you page
      scriptFunction(thankYouWindow, thankYouWindow.document, sessionStorage, thankYouMockFetch, console, thankYouWindow.URLSearchParams, setTimeout);

      // Verify tracker can still access tracking ID from session storage
      expect(thankYouWindow.CampaignTracker.trackingId).toBe(clickEvent.tracking_id);
      
      // Ensure campaign link ID is also available
      expect(sessionStorage.getItem('ct_campaign_link_id')).toBe(campaignLink.id);

      // Test tracking on second page
      await thankYouWindow.CampaignTracker.trackNewsletterSignup({});

      expect(thankYouMockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversions'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(`"tracking_id":"${clickEvent.tracking_id}"`)
        })
      );

      thankYouDom.window.close();
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent tracking calls', async () => {
      const scriptResponse = await request(app)
        .get('/api/conversions/script')
        .expect(200);

      const testUrl = `https://example.com/landing?ct_tracking_id=${clickEvent.tracking_id}&ct_campaign_link_id=${campaignLink.id}`;
      const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
        url: testUrl
      });

      const window = dom.window;
      
      // Ensure window.location is properly accessible
      try {
        delete (window as any).location;
        Object.defineProperty(window, 'location', {
          value: new URL(testUrl),
          writable: true,
          configurable: true
        });
      } catch (error) {
        // If we can't redefine location, at least ensure it has the required properties
        if (window.location) {
          (window.location as any).href = testUrl;
          (window.location as any).search = new URL(testUrl).search;
        }
      }
      const concurrentStore: { [key: string]: string } = {};
      const sessionStorage = {
        store: concurrentStore,
        getItem: (key: string): string | null => concurrentStore[key] || null,
        setItem: (key: string, value: string): void => { concurrentStore[key] = value; }
      };
      Object.defineProperty(window, 'sessionStorage', {
        value: sessionStorage,
        writable: true
      });

      let fetchCallCount = 0;
      const concurrentMockFetch = jest.fn().mockImplementation(() => {
        fetchCallCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });
      window.fetch = concurrentMockFetch;

      // Execute script
      const scriptFunction = new Function('window', 'document', 'sessionStorage', 'fetch', 'console', 'URLSearchParams', 'setTimeout', scriptResponse.text);
      scriptFunction(window, window.document, sessionStorage, concurrentMockFetch, console, window.URLSearchParams, setTimeout);

      const tracker = window.CampaignTracker;

      // Make multiple concurrent tracking calls
      const promises = [
        tracker.trackNewsletterSignup({}),
        tracker.trackPurchase(99.99, {}),
        tracker.trackCourseEnrollment({}),
        tracker.track('newsletter_signup', {}),
        tracker.track('purchase', { revenue: 199.99 })
      ];

      await Promise.all(promises);

      expect(fetchCallCount).toBe(5);
      expect(concurrentMockFetch).toHaveBeenCalledTimes(5);

      dom.window.close();
    });

    it('should have minimal performance impact on page load', async () => {
      const scriptResponse = await request(app)
        .get('/api/conversions/script')
        .expect(200);

      // Measure script execution time
      const startTime = Date.now();
      
      const testUrl = `https://example.com/landing?ct_tracking_id=${clickEvent.tracking_id}&ct_campaign_link_id=${campaignLink.id}`;
      const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
        url: testUrl
      });

      const window = dom.window;
      
      // Ensure window.location is properly accessible
      try {
        delete (window as any).location;
        Object.defineProperty(window, 'location', {
          value: new URL(testUrl),
          writable: true,
          configurable: true
        });
      } catch (error) {
        // If we can't redefine location, at least ensure it has the required properties
        if (window.location) {
          (window.location as any).href = testUrl;
          (window.location as any).search = new URL(testUrl).search;
        }
      }
      
      const performanceStore: { [key: string]: string } = {};
      const sessionStorage = {
        store: performanceStore,
        getItem: (key: string): string | null => performanceStore[key] || null,
        setItem: (key: string, value: string): void => { performanceStore[key] = value; }
      };
      Object.defineProperty(window, 'sessionStorage', {
        value: sessionStorage,
        writable: true
      });

      // Execute script
      const scriptFunction = new Function('window', 'document', 'sessionStorage', 'URLSearchParams', 'setTimeout', scriptResponse.text);
      scriptFunction(window, window.document, sessionStorage, window.URLSearchParams, setTimeout);

      const executionTime = Date.now() - startTime;

      // Script should execute quickly (under 100ms)
      expect(executionTime).toBeLessThan(100);
      expect(window.CampaignTracker).toBeDefined();

      dom.window.close();
    });
  });
});