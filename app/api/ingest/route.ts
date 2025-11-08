import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest';

export async function POST(request: NextRequest) {
  try {
    // Trigger partner ingest job manually
    await inngest.send({
      name: 'partner/ingest',
      data: {},
    });

    return NextResponse.json({ success: true, message: 'Ingest job triggered' });
  } catch (error) {
    console.error('Error triggering ingest:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

