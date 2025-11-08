import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isOnboardingComplete, markOnboardingComplete } from '@/lib/onboarding';
import { inngest } from '@/lib/inngest';

export async function POST(request: NextRequest) {
  try {
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

    // Trigger initial ingestion
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

    return NextResponse.json({ success: true, message: 'Onboarding completed successfully' });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

