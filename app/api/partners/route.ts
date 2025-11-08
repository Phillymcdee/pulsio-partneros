import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { partners } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { detectRssUrl } from '@/lib/rss';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPartners = await db
      .select()
      .from(partners)
      .where(eq(partners.userId, user.id))
      .orderBy(partners.createdAt);

    return NextResponse.json(userPartners);
  } catch (error) {
    console.error('Error fetching partners:', error);
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
    const { name, domain, rssUrl, githubOrg, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Auto-detect RSS URL if domain provided but no RSS URL
    let detectedRssUrl = rssUrl;
    if (!detectedRssUrl && domain) {
      detectedRssUrl = await detectRssUrl(domain);
    }

    const [partner] = await db
      .insert(partners)
      .values({
        userId: user.id,
        name,
        domain,
        rssUrl: detectedRssUrl || null,
        githubOrg: githubOrg || null,
        notes: notes || null,
      })
      .returning();

    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    console.error('Error creating partner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

