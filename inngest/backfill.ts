import { inngest } from '@/lib/inngest';
import { db } from '@/lib/db';
import { partners, signals, insights, objectives, users } from '@/lib/schema';
import { isNotNull, eq, and, gte } from 'drizzle-orm';
import { fetchFeed, generateDedupeHash } from '@/lib/rss';
import { classifyType } from '@/lib/classify';
import { summarize } from '@/lib/summarize';
import { generateInsight } from '@/lib/insights';

export const partnerBackfill = inngest.createFunction(
  { id: 'partner-backfill' },
  { event: 'partner/backfill' },
  async ({ event, step }) => {
    const userId = event.data.userId;
    const days = event.data.days || 7;

    return await step.run('backfill-partners', async () => {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get user's partners with RSS URLs
      const partnersWithRss = await db
        .select()
        .from(partners)
        .where(and(
          eq(partners.userId, userId),
          isNotNull(partners.rssUrl)
        ));

      const results = [];

      for (const partner of partnersWithRss) {
        if (!partner.rssUrl) continue;

        try {
          const feed = await fetchFeed(partner.rssUrl);
          if (!feed) {
            results.push({ partnerId: partner.id, status: 'no_feed', error: null });
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

            // Get user objectives
            const user = await db
              .select()
              .from(users)
              .where(eq(users.id, partner.userId))
              .limit(1);

            if (user.length > 0 && newSignal) {
              const userObjectives = await db
                .select()
                .from(objectives)
                .where(eq(objectives.userId, partner.userId));

              // Generate insights for each objective
              for (const objective of userObjectives) {
                const insight = await generateInsight(
                  newSignal,
                  [objective],
                  user[0].preferences
                );

                if (insight) {
                  await db.insert(insights).values({
                    signalId: newSignal.id,
                    objectiveId: objective.id,
                    score: insight.score,
                    scoreBreakdown: insight.breakdown,
                    why: insight.why,
                    recommendation: insight.recommendation,
                    actions: insight.actions,
                    outreachDraft: insight.outreachDraft,
                  });
                }
              }
            }

            newSignalsCount++;
          }

          results.push({
            partnerId: partner.id,
            status: 'success',
            newSignals: newSignalsCount,
          });
        } catch (error) {
          console.error(`Error backfilling partner ${partner.id}:`, error);
          results.push({
            partnerId: partner.id,
            status: 'error',
            error: String(error),
          });
        }
      }

      return results;
    });
  }
);

