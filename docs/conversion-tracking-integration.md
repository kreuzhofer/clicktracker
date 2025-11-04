# Conversion Tracking & Attribution Integration Guide

## Overview

The Campaign Click Tracker provides a robust conversion tracking system that allows you to attribute sales, course enrollments, newsletter signups, and other conversions back to your YouTube campaign links. This guide explains how the attribution system works and how to integrate it with your landing pages and conversion systems.

## How Attribution Works

### Attribution Flow Architecture

The system uses a **client-side tracking approach** with session storage persistence, combined with a **JavaScript tracking library** that target systems need to integrate.

```
YouTube Video → Campaign Link → Landing Page → Conversion Tracking
https://youtu.be/abc123 → https://tracker.com/xyz → https://course.com/landing?ct_tracking_id=uuid&ct_campaign_link_id=link_id
```

### 30-Day Attribution Window

- When a user clicks a campaign link, a `click_event` is recorded with a timestamp
- Any conversion that happens within **30 days** of that click can be attributed to the original campaign
- After 30 days, conversions from that tracking ID are no longer considered valid for attribution
- The system automatically cleans up expired attribution data to maintain database efficiency

## Integration Methods

### Method 1: JavaScript Tracking Script (Recommended)

This is the easiest integration method that handles all attribution logic automatically.

#### Step 1: Include the Tracking Script

Add this script to all pages where conversions might happen:

```html
<!-- Include the tracking script -->
<script src="https://your-tracker-api.com/api/conversions/script"></script>
```

The script automatically:
1. Extracts `ct_tracking_id` and `ct_campaign_link_id` from URL parameters
2. Stores them in sessionStorage for cross-page persistence
3. Exposes `window.CampaignTracker` for manual conversion tracking

#### Step 2: Track Conversions

Call the appropriate tracking method when conversions happen:

```javascript
// Newsletter Signup
CampaignTracker.trackNewsletterSignup({
  data: {
    email: 'user@example.com',
    source: 'landing_page'
  }
});

// Course Enrollment
CampaignTracker.trackCourseEnrollment({
  revenue: 299.99, // Optional revenue amount
  data: {
    course_id: 'advanced-marketing-101',
    course_name: 'Advanced Marketing Strategies',
    enrollment_date: new Date().toISOString()
  }
});

// Purchase/Sale
CampaignTracker.trackPurchase(99.99, {
  data: {
    product_id: 'ebook-123',
    product_name: 'Marketing Ebook',
    payment_method: 'stripe',
    order_id: 'order_456'
  }
});

// Custom Event
CampaignTracker.track('custom_event', {
  revenue: 49.99,
  data: {
    event_name: 'webinar_signup',
    webinar_id: 'webinar_789'
  }
});
```

#### Complete Integration Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Course Enrollment</title>
    <!-- Include tracking script -->
    <script src="https://your-tracker-api.com/api/conversions/script"></script>
</head>
<body>
    <form id="enrollmentForm">
        <input type="email" id="email" required>
        <input type="text" id="courseName" value="Advanced Marketing">
        <button type="submit">Enroll Now - $299</button>
    </form>

    <script>
    document.getElementById('enrollmentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Process enrollment (your existing logic)
        processEnrollment().then(function(enrollmentData) {
            // Track the conversion
            CampaignTracker.trackCourseEnrollment({
                revenue: 299.99,
                data: {
                    course_id: enrollmentData.courseId,
                    course_name: enrollmentData.courseName,
                    user_email: enrollmentData.userEmail,
                    enrollment_date: new Date().toISOString()
                }
            });
            
            // Redirect to success page
            window.location.href = '/enrollment-success';
        });
    });
    </script>
