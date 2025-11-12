import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Rate limiting middleware for API routes
 * Uses in-memory store (for MVP - consider Redis for production scale)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const defaultOptions: RateLimitOptions = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
};

/**
 * Rate limit middleware
 */
export function rateLimit(options: Partial<RateLimitOptions> = {}) {
  const opts = { ...defaultOptions, ...options };

  return async (request: NextRequest): Promise<NextResponse | null> => {
    // Get identifier (IP address or user ID)
    const identifier = getIdentifier(request);
    const now = Date.now();

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to clean up
      cleanupRateLimitStore(now);
    }

    const record = rateLimitStore.get(identifier);

    if (!record || now > record.resetTime) {
      // New window or expired
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + opts.windowMs,
      });
      return null; // No rate limit hit
    }

    if (record.count >= opts.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': opts.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
          },
        }
      );
    }

    // Increment count
    record.count++;
    return null; // No rate limit hit
  };
}

/**
 * Get identifier for rate limiting (IP address or user ID)
 */
function getIdentifier(request: NextRequest): string {
  // Try to get user ID from auth token if available
  // For now, use IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

/**
 * Clean up old rate limit entries
 */
function cleanupRateLimitStore(now: number): void {
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Input validation middleware using Zod
 */
export function validateInput<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<{ data: T } | NextResponse> => {
    try {
      const body = await request.json();
      const validated = schema.parse(body);
      return { data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation error',
            details: error.issues.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
  };
}

/**
 * Common validation schemas
 */
export const validationSchemas = {
  partner: z.preprocess(
    (data: any) => {
      // Convert empty strings to undefined
      if (typeof data === 'object' && data !== null) {
        const cleaned: any = { ...data };
        if (cleaned.domain === '') cleaned.domain = undefined;
        if (cleaned.rssUrl === '') cleaned.rssUrl = undefined;
        if (cleaned.githubOrg === '') cleaned.githubOrg = undefined;
        if (cleaned.notes === '') cleaned.notes = undefined;
        return cleaned;
      }
      return data;
    },
    z.object({
      name: z.string().min(1).max(255),
      domain: z.string().max(255).optional(),
      rssUrl: z.string().url().optional(),
      githubOrg: z.string().max(100).optional(),
      notes: z.string().max(1000).optional(),
    })
  ),

  objective: z.object({
    type: z.enum(['integrations', 'co_sell', 'co_market', 'marketplace', 'geography', 'vertical']),
    detail: z.string().max(500).optional(),
    priority: z.number().int().min(1).max(3),
  }),

  channel: z.preprocess(
    (data: any) => {
      // Convert empty strings to undefined
      if (typeof data === 'object' && data !== null) {
        const cleaned: any = { ...data };
        if (cleaned.slackWebhookUrl === '') cleaned.slackWebhookUrl = undefined;
        if (cleaned.slackTeamId === '') cleaned.slackTeamId = undefined;
        return cleaned;
      }
      return data;
    },
    z.object({
      emailEnabled: z.boolean().optional(),
      slackWebhookUrl: z.string().url().optional(),
      slackTeamId: z.string().max(255).optional(), // Slack team ID for multi-user support
      cadence: z.enum(['daily', 'weekly']).optional(),
    })
  ),

  feedback: z.object({
    type: z.enum(['thumbs_up', 'thumbs_down', 'na']),
  }),
};

