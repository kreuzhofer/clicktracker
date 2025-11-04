#!/usr/bin/env node

/**
 * Simple script to validate YouTube API key
 * Usage: node scripts/validate-youtube-api.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.development
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '..', '.env.development');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.development file not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]*?)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });
  
  return envVars;
}

async function validateApiKey(apiKey) {
  try {
    console.log('🔍 Testing YouTube API key...');
    
    // Make a simple API call to validate the key
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet',
        id: 'dQw4w9WgXcQ', // Rick Roll video ID (always exists)
        key: apiKey
      },
      timeout: 10000
    });

    if (response.data && response.data.items && response.data.items.length > 0) {
      const video = response.data.items[0];
      console.log('✅ API key is valid!');
      console.log(`📹 Test video: "${video.snippet.title}"`);
      console.log(`📺 Channel: ${video.snippet.channelTitle}`);
      console.log('🎉 Ready to run real API tests!');
      return true;
    } else {
      console.log('⚠️  API key works but test video not found');
      return false;
    }
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 400) {
        console.error('❌ Invalid API key or malformed request');
        if (data.error && data.error.message) {
          console.error(`   Error: ${data.error.message}`);
        }
      } else if (status === 403) {
        console.error('❌ API key valid but quota exceeded or access denied');
        if (data.error && data.error.message) {
          console.error(`   Error: ${data.error.message}`);
        }
      } else {
        console.error(`❌ API request failed with status ${status}`);
      }
    } else if (error.code === 'ENOTFOUND') {
      console.error('❌ Network error - check your internet connection');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
    return false;
  }
}

async function main() {
  console.log('🚀 YouTube API Key Validator');
  console.log('============================');
  
  const envVars = loadEnvFile();
  const apiKey = envVars.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ YOUTUBE_API_KEY not found in .env.development');
    console.error('   Please add your YouTube Data API v3 key to .env.development');
    process.exit(1);
  }
  
  if (apiKey === 'test-youtube-api-key') {
    console.error('❌ Using test API key placeholder');
    console.error('   Please replace with a real YouTube Data API v3 key');
    console.error('   Get one at: https://console.developers.google.com/');
    process.exit(1);
  }
  
  console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  
  const isValid = await validateApiKey(apiKey);
  
  if (isValid) {
    console.log('\n💡 Next steps:');
    console.log('   Run real API tests: npm run test:real-api');
    process.exit(0);
  } else {
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Verify your API key at https://console.developers.google.com/');
    console.log('   2. Ensure YouTube Data API v3 is enabled');
    console.log('   3. Check your API quota limits');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});