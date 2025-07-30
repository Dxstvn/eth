#!/usr/bin/env node

/**
 * Test script to verify Sumsub credentials
 * Run with: node scripts/test-sumsub-credentials.js
 */

const crypto = require('crypto');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;

if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
  console.error('❌ Error: SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY must be set in .env.local');
  console.log('\nPlease add the following to your .env.local file:');
  console.log('SUMSUB_APP_TOKEN=your_sandbox_app_token');
  console.log('SUMSUB_SECRET_KEY=your_sandbox_secret_key');
  process.exit(1);
}

console.log('🔑 Testing Sumsub credentials...\n');
console.log(`App Token: ${SUMSUB_APP_TOKEN.substring(0, 10)}...`);
console.log(`Secret Key: ${SUMSUB_SECRET_KEY.substring(0, 10)}...\n`);

// Generate signature
function generateSignature(method, path, timestamp, body = '') {
  const data = timestamp + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex');
}

// Test API connection
async function testConnection() {
  const timestamp = Math.floor(Date.now() / 1000);
  const path = '/resources/applicants/-/levelNames';
  const signature = generateSignature('GET', path, timestamp);

  const options = {
    hostname: 'api.sumsub.com',
    path: path,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-App-Token': SUMSUB_APP_TOKEN,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': timestamp.toString()
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const levels = JSON.parse(data);
            console.log('✅ Success! Connected to Sumsub API\n');
            console.log('Available verification levels:');
            levels.forEach(level => {
              console.log(`  - ${level.name} (${level.id})`);
            });
            console.log('\n📝 Note: Make sure you have a level named "basic-kyc-aml" configured in your Sumsub dashboard');
          } catch (error) {
            console.error('❌ Error parsing response:', error);
          }
        } else {
          console.error(`❌ API Error (Status ${res.statusCode}):`, data);
          if (res.statusCode === 401) {
            console.log('\n🔍 Check that your credentials are correct and from the sandbox environment');
          }
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Connection error:', error);
    });

    req.end();
  });
}

// Run the test
testConnection().catch(console.error);