import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isOnboardingComplete, markOnboardingComplete } from '@/lib/onboarding';
import { inngest } from '@/lib/inngest';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (stricter for onboarding completion)
    const rateLimitResponse = await rateLimit({ maxRequests: 5, windowMs: 5 * 60 * 1000 })(request);
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Re-validate onboarding requirements
    const complete = await isOnboardingComplete(user.id);
    if (!complete) {
      return NextResponse.json(
        { error: 'Onboarding requirements not met. Please complete all steps.' },
        { status: 400 }
      );
    }

    // Mark onboarding as complete
    await markOnboardingComplete(user.id);

    // Trigger initial ingestion (optional - skip if Inngest not configured)
    try {
      if (process.env.INNGEST_EVENT_KEY) {
        await inngest.send({
          name: 'partner/ingest',
          data: {},
        });

        // Trigger 7-day backfill
        await inngest.send({
          name: 'partner/backfill',
          data: {
            userId: user.id,
            days: 7,
          },
        });
      } else {
        logger.warn('Inngest not configured - skipping background jobs', { userId: user.id });
      }
    } catch (error) {
      // Log but don't fail onboarding if Inngest fails
      logger.error('Failed to trigger Inngest jobs (onboarding still completed)', error as Error);
    }

    logger.info('Onboarding completed', { userId: user.id });
    return NextResponse.json({ success: true, message: 'Onboarding completed successfully' });
  } catch (error) {
    logger.error('Error completing onboarding', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

