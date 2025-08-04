// Debug script for ClearHold + Ngrok integration
const https = require('https');

const NGROK_URL = 'https://1f2561dafffa.ngrok-free.app';
const CLEARHOLD_URL = 'https://www.clearhold.app';

console.log('=== ClearHold + Ngrok Debug Test ===\n');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    };
    
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  // Test 1: Direct ngrok health check
  console.log('1. Testing ngrok backend directly...');
  try {
    const result = await makeRequest(`${NGROK_URL}/health`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    console.log(`   Status: ${result.status}`);
    if (result.status === 200) {
      const data = JSON.parse(result.body);
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    } else {
      console.log(`   Error: ${result.body.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   Failed: ${error.message}`);
  }
  
  // Test 2: CORS preflight from ClearHold origin
  console.log('\n2. Testing CORS preflight...');
  try {
    const result = await makeRequest(`${NGROK_URL}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': CLEARHOLD_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Authorization,ngrok-skip-browser-warning'
      }
    });
    
    console.log(`   Status: ${result.status}`);
    console.log(`   Allow-Origin: ${result.headers['access-control-allow-origin']}`);
    console.log(`   Allow-Headers: ${result.headers['access-control-allow-headers']}`);
    
    const hasNgrokHeader = result.headers['access-control-allow-headers']?.includes('ngrok-skip-browser-warning');
    console.log(`   Ngrok header allowed: ${hasNgrokHeader ? '✓ YES' : '✗ NO'}`);
  } catch (error) {
    console.log(`   Failed: ${error.message}`);
  }
  
  // Test 3: Check if ClearHold is loading
  console.log('\n3. Testing ClearHold frontend...');
  try {
    const result = await makeRequest(CLEARHOLD_URL);
    console.log(`   Status: ${result.status}`);
    
    // Check for key indicators
    const hasAuthenticating = result.body.includes('Authenticating your session');
    const hasLoading = result.body.includes('Loading...');
    const hasAPIUrl = result.body.includes('ngrok');
    
    console.log(`   Shows "Authenticating": ${hasAuthenticating ? '✓ YES' : '✗ NO'}`);
    console.log(`   Shows "Loading": ${hasLoading ? '✓ YES' : '✗ NO'}`);
    console.log(`   Contains ngrok URL: ${hasAPIUrl ? '✓ YES' : '✗ NO'}`);
    
    // Extract any API URLs
    const apiUrlMatch = result.body.match(/https:\/\/[^"]*\.ngrok[^"]*/);
    if (apiUrlMatch) {
      console.log(`   Found API URL: ${apiUrlMatch[0]}`);
    }
  } catch (error) {
    console.log(`   Failed: ${error.message}`);
  }
  
  // Test 4: Backend auth endpoint
  console.log('\n4. Testing backend auth endpoint...');
  try {
    const result = await makeRequest(`${NGROK_URL}/auth/profile`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Origin': CLEARHOLD_URL,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${result.status} (${result.status === 401 ? 'Expected - needs auth' : 'Unexpected'})`);
    console.log(`   CORS Origin: ${result.headers['access-control-allow-origin'] || 'Not set'}`);
  } catch (error) {
    console.log(`   Failed: ${error.message}`);
  }
  
  console.log('\n=== Summary ===');
  console.log('If all tests pass but the site still shows "Authenticating...":');
  console.log('1. Check browser console for errors');
  console.log('2. Verify the ngrok URL matches in all places');
  console.log('3. Ensure backend is running and accessible');
  console.log('4. Check if Firebase is properly configured');
}

runTests();