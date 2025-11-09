/**
 * Sentry integration for error tracking
 * Optional - only initializes if SENTRY_DSN is set
 */

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
    // In a real implementation, you would initialize Sentry here
    // Example:
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.init({ dsn, environment: process.env.NODE_ENV });
    
    sentryInitialized = true;
    console.log('Sentry initialized');
  } catch (error) {
    console.warn('Failed to initialize Sentry:', error);
  }
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (!sentryInitialized) {
    return;
  }

  try {
    // In a real implementation:
    // Sentry.captureException(error, { extra: context });
    console.error('Sentry capture (mock):', error, context);
  } catch (err) {
    console.warn('Failed to capture exception:', err);
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
  if (!sentryInitialized) {
    return;
  }

  try {
    // In a real implementation:
    // Sentry.captureMessage(message, { level, extra: context });
    console.log(`Sentry message (mock) [${level}]:`, message, context);
  } catch (err) {
    console.warn('Failed to capture message:', err);
  }
}

// Initialize on module load if in production
if (process.env.NODE_ENV === 'production') {
  initSentry();
}

