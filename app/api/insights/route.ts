import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { insights, signals, partners, objectives } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userInsights = await db
      .select({
        insight: insights,
        signal: signals,
        partner: partners,
        objective: objectives,
      })
      .from(insights)
      .innerJoin(signals, eq(insights.signalId, signals.id))
      .innerJoin(partners, eq(signals.partnerId, partners.id))
      .leftJoin(objectives, eq(insights.objectiveId, objectives.id))
      .where(eq(partners.userId, user.id))
      .orderBy(desc(insights.score))
      .limit(50);

    const formatted = userInsights.map((item) => ({
      id: item.insight.id,
      score: item.insight.score,
      scoreBreakdown: item.insight.scoreBreakdown,
      why: item.insight.why,
      recommendation: item.insight.recommendation,
      actions: item.insight.actions,
      outreachDraft: item.insight.outreachDraft,
      feedback: item.insight.feedback,
      signal: {
        id: item.signal.id,
        title: item.signal.title,
        sourceUrl: item.signal.sourceUrl,
        type: item.signal.type,
        publishedAt: item.signal.publishedAt,
      },
      partner: {
        id: item.partner.id,
        name: item.partner.name,
      },
      objective: item.objective ? {
        type: item.objective.type,
        detail: item.objective.detail,
      } : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

