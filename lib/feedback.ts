import { db } from '@/lib/db';
import { insights, signals, partners, users, objectives } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Shared feedback processing logic
 * Used by both API routes and Slack interactive components
 */
export async function processFeedback(insightId: string, type: string, userId: string): Promise<void> {
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
    .set({ feedback: type as 'thumbs_up' | 'thumbs_down' | 'na' })
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