</body>
</html>
```

### Method 2: Server-Side API Integration

If you prefer server-side tracking or need more control, you can make direct API calls.

#### API Endpoint

```
POST https://your-tracker-api.com/api/conversions
Content-Type: application/json
```

#### Request Body

```json
{
  "tracking_id": "uuid-from-original-click",
  "campaign_link_id": "campaign-link-uuid",
  "event_type": "course_enrollment",
  "revenue_amount": 299.99,
  "event_data": {
    "course_id": "advanced-marketing-101",
    "course_name": "Advanced Marketing Strategies",
    "user_id": "user_123",
    "enrollment_date": "2024-01-15T10:30:00Z"
  }
}
```

#### Supported Event Types

- `newsletter_signup` - Newsletter subscriptions
- `course_enrollment` - Course enrollments
- `purchase` - Sales/purchases
- Custom event types (contact support for setup)

#### Example Server-Side Integration (Node.js)

```javascript
async function trackConversion(trackingId, campaignLinkId, eventType, revenue, eventData) {
  try {
    const response = await fetch('https://your-tracker-api.com/api/conversions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tracking_id: trackingId,
        campaign_link_id: campaignLinkId,
        event_type: eventType,
        revenue_amount: revenue,
        event_data: eventData
      })
    });

    if (!response.ok) {
      console.error('Failed to track conversion:', response.status);
    }

    return await response.json();
  } catch (error) {
    console.error('Conversion tracking error:', error);
  }
}

// Usage
await trackConversion(
  'user-tracking-uuid',
  'campaign-link-uuid', 
  'course_enrollment',
  299.99,
  {
    course_id: 'advanced-marketing-101',
    user_id: 'user_123'
  }
);
```

## Attribution Persistence

### How Tracking IDs Persist

The system uses **sessionStorage** (not cookies) to maintain attribution across page visits:

```javascript
// On landing page (with URL parameters)
// URL: https://course.com/landing?ct_tracking_id=abc123&ct_campaign_link_id=xyz789

sessionStorage.setItem('ct_tracking_id', 'abc123');
sessionStorage.setItem('ct_campaign_link_id', 'xyz789');

// On subsequent pages (no URL parameters needed)
// URL: https://course.com/checkout

var trackingId = sessionStorage.getItem('ct_tracking_id'); // Still available!
var campaignLinkId = sessionStorage.getItem('ct_campaign_link_id'); // Still available!
```

### Cross-Page Tracking Example

```
Day 1: User Journey
├── Clicks YouTube link with campaign tracking
├── Lands on https://course.com/landing?ct_tracking_id=abc123&ct_campaign_link_id=xyz789
├── Script stores IDs in sessionStorage
├── User browses multiple pages: /about, /pricing, /testimonials
├── User leaves without converting

Day 3: User Returns
├── User visits https://course.com directly (no tracking params)
├── Script retrieves IDs from sessionStorage (still available!)
├── User enrolls in course
├── CampaignTracker.trackCourseEnrollment() called
└── Conversion successfully attributed to original YouTube campaign
```

## Error Handling & Validation

### Attribution Window Validation

The system automatically validates that conversions are within the 30-day attribution window:

```javascript
// This will succeed if within 30 days of original click
CampaignTracker.trackPurchase(99.99, { data: { product: 'ebook' } });

