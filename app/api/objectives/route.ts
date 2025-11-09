import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { objectives } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, validateInput, validationSchemas } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit()(request);
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userObjectives = await db
      .select()
      .from(objectives)
      .where(eq(objectives.userId, user.id))
      .orderBy(objectives.priority, objectives.createdAt);

    return NextResponse.json(userObjectives);
  } catch (error) {
    logger.error('Error fetching objectives', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit({ maxRequests: 30 })(request);
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    const validationResult = await validateInput(validationSchemas.objective)(request);
    if (validationResult instanceof NextResponse) {
      return validationResult;
    }
    const { type, detail, priority } = validationResult.data;

    const [objective] = await db
      .insert(objectives)
      .values({
        userId: user.id,
        type,
        detail: detail || null,
        priority,
      })
      .returning();

    logger.info('Objective created', { objectiveId: objective.id, userId: user.id });
    return NextResponse.json(objective, { status: 201 });
  } catch (error) {
    logger.error('Error creating objective', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

