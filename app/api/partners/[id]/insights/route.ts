import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { insights, signals, partners } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const partnerInsights = await db
      .select({
        insight: insights,
      })
      .from(insights)
      .innerJoin(signals, eq(insights.signalId, signals.id))
      .innerJoin(partners, eq(signals.partnerId, partners.id))
      .where(and(eq(partners.id, id), eq(partners.userId, user.id)))
      .orderBy(desc(insights.score), desc(insights.createdAt));

    const formatted = partnerInsights.map((item) => ({
      id: item.insight.id,
      score: item.insight.score,
      why: item.insight.why,
      recommendation: item.insight.recommendation,
      actions: item.insight.actions,
      outreachDraft: item.insight.outreachDraft,
      createdAt: item.insight.createdAt,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

