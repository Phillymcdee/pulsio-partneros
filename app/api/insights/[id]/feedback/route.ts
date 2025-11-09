import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, validateInput, validationSchemas } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';
import { processFeedback } from '@/lib/feedback';

/**
 * Handle GET requests from email links
 * Redirects to a confirmation page after processing feedback
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || !['thumbs_up', 'thumbs_down', 'na'].includes(type)) {
      return NextResponse.redirect(new URL('/dashboard?error=invalid_feedback', request.url));
    }

    const user = await getCurrentUser();
    if (!user?.id) {
      // Redirect to sign in with callback
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(signInUrl);
    }

    // Process feedback (same logic as POST)
    await processFeedback(id, type, user.id);

    logger.info('Feedback processed via GET', { insightId: id, type, userId: user.id });
    // Redirect to dashboard with success message
    return NextResponse.redirect(new URL(`/dashboard?feedback=success&type=${type}`, request.url));
  } catch (error) {
    logger.error('Error processing feedback', error as Error);
    return NextResponse.redirect(new URL('/dashboard?error=feedback_failed', request.url));
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit({ maxRequests: 30 })(request);
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Validate input
    const validationResult = await validateInput(validationSchemas.feedback)(request);
    if (validationResult instanceof NextResponse) {
      return validationResult;
    }
    const { type } = validationResult.data;

    await processFeedback(id, type, user.id);

    logger.info('Feedback processed via POST', { insightId: id, type, userId: user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error submitting feedback', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

