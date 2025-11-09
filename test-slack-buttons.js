#!/usr/bin/env node

/**
 * Test script to send a Slack message with interactive buttons
 * 
 * Usage:
 *   node test-slack-buttons.js <webhook-url>
 * 
 * To get a webhook URL:
 *   1. Go to https://api.slack.com/apps
 *   2. Select your app
 *   3. Go to Features → Incoming Webhooks
 *   4. Activate Incoming Webhooks
 *   5. Click "Add New Webhook to Workspace"
 *   6. Select a channel and authorize
 *   7. Copy the webhook URL
 */

// Note: This is a simplified version that directly calls the Slack API
// For full functionality, use the sendSlackDigest function from lib/slack.ts

const webhookUrl = process.argv[2];

if (!webhookUrl) {
  console.error('❌ Error: Webhook URL required');
  console.log('\nUsage: node test-slack-buttons.js <webhook-url>');
  console.log('\nTo get a webhook URL:');
  console.log('  1. Go to https://api.slack.com/apps');
  console.log('  2. Select your app');
  console.log('  3. Go to Features → Incoming Webhooks');
  console.log('  4. Activate Incoming Webhooks');
  console.log('  5. Click "Add New Webhook to Workspace"');
  console.log('  6. Select a channel and authorize');
  console.log('  7. Copy the webhook URL\n');
  process.exit(1);
}

// Create test data with interactive buttons
const testItems = [
  {
    partner: 'Acme Corp',
    signalTitle: 'New Product Launch Announcement',
    signalUrl: 'https://example.com/signal/1',
    score: 8.5,
    why: 'High engagement and aligns with your partnership objectives',
    recommendation: 'Reach out to congratulate and explore collaboration opportunities',
    action: 'Send congratulatory message and propose partnership discussion',
    outreachDraft: 'Hi team! Congratulations on the launch. We\'d love to explore how we can partner together.',
    insightId: 'test-insight-123'
  },
  {
    partner: 'TechStart Inc',
    signalTitle: 'Series B Funding Round',
    signalUrl: 'https://example.com/signal/2',
    score: 7.2,
    why: 'Funding indicates growth and potential for expanded partnerships',
    recommendation: 'Reach out to discuss partnership opportunities',
    action: 'Schedule a call to discuss partnership',
    outreachDraft: 'Congratulations on your Series B! We\'d love to discuss potential partnership opportunities.',
    insightId: 'test-insight-456'
  }
];

async function testSlackButtons() {
  console.log('📤 Sending test Slack message with interactive buttons...\n');
  console.log(`Webhook URL: ${webhookUrl}\n`);
  
  // Build the Slack message blocks with interactive buttons (same format as lib/slack.ts)
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📊 Partner Pulse - Test Message',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Here are your top ${testItems.length} partner insights:`,
      },
    },
    {
      type: 'divider',
    },
  ];

  testItems.forEach((item) => {
    blocks.push(
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${item.partner}* | Score: ${item.score}\n<${item.signalUrl}|${item.signalTitle}>`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `_${item.why}_\n\n*Recommendation:* ${item.recommendation}\n*Action:* ${item.action}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${item.outreachDraft}\`\`\``,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📋 Copy Draft',
              emoji: true,
            },
            action_id: 'copy_draft',
            value: item.insightId,
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👍 Useful',
              emoji: true,
            },
            action_id: 'feedback_thumbs_up',
            value: item.insightId,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👎 Not Useful',
              emoji: true,
            },
            action_id: 'feedback_thumbs_down',
            value: item.insightId,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Mark N/A',
            },
            action_id: 'feedback_na',
            value: item.insightId,
          },
        ],
      },
      {
        type: 'divider',
      }
    );
  });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blocks,
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }

    console.log('✅ Message sent successfully!');
    console.log('\n📝 Check your Slack channel for the message with buttons.');
    console.log('   Try clicking the buttons to test the interactive components:\n');
    console.log('   - 📋 Copy Draft');
    console.log('   - 👍 Useful');
    console.log('   - 👎 Not Useful');
    console.log('   - Mark N/A\n');
    console.log('💡 Make sure your interactive components URL is configured:');
    console.log('   https://8b8948999424.ngrok-free.app/api/slack/interactive\n');
  } catch (error) {
    console.error('❌ Error sending message:', error.message);
    process.exit(1);
  }
}

testSlackButtons();

