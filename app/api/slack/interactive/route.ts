import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { insights, signals, partners, channels, users, objectives } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { verifySlackSignature } from '@/lib/slack/verify';
import { logger } from '@/lib/logger';
import { processFeedback } from '@/lib/feedback';

/**
 * Handle Slack interactive components (button clicks)
 * Slack sends POST requests with payload containing action data
 * 
 * Uses slack_team_id from channels table to map Slack team to PartnerOS user
 */
export async function POST(request: NextRequest) {
  try {
    // Clone request to read body twice (once for signature, once for parsing)
    const clonedRequest = request.clone();
    const rawBody = await clonedRequest.text();
    
    // Parse form data from original request
    const body = await request.formData();
    const payload = body.get('payload');
    
    if (!payload) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
    }

    const payloadData = JSON.parse(payload as string);
    
    // Skip signature verification for URL verification (Slack's initial setup)
    if (payloadData.type !== 'url_verification') {
      const isValid = verifySlackSignature(request, rawBody);
      if (!isValid) {
        logger.warn('Invalid Slack signature', { 
          timestamp: request.headers.get('x-slack-request-timestamp'),
          signature: request.headers.get('x-slack-signature'),
        });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    // Handle URL verification (Slack sends this on initial setup)
    if (payloadData.type === 'url_verification') {
      return NextResponse.json({ challenge: payloadData.challenge });
    }

    // Handle button actions
    if (payloadData.type === 'block_actions') {
      const actions = payloadData.actions || [];
      const teamId = payloadData.team?.id;
      const responseUrl = payloadData.response_url;
      
      // Find user by team_id via channels table
      let userId: string | null = null;
      
      if (teamId) {
        const channelResult = await db
          .select({ userId: channels.userId })
          .from(channels)
          .where(eq(channels.slackTeamId, teamId))
          .limit(1);
        
        if (channelResult.length > 0) {
          userId = channelResult[0].userId;
        } else {
          logger.warn('No channel found for Slack team_id', { teamId });
          // Fallback: will try to find user via insight (for backward compatibility)
        }
      }
      
      for (const action of actions) {
        const actionId = action.action_id;
        const insightId = action.value;
        
        if (actionId.startsWith('feedback_')) {
          const type = actionId.replace('feedback_', '');
          await handleSlackFeedback(insightId, type, teamId, userId, responseUrl);
        } else if (actionId === 'copy_draft') {
          await handleSlackCopy(insightId, responseUrl);
        }
      }

      // Return empty 200 to acknowledge receipt
      return NextResponse.json({});
    }

    return NextResponse.json({ error: 'Unsupported action type' }, { status: 400 });
  } catch (error) {
    logger.error('Error handling Slack interaction', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle feedback from Slack button
 * Uses team_id to find user, with fallback to insight owner for backward compatibility
 */
async function handleSlackFeedback(
  insightId: string,
  type: string,
  teamId: string | undefined,
  userId: string | null,
  responseUrl: string
): Promise<void> {
  try {
    // Handle test insight IDs (for development/testing)
    if (insightId.startsWith('test-insight-')) {
      const emoji = type === 'thumbs_up' ? '👍' : type === 'thumbs_down' ? '👎' : '✓';
      await sendSlackResponse(responseUrl, {
        text: `${emoji} Test feedback recorded! (Using test insight ID: ${insightId})`,
        replace_original: false,
      });
      return;
    }

    // Get insight to find the user (if not already found via team_id)
    let targetUserId = userId;
    
    if (!targetUserId) {
      const insightResult = await db
        .select({
          insight: insights,
          signal: signals,
          partner: partners,
        })
        .from(insights)
        .innerJoin(signals, eq(insights.signalId, signals.id))
        .innerJoin(partners, eq(signals.partnerId, partners.id))
        .where(eq(insights.id, insightId))
        .limit(1);

      if (insightResult.length === 0) {
        await sendSlackResponse(responseUrl, {
          text: `Insight not found (ID: ${insightId}). Make sure you're using real insight IDs from your database.`,
          replace_original: false,
        });
        return;
      }

      targetUserId = insightResult[0].partner.userId;
    }
    
    if (!targetUserId) {
      await sendSlackResponse(responseUrl, {
        text: 'Unable to identify user. Please ensure your Slack integration is properly configured.',
        replace_original: false,
      });
      return;
    }
    
    // Process feedback (reuse shared logic)
    await processFeedback(insightId, type, targetUserId);

    // Send confirmation to Slack
    const emoji = type === 'thumbs_up' ? '👍' : type === 'thumbs_down' ? '👎' : '✓';
    await sendSlackResponse(responseUrl, {
      text: `${emoji} Feedback recorded! Thanks for helping us improve.`,
      replace_original: false,
    });
  } catch (error) {
    logger.error('Error processing Slack feedback', error as Error, { insightId, type });
    await sendSlackResponse(responseUrl, {
      text: 'Error processing feedback. Please try again.',
      replace_original: false,
    });
  }
}

/**
 * Handle copy draft request from Slack
 * Sends draft to user via Slack response URL
 */
async function handleSlackCopy(
  insightId: string,
  responseUrl: string
): Promise<void> {
  try {
    // Handle test insight IDs (for development/testing)
    if (insightId.startsWith('test-insight-')) {
      await sendSlackResponse(responseUrl, {
        text: `📋 *Test Draft*\n\n\`\`\`This is a test outreach draft for insight: ${insightId}\n\nIn production, this would contain the actual outreach draft from your database.\`\`\``,
        replace_original: false,
      });
      return;
    }

    // Get insight with draft
    const insightResult = await db
      .select({
        insight: insights,
        signal: signals,
        partner: partners,
      })
      .from(insights)
      .innerJoin(signals, eq(insights.signalId, signals.id))
      .innerJoin(partners, eq(signals.partnerId, partners.id))
      .where(eq(insights.id, insightId))
      .limit(1);

    if (insightResult.length === 0) {
      await sendSlackResponse(responseUrl, {
        text: `Insight not found (ID: ${insightId}). Make sure you're using real insight IDs from your database.`,
        replace_original: false,
      });
      return;
    }

    const draft = insightResult[0].insight.outreachDraft || '';
    const partner = insightResult[0].partner.name;
    const signalTitle = insightResult[0].signal.title;

    // Send draft to user via response URL
    await sendSlackResponse(responseUrl, {
      text: `📋 *Outreach Draft*\n*Partner:* ${partner}\n*Signal:* ${signalTitle}\n\n\`\`\`${draft}\`\`\``,
      replace_original: false,
    });
  } catch (error) {
    logger.error('Error copying draft', error as Error, { insightId });
    await sendSlackResponse(responseUrl, {
      text: 'Error retrieving draft. Please try again.',
      replace_original: false,
    });
  }
}

/**
 * Send response to Slack
 */
async function sendSlackResponse(responseUrl: string, payload: any): Promise<void> {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

