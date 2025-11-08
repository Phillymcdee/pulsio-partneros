import { db } from '@/lib/db';
import { partners, objectives, channels, users } from '@/lib/schema';
import { eq, count } from 'drizzle-orm';

export interface OnboardingStatus {
  partnersCount: number;
  objectivesCount: number;
  hasChannel: boolean;
  isComplete: boolean;
}

/**
 * Get onboarding status for a user
 * Returns counts and completion status
 */
export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  // Count partners
  const partnersResult = await db
    .select({ count: count() })
    .from(partners)
    .where(eq(partners.userId, userId));
  const partnersCount = partnersResult[0]?.count || 0;

  // Count objectives
  const objectivesResult = await db
    .select({ count: count() })
    .from(objectives)
    .where(eq(objectives.userId, userId));
  const objectivesCount = objectivesResult[0]?.count || 0;

  // Check if channel is configured
  const channelResult = await db
    .select()
    .from(channels)
    .where(eq(channels.userId, userId))
    .limit(1);
  const hasChannel = channelResult.length > 0 && (
    channelResult[0].emailEnabled || 
    (channelResult[0].slackWebhookUrl !== null && channelResult[0].slackWebhookUrl !== '')
  );

  const isComplete = checkOnboardingComplete({
    partnersCount,
    objectivesCount,
    hasChannel,
  });

  return {
    partnersCount,
    objectivesCount,
    hasChannel,
    isComplete,
  };
}

/**
 * Check if onboarding is complete based on counts
 */
function checkOnboardingComplete({
  partnersCount,
  objectivesCount,
  hasChannel,
}: {
  partnersCount: number;
  objectivesCount: number;
  hasChannel: boolean;
}): boolean {
  return partnersCount >= 1 && objectivesCount >= 2 && hasChannel;
}

/**
 * Check if user has completed onboarding
 * Queries database and returns boolean
 */
export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const status = await getOnboardingStatus(userId);
  return status.isComplete;
}

/**
 * Mark onboarding as complete in user preferences
 */
export async function markOnboardingComplete(userId: string): Promise<void> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    throw new Error('User not found');
  }

  const currentPreferences = user[0].preferences || {
    signalTypeWeights: {},
    objectiveTypeWeights: {},
    sourceWeights: {},
  };

  await db
    .update(users)
    .set({
      preferences: {
        ...currentPreferences,
        onboardingComplete: true,
      },
    })
    .where(eq(users.id, userId));
}

