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

    // Check if Inngest is configured
    if (!process.env.INNGEST_EVENT_KEY) {
      // Fall back to direct execution (synchronous, no Inngest)
      // Make internal API call to direct endpoint
      const baseUrl = process.env.AUTH_URL || request.headers.get('origin') || 'http://localhost:3000';
      const directUrl = `${baseUrl}/api/backfill/direct`;
      
      // Forward the request with auth cookie
      const cookie = request.headers.get('cookie');
      const directResponse = await fetch(directUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(cookie && { cookie })
        },
        body: JSON.stringify({ days }),
      });
      
      return NextResponse.json(await directResponse.json());
    }

    // Trigger backfill job via Inngest
    try {
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
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to trigger backfill. Please try again later.' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error triggering backfill:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

