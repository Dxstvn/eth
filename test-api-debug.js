// Test script to debug API connection
const https = require('https');

console.log('Testing ngrok API connection...\n');

// Test 1: Without bypass header
console.log('Test 1: Request WITHOUT ngrok-skip-browser-warning header');
https.get('https://b0a0144ec53a.ngrok-free.app/health', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  }
}, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', data.substring(0, 200) + (data.length > 200 ? '...' : ''));
    console.log('\n---\n');
    
    // Test 2: With bypass header
    console.log('Test 2: Request WITH ngrok-skip-browser-warning header');
    https.get('https://b0a0144ec53a.ngrok-free.app/health', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'ngrok-skip-browser-warning': 'true'
      }
    }, (res2) => {
      console.log(`Status: ${res2.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res2.headers)}`);
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        console.log('Response:', data2);
        
        // Test 3: CORS preflight
        console.log('\n---\n');
        console.log('Test 3: CORS preflight request');
        const options = {
          hostname: 'b0a0144ec53a.ngrok-free.app',
          path: '/health',
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://www.clearhold.app',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type,Authorization,ngrok-skip-browser-warning'
          }
        };
        
        const req = https.request(options, (res3) => {
          console.log(`Status: ${res3.statusCode}`);
          console.log(`CORS Headers:`);
          console.log(`  Allow-Origin: ${res3.headers['access-control-allow-origin']}`);
          console.log(`  Allow-Headers: ${res3.headers['access-control-allow-headers']}`);
          console.log(`  Allow-Methods: ${res3.headers['access-control-allow-methods']}`);
        });
        req.end();
      });
    });
  });
});