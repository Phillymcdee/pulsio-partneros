import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { partners } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { detectRssUrl } from '@/lib/rss';
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

    const userPartners = await db
      .select()
      .from(partners)
      .where(eq(partners.userId, user.id))
      .orderBy(partners.createdAt);

    return NextResponse.json(userPartners);
  } catch (error) {
    logger.error('Error fetching partners', error as Error);
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
    const validationResult = await validateInput(validationSchemas.partner)(request);
    if (validationResult instanceof NextResponse) {
      return validationResult;
    }
    const { name, domain, rssUrl, githubOrg, notes } = validationResult.data;

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

    logger.info('Partner created', { partnerId: partner.id, userId: user.id });
    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    logger.error('Error creating partner', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

