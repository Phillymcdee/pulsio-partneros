import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { objectives } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
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
    console.error('Error fetching objectives:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, detail, priority } = body;

    if (!type || !priority) {
      return NextResponse.json({ error: 'Type and priority are required' }, { status: 400 });
    }

    if (priority < 1 || priority > 3) {
      return NextResponse.json({ error: 'Priority must be 1, 2, or 3' }, { status: 400 });
    }

    const [objective] = await db
      .insert(objectives)
      .values({
        userId: user.id,
        type,
        detail: detail || null,
        priority,
      })
      .returning();

    return NextResponse.json(objective, { status: 201 });
  } catch (error) {
    console.error('Error creating objective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

