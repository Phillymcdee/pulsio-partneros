import { inngest } from '@/lib/inngest';
import { db } from '@/lib/db';
import { partners, signals, insights, objectives, users } from '@/lib/schema';
import { isNotNull, eq } from 'drizzle-orm';
import { fetchFeed, generateDedupeHash } from '@/lib/rss';
import { classifyType } from '@/lib/classify';
import { summarize } from '@/lib/summarize';
import { generateInsight } from '@/lib/insights';

export const partnerIngest = inngest.createFunction(
  { id: 'partner-ingest' },
  { cron: '0 */6 * * *' }, // Every 6 hours
  async ({ event, step }) => {
    return await step.run('ingest-partners', async () => {
      // Get all partners with RSS URLs
      const partnersWithRss = await db
        .select()
        .from(partners)
        .where(isNotNull(partners.rssUrl));

      const results = [];

      // Process max 10 partners per run (rate limiting)
      const partnersToProcess = partnersWithRss.slice(0, 10);

      for (const partner of partnersToProcess) {
        if (!partner.rssUrl) continue;

        try {
          const feed = await fetchFeed(partner.rssUrl);
          if (!feed) {
            results.push({ partnerId: partner.id, status: 'no_feed', error: null });
            continue;
          }

          let newSignalsCount = 0;

          for (const item of feed.items) {
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

            // Parse published date
            let publishedAt: Date | null = null;
            if (item.pubDate) {
              publishedAt = new Date(item.pubDate);
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
          console.error(`Error ingesting partner ${partner.id}:`, error);
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

