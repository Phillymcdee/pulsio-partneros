#!/usr/bin/env node

/**
 * Test Slack interactive endpoint through ngrok
 */

const ngrokUrl = 'https://8b8948999424.ngrok-free.app';
const testUrl = `${ngrokUrl}/api/slack/interactive`;

async function testThroughNgrok() {
  console.log('🧪 Testing Slack Interactive Components through ngrok...\n');
  console.log(`Public URL: ${ngrokUrl}\n`);
  
  // Test URL Verification
  console.log('Test: URL Verification (Slack setup)');
  const verificationPayload = {
    token: 'test_token',
    challenge: 'ngrok_test_challenge_12345',
    type: 'url_verification'
  };
  
  try {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(verificationPayload));
    
    const response = await fetch(testUrl, {
      method: 'POST',
      body: formData,
      headers: {
        // ngrok may require this header
        'ngrok-skip-browser-warning': 'true'
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.challenge === 'ngrok_test_challenge_12345') {
      console.log('✅ URL Verification: PASSED');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
      console.log('✅ Your endpoint is ready for Slack!\n');
      console.log('📝 Next steps:');
      console.log(`   1. Go to https://api.slack.com/apps`);
      console.log(`   2. Select your app`);
      console.log(`   3. Go to Features → Interactivity & Shortcuts`);
      console.log(`   4. Update Request URL to: ${testUrl}`);
      console.log(`   5. Click "Save Changes"`);
      console.log(`   6. Slack will verify the URL automatically\n`);
    } else {
      console.log('❌ URL Verification: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log('❌ Error testing endpoint');
    console.log(`   Error: ${error.message}\n`);
    console.log('💡 Make sure:');
    console.log('   - Your Next.js server is running on port 3000');
    console.log('   - ngrok is running: ngrok http 3000');
  }
}

testThroughNgrok().catch(console.error);

