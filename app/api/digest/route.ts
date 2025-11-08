import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest';

export async function POST(request: NextRequest) {
  try {
    // Trigger partner digest job manually
    await inngest.send({
      name: 'partner/digest',
      data: {},
    });

    return NextResponse.json({ success: true, message: 'Digest job triggered' });
  } catch (error) {
    console.error('Error triggering digest:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

