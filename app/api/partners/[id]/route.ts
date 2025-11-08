import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { partners } from '@/lib/schema';
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
    const partner = await db
      .select()
      .from(partners)
      .where(and(eq(partners.id, id), eq(partners.userId, user.id)))
      .limit(1);

    if (partner.length === 0) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    return NextResponse.json(partner[0]);
  } catch (error) {
    console.error('Error fetching partner:', error);
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
    const updates: Partial<typeof partners.$inferInsert> = {};
    
    if (body.name) updates.name = body.name;
    if (body.domain !== undefined) updates.domain = body.domain;
    if (body.rssUrl !== undefined) updates.rssUrl = body.rssUrl;
    if (body.githubOrg !== undefined) updates.githubOrg = body.githubOrg;
    if (body.notes !== undefined) updates.notes = body.notes;
    
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(partners)
      .set(updates)
      .where(and(eq(partners.id, id), eq(partners.userId, user.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating partner:', error);
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
      .delete(partners)
      .where(and(eq(partners.id, id), eq(partners.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting partner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

