/**
 * Structured logging utility
 * Provides consistent logging format and levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private minLevel: LogLevel;

  constructor() {
    // Set log level from environment or default to INFO
    const level = process.env.LOG_LEVEL?.toUpperCase();
    this.minLevel = level
      ? (LogLevel[level as keyof typeof LogLevel] ?? LogLevel.INFO)
      : process.env.NODE_ENV === 'production'
      ? LogLevel.INFO
      : LogLevel.DEBUG;
  }

  private log(level: LogLevel, levelName: string, message: string, context?: Record<string, any>, error?: Error): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      ...(context && { context }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
        },
      }),
    };

    // Format for console output
    const prefix = `[${entry.timestamp}] [${levelName}]`;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const errorStr = error ? ` ${error.name}: ${error.message}` : '';

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix} ${message}${contextStr}${errorStr}`);
        break;
      case LogLevel.INFO:
        console.info(`${prefix} ${message}${contextStr}${errorStr}`);
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} ${message}${contextStr}${errorStr}`);
        break;
      case LogLevel.ERROR:
        console.error(`${prefix} ${message}${contextStr}${errorStr}`, error);
        break;
    }

    // In production, you might want to send to an error tracking service
    // e.g., Sentry, LogRocket, etc.
    if (level === LogLevel.ERROR && process.env.NODE_ENV === 'production') {
      // Integrate with error tracking service
      try {
        // Dynamic import to avoid breaking if Sentry not installed
        import('./sentry').then(({ captureException }) => {
          captureException(error || new Error(message), context);
        }).catch(() => {
          // Sentry not available, skip
        });
      } catch {
        // Sentry not available, skip
      }
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, 'ERROR', message, context, error);
  }
}

// Export singleton instance
export const logger = new Logger();

