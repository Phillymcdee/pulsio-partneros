import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { insights, signals, partners } from '@/lib/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';

const batchApproveSchema = z.object({
  insightIds: z.array(z.string()).min(1).max(50),
  status: z.enum(['ready_to_send', 'approved', 'sent']),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitFn = rateLimit({ maxRequests: 10, windowMs: 60000 });
    const rateLimitResult = await rateLimitFn(request);
    if (rateLimitResult) {
      return rateLimitResult; // Rate limit exceeded
    }

    const body = await request.json();
    const { insightIds, status } = batchApproveSchema.parse(body);

    // Verify all insights belong to user
    const userInsights = await db
      .select({ insightId: insights.id })
      .from(insights)
      .innerJoin(signals, eq(insights.signalId, signals.id))
      .innerJoin(partners, eq(signals.partnerId, partners.id))
      .where(
        and(
          eq(partners.userId, user.id),
          inArray(insights.id, insightIds)
        )
      );

    const validIds = userInsights.map((i) => i.insightId);
    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid insights found' }, { status: 404 });
    }

    // Update status for all valid insights
    await db
      .update(insights)
      .set({ status, updatedAt: new Date() })
      .where(inArray(insights.id, validIds));

    logger.info('Insights batch approved', { count: validIds.length, status, userId: user.id });

    return NextResponse.json({ success: true, updated: validIds.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }
    logger.error('Error batch approving insights', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

