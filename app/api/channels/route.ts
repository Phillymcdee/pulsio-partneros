import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { channels, users } from '@/lib/schema';
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

    // Get or create channel for user
    let userChannel = await db
      .select()
      .from(channels)
      .where(eq(channels.userId, user.id))
      .limit(1);

    if (userChannel.length === 0) {
      // Create default channel
      const [newChannel] = await db
        .insert(channels)
        .values({
          userId: user.id,
          emailEnabled: true,
          cadence: 'weekly',
        })
        .returning();
      return NextResponse.json(newChannel);
    }

    return NextResponse.json(userChannel[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Error fetching channel', error as Error, {
      userId: user?.id,
      errorMessage,
      errorStack,
    });
    // Include more details in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(isDevelopment && { details: errorMessage, stack: errorStack })
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit({ maxRequests: 20 })(request);
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    const validationResult = await validateInput(validationSchemas.channel)(request);
    if (validationResult instanceof NextResponse) {
      return validationResult;
    }
    const { emailEnabled, slackWebhookUrl, slackTeamId, cadence } = validationResult.data;
    
    const updates: Partial<typeof channels.$inferInsert> = {};
    
    if (emailEnabled !== undefined) updates.emailEnabled = emailEnabled;
    if (slackWebhookUrl !== undefined) updates.slackWebhookUrl = slackWebhookUrl || null;
    if (slackTeamId !== undefined) updates.slackTeamId = slackTeamId || null;
    if (cadence !== undefined) {
      updates.cadence = cadence;
    }
    
    updates.updatedAt = new Date();

    // Get or create channel
    let userChannel = await db
      .select()
      .from(channels)
      .where(eq(channels.userId, user.id))
      .limit(1);

    let updated;
    const updateData: Partial<typeof channels.$inferInsert> = {
      ...updates,
      updatedAt: new Date(),
    };

    if (userChannel.length === 0) {
      // Create new channel
      [updated] = await db
        .insert(channels)
        .values({
          userId: user.id,
          ...updateData,
        })
        .returning();
    } else {
      // Update existing
      [updated] = await db
        .update(channels)
        .set(updateData)
        .where(eq(channels.userId, user.id))
        .returning();
    }

    logger.info('Channel updated', { userId: user.id });
    return NextResponse.json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Error updating channel', error as Error, {
      userId: user?.id,
      errorMessage,
      errorStack,
    });
    // Include more details in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(isDevelopment && { details: errorMessage, stack: errorStack })
      },
      { status: 500 }
    );
  }
}

