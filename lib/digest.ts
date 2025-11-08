import { db } from '@/lib/db';
import { insights, signals, partners, objectives, channels } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';

export interface DigestItem {
  partner: string;
  signalTitle: string;
  signalUrl: string;
  score: number;
  why: string;
  recommendation: string;
  action: string;
  outreachDraft: string;
  insightId: string;
}

/**
 * Generates digest items for a user
 */
export async function generateDigest(userId: string, limit: number = 10): Promise<DigestItem[]> {
  // Get user's channel preferences
  const userChannel = await db
    .select()
    .from(channels)
    .where(eq(channels.userId, userId))
    .limit(1);

  // Get top insights by score
  const topInsights = await db
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
    .where(eq(partners.userId, userId))
    .orderBy(desc(insights.score))
    .limit(limit);

  return topInsights.map((item) => ({
    partner: item.partner.name,
    signalTitle: item.signal.title,
    signalUrl: item.signal.sourceUrl,
    score: item.insight.score,
    why: item.insight.why,
    recommendation: item.insight.recommendation,
    action: item.insight.actions[0]?.label || 'Reach out',
    outreachDraft: item.insight.outreachDraft,
    insightId: item.insight.id,
  }));
}

