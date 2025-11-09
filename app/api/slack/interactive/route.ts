import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { insights, signals, partners, channels, users, objectives } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Handle Slack interactive components (button clicks)
 * Slack sends POST requests with payload containing action data
 * 
 * Note: For MVP, we identify users by Slack team_id matching channels.
 * In production, you'd want to store slack_user_id mapping.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const payload = body.get('payload');
    
    if (!payload) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
    }

    const payloadData = JSON.parse(payload as string);
    
    // Handle URL verification (Slack sends this on initial setup)
    if (payloadData.type === 'url_verification') {
      return NextResponse.json({ challenge: payloadData.challenge });
    }

    // Handle button actions
    if (payloadData.type === 'block_actions') {
      const actions = payloadData.actions || [];
      const teamId = payloadData.team?.id;
      const responseUrl = payloadData.response_url;
      
      // Find user by team_id (match via channels table)
      // For MVP: We'll find the first channel with this team's webhook pattern
      // In production, store team_id in channels table
      let userId: string | null = null;
      
      if (teamId) {
        // Try to find user by team_id
        // For now, we'll process without strict user verification
        // TODO: Add team_id to channels table for proper mapping
      }
      
      for (const action of actions) {
        const actionId = action.action_id;
        const insightId = action.value;
        
        if (actionId.startsWith('feedback_')) {
          const type = actionId.replace('feedback_', '');
          await handleSlackFeedback(insightId, type, teamId, responseUrl);
        } else if (actionId === 'copy_draft') {
          await handleSlackCopy(insightId, responseUrl);
        }
      }

      // Return empty 200 to acknowledge receipt
      return NextResponse.json({});
    }

    return NextResponse.json({ error: 'Unsupported action type' }, { status: 400 });
  } catch (error) {
    console.error('Error handling Slack interaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle feedback from Slack button
 * For MVP: Processes feedback without strict user verification
 * In production: Match Slack user to PartnerOS user via team_id
 */
async function handleSlackFeedback(
  insightId: string,
  type: string,
  teamId: string | undefined,
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

    // Get insight to find the user
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

    const userId = insightResult[0].partner.userId;
    
    // Process feedback (reuse logic from feedback route)
    await processFeedback(insightId, type, userId);

    // Send confirmation to Slack
    const emoji = type === 'thumbs_up' ? '👍' : type === 'thumbs_down' ? '👎' : '✓';
    await sendSlackResponse(responseUrl, {
      text: `${emoji} Feedback recorded! Thanks for helping us improve.`,
      replace_original: false,
    });
  } catch (error) {
    console.error('Error processing Slack feedback:', error);
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
    console.error('Error copying draft:', error);
    await sendSlackResponse(responseUrl, {
      text: 'Error retrieving draft. Please try again.',
      replace_original: false,
    });
  }
}

/**
 * Process feedback (shared logic)
 * Duplicated from feedback route - in production, extract to shared module
 */
async function processFeedback(insightId: string, type: string, userId: string): Promise<void> {
  // Verify insight belongs to user
  const insightResult = await db
    .select({
      insight: insights,
      signal: signals,
      partner: partners,
    })
    .from(insights)
    .innerJoin(signals, eq(insights.signalId, signals.id))
    .innerJoin(partners, eq(signals.partnerId, partners.id))
    .where(and(eq(insights.id, insightId), eq(partners.userId, userId)))
    .limit(1);

  if (insightResult.length === 0) {
    throw new Error('Insight not found');
  }

  // Update insight feedback
  await db
    .update(insights)
    .set({ feedback: type })
    .where(eq(insights.id, insightId));

  // Update user preferences based on feedback
  const userRecord = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userRecord.length > 0) {
    const preferences = userRecord[0].preferences || {
      signalTypeWeights: {},
      objectiveTypeWeights: {},
      sourceWeights: {},
    };

    const signalType = insightResult[0].signal.type;
    const objectiveType = insightResult[0].insight.objectiveId ? 
      (await db.select().from(objectives).where(eq(objectives.id, insightResult[0].insight.objectiveId!)).limit(1))[0]?.type : null;

    // Adjust weights
    const adjustment = type === 'thumbs_up' ? 0.1 : type === 'thumbs_down' ? -0.1 : -0.15;

    if (signalType) {
      preferences.signalTypeWeights = preferences.signalTypeWeights || {};
      const currentWeight = preferences.signalTypeWeights[signalType] || 1.0;
      preferences.signalTypeWeights[signalType] = Math.max(0.5, Math.min(2.0, currentWeight + adjustment));
    }

    if (objectiveType) {
      preferences.objectiveTypeWeights = preferences.objectiveTypeWeights || {};
      const currentWeight = preferences.objectiveTypeWeights[objectiveType] || 1.0;
      preferences.objectiveTypeWeights[objectiveType] = Math.max(0.5, Math.min(2.0, currentWeight + adjustment));
    }

    await db
      .update(users)
      .set({ preferences })
      .where(eq(users.id, userId));
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

