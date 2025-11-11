import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { partners, signals, insights, objectives, users } from '@/lib/schema';
import { isNotNull, eq, and } from 'drizzle-orm';
import { fetchFeed, generateDedupeHash } from '@/lib/rss';
import { classifyType } from '@/lib/classify';
import { summarize } from '@/lib/summarize';
import { generateInsight } from '@/lib/insights';
import { logger } from '@/lib/logger';

/**
 * Direct backfill endpoint (runs synchronously without Inngest)
 * Used when Inngest is not configured or for testing
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const days = body.days || 7;

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get user's partners with RSS URLs
    const partnersWithRss = await db
      .select()
      .from(partners)
      .where(and(
        eq(partners.userId, user.id),
        isNotNull(partners.rssUrl)
      ));

    if (partnersWithRss.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No partners with RSS feeds found',
        signalsCreated: 0,
        insightsCreated: 0
      });
    }

    const results = [];
    let totalSignals = 0;
    let totalInsights = 0;

    for (const partner of partnersWithRss) {
      if (!partner.rssUrl) continue;

      try {
        const feed = await fetchFeed(partner.rssUrl);
        if (!feed) {
          results.push({ partnerId: partner.id, partnerName: partner.name, status: 'no_feed', error: null });
          continue;
        }

        let newSignalsCount = 0;

        for (const item of feed.items) {
          // Parse published date
          let publishedAt: Date | null = null;
          if (item.pubDate) {
            publishedAt = new Date(item.pubDate);
          }

          // Skip items older than cutoff date
          if (publishedAt && publishedAt < cutoffDate) {
            continue;
          }

          // Generate dedupe hash
          const dedupeHash = generateDedupeHash(item.link, item.title);

          // Check if signal already exists
          const existing = await db
            .select()
            .from(signals)
            .where(eq(signals.dedupeHash, dedupeHash))
            .limit(1);

          if (existing.length > 0) {
            continue; // Skip duplicate
          }

          // Summarize content
          const content = item.content || item.contentSnippet || '';
          const summary = await summarize(content);

          // Classify signal type
          const signalType = await classifyType(item.title, content);

          // Insert new signal
          const [newSignal] = await db.insert(signals).values({
            partnerId: partner.id,
            type: signalType,
            title: item.title,
            sourceUrl: item.link,
            summary,
            publishedAt,
            dedupeHash,
          }).returning();

          newSignalsCount++;
          totalSignals++;

          if (!newSignal) continue;

          // Get user objectives
          const userObjectives = await db
            .select()
            .from(objectives)
            .where(eq(objectives.userId, user.id));

          logger.info('Processing signal for insights', {
            signalId: newSignal.id,
            objectivesCount: userObjectives.length,
            partnerId: partner.id,
          });

          if (userObjectives.length === 0) {
            logger.warn('No objectives found for user, skipping insight generation', { userId: user.id });
            continue; // No objectives, skip insight generation
          }

          // Get user preferences
          const [userRecord] = await db
            .select()
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);

          // Generate insight for each objective (like in the Inngest version)
          for (const objective of userObjectives) {
            try {
              // Check if insight already exists for this signal+objective combination
              const existingInsight = await db
                .select()
                .from(insights)
                .where(
                  and(
                    eq(insights.signalId, newSignal.id),
                    eq(insights.objectiveId, objective.id)
                  )
                )
                .limit(1);

              if (existingInsight.length > 0) {
                logger.info('Insight already exists, skipping', {
                  signalId: newSignal.id,
                  objectiveId: objective.id,
                  existingInsightId: existingInsight[0].id,
                });
                continue; // Skip duplicate insight
              }

              const insight = await generateInsight(
                newSignal,
                [objective],
                userRecord?.preferences
              );

              if (insight) {
                // Ensure score is an integer (0-100)
                const scoreInt = Math.round(Math.max(0, Math.min(100, insight.score)));
                
                // Ensure actions array has proper types (dueInDays must be number)
                const validatedActions = insight.actions.map((action: any) => ({
                  label: String(action.label || ''),
                  ownerHint: String(action.ownerHint || ''),
                  dueInDays: Number(action.dueInDays) || 7,
                }));
                
                logger.info('Inserting insight', {
                  signalId: newSignal.id,
                  objectiveId: objective.id,
                  score: scoreInt,
                  hasBreakdown: !!insight.breakdown,
                  actionsCount: validatedActions.length,
                });
                
                await db.insert(insights).values({
                  signalId: newSignal.id,
                  objectiveId: objective.id,
                  score: scoreInt,
                  scoreBreakdown: insight.breakdown,
                  why: insight.why,
                  recommendation: insight.recommendation,
                  actions: validatedActions,
                  outreachDraft: insight.outreachDraft,
                  status: 'pending',
                });
                totalInsights++;
                logger.info('Insight inserted successfully', { signalId: newSignal.id, objectiveId: objective.id });
              } else {
                logger.warn('generateInsight returned null', { signalId: newSignal.id, objectiveId: objective.id });
              }
            } catch (insightError) {
              logger.error('Error generating/inserting insight', insightError as Error, {
                signalId: newSignal.id,
                objectiveId: objective.id,
              });
              // Continue with next objective
            }
          }
        }

        results.push({ 
          partnerId: partner.id, 
          partnerName: partner.name, 
          status: 'success', 
          signalsCreated: newSignalsCount 
        });
      } catch (error) {
        logger.error('Error processing partner', error as Error, { partnerId: partner.id });
        results.push({ 
          partnerId: partner.id, 
          partnerName: partner.name, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    logger.info('Direct backfill completed', { 
      userId: user.id, 
      signalsCreated: totalSignals, 
      insightsCreated: totalInsights 
    });

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${partnersWithRss.length} partner(s)`,
      signalsCreated: totalSignals,
      insightsCreated: totalInsights,
      results
    });
  } catch (error) {
    logger.error('Error in direct backfill', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

