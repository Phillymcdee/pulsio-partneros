import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { insights, signals, partners } from '@/lib/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';

const approveSchema = z.object({
  status: z.enum(['ready_to_send', 'approved', 'sent']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitFn = rateLimit({ maxRequests: 20, windowMs: 60000 });
    const rateLimitResult = await rateLimitFn(request);
    if (rateLimitResult) {
      return rateLimitResult; // Rate limit exceeded
    }

    const body = await request.json();
    const { status } = approveSchema.parse(body);

    // Verify insight belongs to user
    const insight = await db
      .select({ insight: insights })
      .from(insights)
      .innerJoin(signals, eq(insights.signalId, signals.id))
      .innerJoin(partners, eq(signals.partnerId, partners.id))
      .where(and(eq(insights.id, id), eq(partners.userId, user.id)))
      .limit(1);

    if (insight.length === 0) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    // Update status
    await db
      .update(insights)
      .set({ status, updatedAt: new Date() })
      .where(eq(insights.id, id));

    logger.info('Insight approved', { insightId: id, status, userId: user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }
    logger.error('Error approving insight', error instanceof Error ? error : new Error(String(error)), { insightId: (await params).id });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

