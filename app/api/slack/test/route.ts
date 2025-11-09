import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { insights, signals, partners, users } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { sendSlackDigest } from '@/lib/slack';

/**
 * Test endpoint to send Slack message with real insights
 * POST /api/slack/test?webhookUrl=<url>&userId=<optional>
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const webhookUrl = searchParams.get('webhookUrl');
    const userIdParam = searchParams.get('userId');

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'webhookUrl query parameter required' },
        { status: 400 }
      );
    }

    // Get user (use provided userId or first user)
    let userId = userIdParam || null;
    if (!userId) {
      const allUsers = await db.select().from(users).limit(1);
      if (allUsers.length === 0) {
        return NextResponse.json(
          { error: 'No users found in database' },
          { status: 404 }
        );
      }
      userId = allUsers[0].id;
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
      return NextResponse.json(
        { 
          error: 'No insights found',
          message: 'Add partners and run ingestion to create insights'
        },
        { status: 404 }
      );
    }

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

    return NextResponse.json({
      success: true,
      message: 'Test message sent to Slack',
      insightsUsed: digestItems.map(item => ({
        partner: item.partner,
        insightId: item.insightId,
      })),
    });
  } catch (error) {
    console.error('Error sending test Slack message:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

