/**
 * Sentry integration for error tracking
 * Optional - only initializes if SENTRY_DSN is set
 */

import * as Sentry from '@sentry/nextjs';

let sentryInitialized = false;

export function initSentry() {
  if (sentryInitialized) {
    return;
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return; // Sentry not configured
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV === 'development',
      // Add beforeSend to log when events are sent
      beforeSend(event, hint) {
        console.log('Sentry: Sending event to Sentry:', {
          message: event.message,
          level: event.level,
          environment: event.environment,
        });
        return event;
      },
    });
    
    sentryInitialized = true;
    console.log('Sentry initialized successfully with DSN:', dsn.substring(0, 20) + '...');
  } catch (error) {
    console.warn('Failed to initialize Sentry:', error);
  }
}

export function captureException(error: Error, context?: Record<string, any>) {
  // Initialize Sentry if not already initialized and DSN is available
  if (!sentryInitialized && process.env.SENTRY_DSN) {
    initSentry();
  }

  if (!sentryInitialized && !process.env.SENTRY_DSN) {
    console.warn('Sentry not configured - error not sent:', error.message);
    return;
  }

  try {
    Sentry.captureException(error, { extra: context });
    console.log('Error sent to Sentry:', error.message);
  } catch (err) {
    console.warn('Failed to capture exception:', err);
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
  // Initialize Sentry if not already initialized and DSN is available
  if (!sentryInitialized && process.env.SENTRY_DSN) {
    initSentry();
  }

  if (!sentryInitialized && !process.env.SENTRY_DSN) {
    console.warn('Sentry not configured - message not sent:', message);
    return;
  }

  try {
    Sentry.captureMessage(message, { level, extra: context });
    console.log('Message sent to Sentry:', message);
  } catch (err) {
    console.warn('Failed to capture message:', err);
  }
}

// Initialize on module load if DSN is available (works in all environments)
if (process.env.SENTRY_DSN) {
  initSentry();
}

