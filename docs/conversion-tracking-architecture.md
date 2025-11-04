# Conversion Tracking System Architecture

## System Overview

The conversion tracking system is designed to attribute user conversions (sales, enrollments, signups) back to YouTube campaign links within a 30-day attribution window. The system uses a combination of server-side attribution logic and client-side tracking persistence.

## Architecture Components

### 1. Core Services

#### ConversionService (`backend/src/services/ConversionService.ts`)
- **Purpose**: Central service for conversion validation, attribution logic, and tracking script generation
- **Key Methods**:
  - `recordConversion()`: Validates and records conversions with attribution window enforcement
  - `getAttributionData()`: Calculates attribution data and window validity
  - `validateConversion()`: Type-specific validation (revenue requirements, etc.)
  - `generateTrackingScript()`: Creates client-side JavaScript tracking library
  - `cleanupAttributionWindow()`: Removes expired attribution data

#### ConversionEventModel (`backend/src/models/ConversionEvent.ts`)
- **Purpose**: Database operations for conversion events
- **Key Features**:
  - CRUD operations for conversion events
  - Revenue aggregation and analytics queries
  - Conversion funnel analysis
  - Attribution window cleanup queries

### 2. API Endpoints

#### Conversion Recording (`POST /api/conversions`)
```typescript
interface CreateConversionEventRequest {
  tracking_id: string;        // UUID from original click
  campaign_link_id: string;   // Campaign link UUID
  event_type: ConversionEventType; // 'newsletter_signup' | 'purchase' | 'course_enrollment'
  revenue_amount?: number;    // Optional revenue (required for purchases)
  event_data?: Record<string, any>; // Additional event metadata
}
```

#### Attribution Data (`GET /api/conversions/attribution/:trackingId`)
Returns complete attribution information including:
- Original click timestamp
- All conversions for the tracking ID
- Total revenue attribution
- Attribution window validity

#### Analytics Endpoints
- `GET /api/conversions/funnel/:campaignLinkId` - Conversion funnel data
- `GET /api/conversions/types/:campaignLinkId` - Revenue by conversion type
- `POST /api/conversions/cleanup` - Manual attribution window cleanup

#### Tracking Script (`GET /api/conversions/script`)
Dynamically generates JavaScript tracking library with proper base URL configuration.

### 3. Client-Side Tracking

#### JavaScript Tracking Library
The system generates a self-contained JavaScript library that:

1. **Initialization**:
   - Extracts tracking parameters from URL (`ct_tracking_id`, `ct_campaign_link_id`)
   - Stores attribution data in sessionStorage for persistence
   - Exposes global `CampaignTracker` object

2. **Attribution Persistence**:
   ```javascript
   // URL parameters → sessionStorage
   ?ct_tracking_id=abc123&ct_campaign_link_id=xyz789
   ↓
   sessionStorage.setItem('ct_tracking_id', 'abc123');
   sessionStorage.setItem('ct_campaign_link_id', 'xyz789');
   ```

3. **Conversion Tracking**:
   - `CampaignTracker.trackNewsletterSignup(options)`
   - `CampaignTracker.trackPurchase(revenue, options)`
   - `CampaignTracker.trackCourseEnrollment(options)`
   - `CampaignTracker.track(eventType, options)` - Generic method

4. **Error Handling**:
   - Graceful degradation when tracking data is missing
   - Network error handling for API calls
   - Console warnings for debugging

## Data Flow Architecture

### 1. Attribution Setup Flow
```
YouTube Video → Campaign Link → Landing Page
     ↓              ↓              ↓
  Video ID    Short Code     Tracking Script
                 ↓              ↓
            Click Event    SessionStorage
                 ↓              ↓
            tracking_id    Persistent Attribution
```

### 2. Conversion Recording Flow
```
User Action → JavaScript Call → API Request → Validation → Database
     ↓              ↓              ↓           ↓           ↓
Course Signup  trackCourseEnrollment()  POST /api/conversions  Attribution Window Check  conversion_events table
```

### 3. Attribution Validation Flow
```
Conversion Request → Get Original Click → Calculate Days → Validate Window → Record/Reject
        ↓                    ↓               ↓              ↓              ↓
   tracking_id        click_events table   Math.floor()   <= 30 days    Success/Error
```

## Database Schema

### Core Tables

#### `click_events`
```sql
CREATE TABLE click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_link_id UUID NOT NULL REFERENCES campaign_links(id),
  tracking_id UUID NOT NULL,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `conversion_events`
```sql
CREATE TABLE conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID NOT NULL,
  campaign_link_id UUID NOT NULL REFERENCES campaign_links(id),
  event_type VARCHAR(50) NOT NULL,
  revenue_amount DECIMAL(10,2),
  event_data JSONB,
  converted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Relationships
- `conversion_events.tracking_id` links to `click_events.tracking_id`
- `conversion_events.campaign_link_id` provides direct campaign attribution
- Foreign key constraints ensure data integrity

## Attribution Window Implementation

### 30-Day Window Calculation
```typescript
const clickTimestamp = new Date(originalClick.clicked_at);
const now = new Date();
const daysSinceClick = Math.floor((now.getTime() - clickTimestamp.getTime()) / (1000 * 60 * 60 * 24));
const isWithinWindow = daysSinceClick <= 30;
```

### Automatic Cleanup
```sql
-- Remove conversions whose original clicks are > 30 days old
DELETE FROM conversion_events 
WHERE tracking_id NOT IN (
  SELECT DISTINCT tracking_id 
  FROM click_events 
  WHERE clicked_at >= NOW() - INTERVAL '30 days'
);
```

### Window Enforcement
- **Recording**: Conversions outside the window are rejected with error
- **Analytics**: Only conversions within window are included in reports
- **Cleanup**: Expired conversions are automatically removed

## Validation & Business Rules

### Event Type Validation
```typescript
switch (eventType) {
  case 'purchase':
    // MUST have positive revenue_amount
    if (!revenue_amount || revenue_amount <= 0) {
      throw new ValidationError('Purchase events must include positive revenue');
    }
    break;
    
  case 'course_enrollment':
    // MAY have revenue_amount, must be positive if provided
    if (revenue_amount && revenue_amount <= 0) {
      throw new ValidationError('Course enrollment revenue must be positive');
    }
    break;
    
  case 'newsletter_signup':
    // SHOULD NOT have revenue_amount (warning only)
    if (revenue_amount) {
      console.warn('Newsletter signups typically do not have revenue');
    }
    break;
}
```

### Revenue Validation
- Maximum 2 decimal places
- Positive values only (when required)
- Warning for unusually high amounts (> $10,000)

### Data Integrity
- UUID validation for tracking_id and campaign_link_id
- JSON validation for event_data
- Campaign link existence verification

## Performance Considerations

### Database Optimization
- Indexes on `tracking_id` for fast attribution lookups
- Indexes on `campaign_link_id` for analytics queries
- Indexes on `clicked_at` for attribution window calculations

### Caching Strategy
- Tracking script is cached with 1-hour TTL
- Attribution data can be cached short-term for analytics
- SessionStorage provides client-side persistence without server load

### Cleanup Operations
- Automatic cleanup runs periodically to remove expired data
- Batch operations for large-scale cleanup
- Configurable retention periods

## Security & Privacy

### Data Protection
- No PII required for basic tracking
- Tracking IDs are UUIDs (not sequential/guessable)
- SessionStorage is more secure than cookies (not sent with requests)

### API Security
- HTTPS required for all API calls
- Input validation on all endpoints
- Rate limiting on conversion recording endpoints

### Privacy Compliance
- No cross-site tracking cookies
- SessionStorage is domain-specific
- Optional event data allows minimal data collection

## Monitoring & Analytics

### Key Metrics
- Conversion rates by campaign link
- Revenue attribution by time period
- Attribution window utilization
- Conversion funnel analysis

### Error Tracking
- Failed conversion recordings
- Attribution window violations
- Client-side tracking errors

### Performance Metrics
- API response times
- Database query performance
- Cleanup operation efficiency

## Scalability Considerations

### Horizontal Scaling
- Stateless API design allows multiple server instances
- Database can be scaled with read replicas for analytics
- Client-side tracking reduces server load

### Data Growth Management
- Automatic cleanup prevents unbounded growth
- Configurable retention periods
- Archival strategies for historical data

### High Availability
- Graceful degradation when tracking fails
- Retry logic in client-side tracking
- Database failover capabilities

## Testing Strategy

### Unit Tests
- ConversionService validation logic
- Attribution window calculations
- Revenue calculation accuracy

### Integration Tests
- End-to-end conversion recording
- Attribution window enforcement
- Cross-domain tracking simulation

### Performance Tests
- Concurrent conversion recording
- Large-scale cleanup operations
- High-volume attribution queries

## Future Enhancements

### Potential Features
- Multiple attribution models (first-click, last-click, linear)
- Custom attribution windows per campaign
- Real-time conversion notifications
- Advanced funnel analysis
- A/B testing integration

### Technical Improvements
- GraphQL API for complex analytics queries
- Real-time analytics with WebSockets
- Machine learning for conversion prediction
- Advanced fraud detection