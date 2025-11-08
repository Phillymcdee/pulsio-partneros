import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { objectives } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
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
    const objective = await db
      .select()
      .from(objectives)
      .where(and(eq(objectives.id, id), eq(objectives.userId, user.id)))
      .limit(1);

    if (objective.length === 0) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    return NextResponse.json(objective[0]);
  } catch (error) {
    console.error('Error fetching objective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const updates: Partial<typeof objectives.$inferInsert> = {};
    
    if (body.type) updates.type = body.type;
    if (body.detail !== undefined) updates.detail = body.detail;
    if (body.priority !== undefined) {
      if (body.priority < 1 || body.priority > 3) {
        return NextResponse.json({ error: 'Priority must be 1, 2, or 3' }, { status: 400 });
      }
      updates.priority = body.priority;
    }
    
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(objectives)
      .set(updates)
      .where(and(eq(objectives.id, id), eq(objectives.userId, user.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating objective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await db
      .delete(objectives)
      .where(and(eq(objectives.id, id), eq(objectives.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting objective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

