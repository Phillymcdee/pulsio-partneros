import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { partners, signals, insights } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    const rateLimitResult = await rateLimit(request, { maxRequests: 10, windowMs: 60000 });
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Verify partner belongs to user
    const partner = await db
      .select()
      .from(partners)
      .where(and(eq(partners.id, id), eq(partners.userId, user.id)))
      .limit(1);

    if (partner.length === 0) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const partnerData = partner[0];

    // Get recent insights for this partner
    const recentInsights = await db
      .select({
        insight: insights,
        signal: signals,
      })
      .from(insights)
      .innerJoin(signals, eq(insights.signalId, signals.id))
      .where(eq(signals.partnerId, id))
      .orderBy(desc(insights.createdAt))
      .limit(5);

    // Generate deeper play outreach draft using LLM
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a partnerships strategist. Generate a follow-up outreach draft that suggests a deeper partnership opportunity based on recent signals. Return valid JSON only.',
          },
          {
            role: 'user',
            content: `Partner: ${partnerData.name}
${partnerData.domain ? `Domain: ${partnerData.domain}` : ''}
${partnerData.notes ? `Notes: ${partnerData.notes}` : ''}

Recent insights:
${recentInsights.map((item, idx) => `
${idx + 1}. ${item.signal.title} (${item.signal.type})
   - ${item.insight.why}
   - Recommendation: ${item.insight.recommendation}
`).join('\n')}

Generate a personalized outreach draft that:
1. References recent signals/activities
2. Suggests a deeper partnership opportunity (e.g., marketplace integration, co-marketing campaign, joint product)
3. Is warm but professional
4. Includes a clear call to action

Return JSON with:
{
  "outreachDraft": string (ready-to-send email draft),
  "suggestedPlay": string (description of the deeper play opportunity)
}`,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);

      logger.info('Deeper play draft generated', { partnerId: id, userId: user.id });

      return NextResponse.json({
        outreachDraft: parsed.outreachDraft || generateDefaultDeeperPlayDraft(partnerData.name),
        suggestedPlay: parsed.suggestedPlay || 'Explore deeper partnership opportunities',
      });
    } catch (error) {
      logger.error('Error generating deeper play draft', { error, partnerId: id });
      // Fallback to default draft
      return NextResponse.json({
        outreachDraft: generateDefaultDeeperPlayDraft(partnerData.name),
        suggestedPlay: 'Explore deeper partnership opportunities',
      });
    }
  } catch (error) {
    logger.error('Error in deeper play route', { error, partnerId: (await params).id });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateDefaultDeeperPlayDraft(partnerName: string): string {
  return `Hi there,

I've been following ${partnerName}'s recent activities and I'm excited about the potential for a deeper partnership between our companies.

Based on what I've seen, I think there's an opportunity to explore:
- Joint product integrations
- Co-marketing initiatives
- Marketplace opportunities

Would you be open to a conversation about how we can work together more closely?

Best regards`;
}

