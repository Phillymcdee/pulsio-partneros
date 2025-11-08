import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signals, partners, insights } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
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
    const partnerSignals = await db
      .select()
      .from(signals)
      .innerJoin(partners, eq(signals.partnerId, partners.id))
      .where(and(eq(partners.id, id), eq(partners.userId, user.id)))
      .orderBy(desc(signals.publishedAt), desc(signals.createdAt));

    const formatted = partnerSignals.map((item) => ({
      id: item.signals.id,
      title: item.signals.title,
      sourceUrl: item.signals.sourceUrl,
      type: item.signals.type,
      summary: item.signals.summary,
      publishedAt: item.signals.publishedAt,
      createdAt: item.signals.createdAt,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching signals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

