import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Verify Slack request signature
 * See: https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(request: NextRequest, body: string): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  
  if (!signingSecret) {
    console.warn('SLACK_SIGNING_SECRET not set - skipping signature verification');
    return true; // Allow in development, but log warning
  }

  const timestamp = request.headers.get('x-slack-request-timestamp');
  const signature = request.headers.get('x-slack-signature');

  if (!timestamp || !signature) {
    return false;
  }

  // Check timestamp to prevent replay attacks (5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    return false;
  }

  // Create signature base string
  const sigBaseString = `v0:${timestamp}:${body}`;
  
  // Create signature
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(sigBaseString);
  const computedSignature = `v0=${hmac.digest('hex')}`;

  // Compare signatures using timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

