import { inngest } from '@/lib/inngest';
import { db } from '@/lib/db';
import { users, channels } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { generateDigest } from '@/lib/digest';
import { sendDigestEmail } from '@/lib/email';
import { sendSlackDigest } from '@/lib/slack';

export const partnerDigest = inngest.createFunction(
  { id: 'partner-digest' },
  { cron: '0 8 * * *' }, // Daily at 8 AM UTC
  async ({ event, step }) => {
    return await step.run('send-digests', async () => {
      // Get all users with channels configured
      const allUsers = await db.select().from(users);
      const results = [];

      for (const user of allUsers) {
        try {
          // Get user's channel preferences
          const userChannel = await db
            .select()
            .from(channels)
            .where(eq(channels.userId, user.id))
            .limit(1);

          if (userChannel.length === 0) continue;

          const channel = userChannel[0];
          
          // Check if digest should be sent based on cadence
          // For MVP, we'll send weekly on Monday, daily otherwise
          const today = new Date();
          const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday
          
          if (channel.cadence === 'weekly' && dayOfWeek !== 1) {
            continue; // Skip if weekly but not Monday
          }

          // Generate digest
          const digestItems = await generateDigest(user.id, 10);

          if (digestItems.length === 0) {
            results.push({ userId: user.id, status: 'no_items' });
            continue;
          }

          // Send via email if enabled
          if (channel.emailEnabled) {
            try {
              await sendDigestEmail(
                user.email,
                `Partner Pulse - ${digestItems.length} insights`,
                digestItems
              );
              results.push({ userId: user.id, status: 'email_sent', items: digestItems.length });
            } catch (error) {
              console.error(`Error sending email to ${user.email}:`, error);
              results.push({ userId: user.id, status: 'email_failed', error: String(error) });
            }
          }

          // Send via Slack if configured
          if (channel.slackWebhookUrl) {
            try {
              await sendSlackDigest(channel.slackWebhookUrl, digestItems);
              results.push({ userId: user.id, status: 'slack_sent', items: digestItems.length });
            } catch (error) {
              console.error(`Error sending Slack to ${user.id}:`, error);
              results.push({ userId: user.id, status: 'slack_failed', error: String(error) });
            }
          }
        } catch (error) {
          console.error(`Error processing digest for user ${user.id}:`, error);
          results.push({ userId: user.id, status: 'error', error: String(error) });
        }
      }

      return results;
    });
  }
);

