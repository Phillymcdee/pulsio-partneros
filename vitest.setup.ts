// vitest.setup.ts
// Set up test environment variables before any tests run

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file first (loads your real DATABASE_URL, OPENAI_API_KEY, etc.)
config({ path: resolve(__dirname, '.env') });

// Only set defaults if they weren't in .env
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
}

if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = 'test-secret-key-for-testing-only-min-32-chars';
}

if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'test-openai-key';
}

