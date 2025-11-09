/**
 * Environment variable validation
 * Validates all required environment variables at startup
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'AUTH_SECRET',
  'OPENAI_API_KEY',
] as const;

const optionalEnvVars = [
  'RESEND_API_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'EMAIL_FROM',
  'INNGEST_EVENT_KEY',
  'INNGEST_SIGNING_KEY',
  'SLACK_SIGNING_SECRET',
  'AUTH_URL',
] as const;

interface EnvConfig {
  DATABASE_URL: string;
  AUTH_SECRET: string;
  OPENAI_API_KEY: string;
  RESEND_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  EMAIL_FROM?: string;
  INNGEST_EVENT_KEY?: string;
  INNGEST_SIGNING_KEY?: string;
  SLACK_SIGNING_SECRET?: string;
  AUTH_URL?: string;
}

let validatedConfig: EnvConfig | null = null;

/**
 * Validate environment variables
 */
export function validateEnv(): EnvConfig {
  if (validatedConfig) {
    return validatedConfig;
  }

  const missing: string[] = [];
  const config: Partial<EnvConfig> = {};

  // Check required variables
  for (const key of requiredEnvVars) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
    } else {
      (config as any)[key] = value;
    }
  }

  // Check optional variables
  for (const key of optionalEnvVars) {
    const value = process.env[key];
    if (value) {
      (config as any)[key] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }

  // Validate specific formats
  if (config.DATABASE_URL && !config.DATABASE_URL.startsWith('postgres://') && !config.DATABASE_URL.startsWith('postgresql://')) {
    console.warn('DATABASE_URL should start with postgres:// or postgresql://');
  }

  if (config.SMTP_PORT && isNaN(Number(config.SMTP_PORT))) {
    throw new Error('SMTP_PORT must be a valid number');
  }

  validatedConfig = config as EnvConfig;
  return validatedConfig;
}

/**
 * Get validated environment config
 */
export function getEnvConfig(): EnvConfig {
  return validateEnv();
}

// Validate on module load (only in production or when explicitly called)
if (process.env.NODE_ENV === 'production') {
  try {
    validateEnv();
  } catch (error) {
    console.error('Environment validation failed:', error);
    process.exit(1);
  }
}

