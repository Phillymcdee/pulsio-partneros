import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { channels, users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
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
    console.error('Error fetching channel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: Partial<typeof channels.$inferInsert> = {};
    
    if (body.emailEnabled !== undefined) updates.emailEnabled = body.emailEnabled;
    if (body.slackWebhookUrl !== undefined) updates.slackWebhookUrl = body.slackWebhookUrl;
    if (body.cadence !== undefined) {
      if (!['daily', 'weekly'].includes(body.cadence)) {
        return NextResponse.json({ error: 'Cadence must be daily or weekly' }, { status: 400 });
      }
      updates.cadence = body.cadence;
    }
    
    updates.updatedAt = new Date();

    // Get or create channel
    let userChannel = await db
      .select()
      .from(channels)
      .where(eq(channels.userId, user.id))
      .limit(1);

    let updated;
    if (userChannel.length === 0) {
      // Create new channel
      [updated] = await db
        .insert(channels)
        .values({
          userId: user.id,
          ...updates,
        })
        .returning();
    } else {
      // Update existing
      [updated] = await db
        .update(channels)
        .set(updates)
        .where(eq(channels.userId, user.id))
        .returning();
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating channel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