// This will fail if outside 30-day window
// Error: "Conversion is outside the 30-day attribution window"
```

### Revenue Validation

- **Purchase events** must include a positive revenue amount
- **Course enrollment** revenue is optional but must be positive if provided
- **Newsletter signup** typically doesn't include revenue (warning if provided)
- Revenue amounts are validated to 2 decimal places

### Missing Tracking Data

The script handles missing tracking data gracefully:

```javascript
// If no tracking ID is found, warnings are logged but no errors thrown
CampaignTracker.trackPurchase(99.99); 
// Console: "Campaign Tracker: No tracking ID found"
```

## Testing & Debugging

### Debug Mode

Enable debug logging by setting a global variable:

```javascript
window.CT_DEBUG = true;
```

### Manual Testing

You can manually test attribution by adding tracking parameters to any URL:

```
https://your-site.com/landing?ct_tracking_id=test-123&ct_campaign_link_id=test-456
```

### Verify Attribution Data

Check what attribution data is stored:

```javascript
console.log('Tracking ID:', sessionStorage.getItem('ct_tracking_id'));
console.log('Campaign Link ID:', sessionStorage.getItem('ct_campaign_link_id'));
console.log('Tracker Object:', window.CampaignTracker);
```

## Analytics & Reporting

### Available Analytics Endpoints

Once conversions are tracked, you can access analytics through these API endpoints:

- `GET /api/conversions/attribution/:trackingId` - Get attribution data for a specific user
- `GET /api/conversions/funnel/:campaignLinkId` - Get conversion funnel data
- `GET /api/conversions/types/:campaignLinkId` - Get conversions grouped by type

### Attribution Data Structure

```json
{
  "tracking_id": "user-uuid-123",
  "campaign_link_id": "campaign-link-uuid",
  "click_timestamp": "2024-01-01T10:00:00Z",
  "conversions": [
    {
      "id": "conversion-uuid",
      "event_type": "course_enrollment",
      "revenue_amount": 299.99,
      "converted_at": "2024-01-03T15:30:00Z",
      "event_data": {
        "course_id": "advanced-marketing-101"
      }
    }
  ],
  "total_revenue": 299.99,
  "conversion_count": 1,
  "attribution_window_days": 30,
  "is_within_window": true
}
```

## Best Practices

### 1. Include Script on All Pages

Include the tracking script on all pages where users might convert, not just landing pages:

```html
<!-- Include on ALL pages -->
<script src="https://your-tracker-api.com/api/conversions/script"></script>
```

### 2. Track Conversions Immediately

Call tracking methods immediately after successful conversions:

```javascript
// ✅ Good - Track immediately after successful action
processPayment().then(function(result) {
  if (result.success) {
    CampaignTracker.trackPurchase(result.amount, {
      data: { order_id: result.orderId }
    });
  }
});

// ❌ Bad - Don't delay tracking
setTimeout(function() {
  CampaignTracker.trackPurchase(99.99); // User might have left
}, 5000);
```

### 3. Include Relevant Event Data

Provide meaningful event data for better analytics:

```javascript
// ✅ Good - Rich event data
CampaignTracker.trackCourseEnrollment({
  revenue: 299.99,
  data: {
    course_id: 'advanced-marketing-101',
    course_name: 'Advanced Marketing Strategies',
    course_category: 'marketing',
    instructor: 'John Doe',
    enrollment_date: new Date().toISOString(),
    user_segment: 'premium'
  }
});

// ❌ Minimal - Less useful for analysis
CampaignTracker.trackCourseEnrollment({
  revenue: 299.99
});
```

### 4. Handle Errors Gracefully

The tracking script is designed to fail silently, but you can add your own error handling:

```javascript
CampaignTracker.trackPurchase(99.99, { data: { product: 'ebook' } })
  .then(function(response) {
    console.log('Conversion tracked successfully');
  })
  .catch(function(error) {
    console.log('Tracking failed, but purchase still processed');
    // Don't block the user experience for tracking failures
  });
```

## Troubleshooting

### Common Issues

**1. Conversions Not Being Tracked**
- Verify the tracking script is loaded: `console.log(window.CampaignTracker)`
- Check sessionStorage: `console.log(sessionStorage.getItem('ct_tracking_id'))`
- Ensure tracking methods are called after successful conversions

**2. "Outside Attribution Window" Errors**
- Check if more than 30 days have passed since the original click
- Verify the click was properly recorded in the system

**3. Missing Revenue Data**
- Ensure purchase events include revenue amounts
- Check that revenue is a positive number with max 2 decimal places

**4. Cross-Domain Issues**
- SessionStorage is domain-specific - ensure all conversion pages are on the same domain
- For cross-domain scenarios, consider server-side integration

### Support

For additional support or custom integration requirements, contact the development team with:
- Your domain/website URL
- Specific conversion events you need to track
- Any custom requirements or constraints

## Security Considerations

- Tracking IDs are UUIDs and don't contain sensitive information
- SessionStorage is more secure than cookies (not sent with requests)
- All API calls are made over HTTPS
- No personal data is required for basic conversion tracking
- Event data should not include sensitive information (passwords, payment details, etc.)