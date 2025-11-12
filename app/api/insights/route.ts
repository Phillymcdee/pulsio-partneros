import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { insights, signals, partners, objectives } from '@/lib/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { formatOutreachDraft } from '@/lib/insights';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hotSignals = searchParams.get('hot') === 'true';
    const statusFilter = searchParams.get('status');
    const minScore = hotSignals ? 80 : undefined;

    // Build where conditions
    const conditions = [eq(partners.userId, user.id)];
    if (minScore !== undefined) {
      conditions.push(gte(insights.score, minScore));
    }
    if (statusFilter) {
      conditions.push(eq(insights.status, statusFilter as any));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Build query
    const baseQuery = db
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
      .where(whereClause);

    // For hot signals, sort by recency first (most recent), then by score
    // Otherwise, sort by score descending
    const query = hotSignals
      ? baseQuery.orderBy(desc(insights.createdAt), desc(insights.score))
      : baseQuery.orderBy(desc(insights.score));

    const userInsights = await query.limit(50);

    const formatted = userInsights.map((item) => ({
      id: item.insight.id,
      score: item.insight.score,
      scoreBreakdown: item.insight.scoreBreakdown,
      why: item.insight.why,
      recommendation: item.insight.recommendation,
      actions: item.insight.actions,
      outreachDraft: formatOutreachDraft(item.insight.outreachDraft),
      feedback: item.insight.feedback,
      status: item.insight.status || 'pending',
      createdAt: item.insight.createdAt,
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
    logger.error('Error fetching insights', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

