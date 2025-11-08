import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { inngest } from '@/lib/inngest';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const days = body.days || 7;

    // Trigger backfill job
    await inngest.send({
      name: 'partner/backfill',
      data: {
        userId: user.id,
        days,
      },
    });

    return NextResponse.json({ success: true, message: `Backfill job triggered for last ${days} days` });
  } catch (error) {
    console.error('Error triggering backfill:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

