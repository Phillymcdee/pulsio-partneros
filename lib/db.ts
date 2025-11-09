import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { getEnvConfig } from './env';

// Validate environment variables
const env = getEnvConfig();

const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });

