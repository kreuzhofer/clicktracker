-- UP
-- Initial database schema for Campaign Click Tracker

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create campaign_links table
CREATE TABLE IF NOT EXISTS campaign_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    landing_page_url TEXT NOT NULL,
    youtube_video_id VARCHAR(20) NOT NULL,
    youtube_video_title TEXT,
    youtube_thumbnail_url TEXT,
    custom_alias VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create youtube_video_stats table
CREATE TABLE IF NOT EXISTS youtube_video_stats (
    video_id VARCHAR(20) PRIMARY KEY,
    view_count BIGINT NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Create click_events table
CREATE TABLE IF NOT EXISTS click_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_link_id UUID REFERENCES campaign_links(id),
    tracking_id UUID NOT NULL,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    clicked_at TIMESTAMP DEFAULT NOW()
);

-- Create conversion_events table
CREATE TABLE IF NOT EXISTS conversion_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_id UUID NOT NULL,
    campaign_link_id UUID REFERENCES campaign_links(id),
    event_type VARCHAR(50) NOT NULL,
    revenue_amount DECIMAL(10,2),
    event_data JSONB,
    converted_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_links_campaign_id ON campaign_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_links_short_code ON campaign_links(short_code);
CREATE INDEX IF NOT EXISTS idx_click_events_campaign_link_id ON click_events(campaign_link_id);
CREATE INDEX IF NOT EXISTS idx_click_events_tracking_id ON click_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_click_events_clicked_at ON click_events(clicked_at);
CREATE INDEX IF NOT EXISTS idx_conversion_events_tracking_id ON conversion_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_campaign_link_id ON conversion_events(campaign_link_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_converted_at ON conversion_events(converted_at);

-- DOWN
-- Drop all tables and indexes (in reverse order due to foreign key constraints)
DROP INDEX IF EXISTS idx_conversion_events_converted_at;
DROP INDEX IF EXISTS idx_conversion_events_campaign_link_id;
DROP INDEX IF EXISTS idx_conversion_events_tracking_id;
DROP INDEX IF EXISTS idx_click_events_clicked_at;
DROP INDEX IF EXISTS idx_click_events_tracking_id;
DROP INDEX IF EXISTS idx_click_events_campaign_link_id;
DROP INDEX IF EXISTS idx_campaign_links_short_code;
DROP INDEX IF EXISTS idx_campaign_links_campaign_id;

DROP TABLE IF EXISTS conversion_events;
DROP TABLE IF EXISTS click_events;
DROP TABLE IF EXISTS youtube_video_stats;
DROP TABLE IF EXISTS campaign_links;
DROP TABLE IF EXISTS campaigns;