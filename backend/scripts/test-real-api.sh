#!/bin/bash

# Script to run real YouTube API tests
# This script sets up the environment and runs the real API tests

set -e

echo "🚀 Running Real YouTube API Tests"
echo "=================================="

# Check if .env.development exists
if [ ! -f "../.env.development" ]; then
    echo "❌ Error: .env.development file not found"
    echo "Please ensure .env.development exists with YOUTUBE_API_KEY"
    exit 1
fi

# Source environment variables from .env.development
export $(grep -v '^#' ../.env.development | xargs)

# Check if YouTube API key is set
if [ -z "$YOUTUBE_API_KEY" ]; then
    echo "❌ Error: YOUTUBE_API_KEY not found in .env.development"
    echo "Please add your YouTube API key to .env.development"
    exit 1
fi

# Check if it's the test API key
if [ "$YOUTUBE_API_KEY" = "test-youtube-api-key" ]; then
    echo "⚠️  Warning: Using test API key - tests will fail"
    echo "Please set a real YouTube Data API v3 key in .env.development"
    echo "Continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
else
    echo "✅ YouTube API key found"
fi
echo "🔧 Setting up test database..."

# Start test database
npm run test:db:up
sleep 5

echo "🧪 Running real API tests..."
echo "⚠️  Note: These tests make actual API calls to YouTube"
echo "⚠️  They may consume your API quota and take longer to run"
echo ""

# Run the real API tests
REAL_API_TESTS=true npm run test:integration:real-api

# Cleanup
echo "🧹 Cleaning up test database..."
npm run test:db:down

echo "✅ Real API tests completed!"