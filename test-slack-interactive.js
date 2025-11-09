#!/usr/bin/env node

/**
 * Test script to verify Slack interactive components endpoint
 * Simulates Slack's URL verification request
 */

const testUrl = 'http://localhost:3000/api/slack/interactive';

async function testSlackVerification() {
  console.log('🧪 Testing Slack Interactive Components Endpoint...\n');
  
  // Test 1: URL Verification (what Slack sends on initial setup)
  console.log('Test 1: URL Verification');
  const verificationPayload = {
    token: 'test_token',
    challenge: 'test_challenge_12345',
    type: 'url_verification'
  };
  
  try {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(verificationPayload));
    
    const response = await fetch(testUrl, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok && data.challenge === 'test_challenge_12345') {
      console.log('✅ URL Verification: PASSED');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    } else {
      console.log('❌ URL Verification: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log('❌ URL Verification: ERROR');
    console.log(`   Error: ${error.message}\n`);
  }
  
  // Test 2: Invalid payload
  console.log('Test 2: Missing Payload');
  try {
    const response = await fetch(testUrl, {
      method: 'POST',
      body: new FormData()
    });
    
    const data = await response.json();
    
    if (response.status === 400 && data.error === 'Missing payload') {
      console.log('✅ Missing Payload: PASSED\n');
    } else {
      console.log('❌ Missing Payload: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log('❌ Missing Payload: ERROR');
    console.log(`   Error: ${error.message}\n`);
  }
  
  console.log('📝 Note: For Slack to reach this endpoint, you need a public URL.');
  console.log('   Use ngrok: ngrok http 3000');
  console.log('   Then update Slack app with: https://your-ngrok-url.ngrok.io/api/slack/interactive');
}

testSlackVerification().catch(console.error);

