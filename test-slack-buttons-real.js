#!/usr/bin/env node

/**
 * Test script to send a Slack message with interactive buttons using REAL data
 * 
 * Usage:
 *   node test-slack-buttons-real.js <webhook-url> [userId]
 * 
 * If userId is not provided, it will use the first user in the database
 */

import { db } from './lib/db.js';
import { insights, signals, partners, users } from './lib/schema.js';
import { eq, desc } from 'drizzle-orm';
import { sendSlackDigest } from './lib/slack.js';

const webhookUrl = process.argv[2];
const userIdArg = process.argv[3];

if (!webhookUrl) {
  console.error('❌ Error: Webhook URL required');
  console.log('\nUsage: node test-slack-buttons-real.js <webhook-url> [userId]');
  process.exit(1);
}

async function testWithRealData() {
  console.log('📤 Sending Slack message with REAL insights from database...\n');
  console.log(`Webhook URL: ${webhookUrl}\n`);
  
  try {
    // Get user (use provided userId or first user)
    let userId = userIdArg;
    if (!userId) {
      const allUsers = await db.select().from(users).limit(1);
      if (allUsers.length === 0) {
        console.error('❌ No users found in database. Please create a user first.');
        process.exit(1);
      }
      userId = allUsers[0].id;
      console.log(`Using first user in database: ${userId}`);
    }

    // Get real insights from database
    const topInsights = await db
      .select({
        insight: insights,
        signal: signals,
        partner: partners,
      })
      .from(insights)
      .innerJoin(signals, eq(insights.signalId, signals.id))
      .innerJoin(partners, eq(signals.partnerId, partners.id))
      .where(eq(partners.userId, userId))
      .orderBy(desc(insights.score))
      .limit(2);

    if (topInsights.length === 0) {
      console.error('❌ No insights found in database for this user.');
      console.log('\n💡 To create test data:');
      console.log('   1. Add some partners with RSS URLs');
      console.log('   2. Run ingestion: POST /api/ingest');
      console.log('   3. Then run this script again\n');
      process.exit(1);
    }

    console.log(`Found ${topInsights.length} insights. Converting to digest format...\n`);

    // Convert to DigestItem format
    const digestItems = topInsights.map((item) => ({
      partner: item.partner.name,
      signalTitle: item.signal.title,
      signalUrl: item.signal.sourceUrl || 'https://example.com',
      score: item.insight.score,
      why: item.insight.why,
      recommendation: item.insight.recommendation,
      action: Array.isArray(item.insight.actions) && item.insight.actions.length > 0
        ? item.insight.actions[0].label
        : 'Reach out',
      outreachDraft: item.insight.outreachDraft,
      insightId: item.insight.id,
    }));

    // Send via Slack
    await sendSlackDigest(webhookUrl, digestItems);

    console.log('✅ Message sent successfully!');
    console.log('\n📝 Check your Slack channel for the message with buttons.');
    console.log('   The buttons should now work because they use REAL insight IDs:\n');
    digestItems.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.partner} - Insight ID: ${item.insightId}`);
    });
    console.log('\n💡 Try clicking the buttons - they should work now!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testWithRealData();

