import { pgTable, text, integer, timestamp, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// Enums
export const objectiveTypeEnum = pgEnum('objective_type', [
  'integrations',
  'co_sell',
  'co_market',
  'marketplace',
  'geography',
  'vertical',
]);

export const signalTypeEnum = pgEnum('signal_type', [
  'funding',
  'marketplace',
  'launch',
  'hire',
  'changelog',
  'pr',
  'blog',
]);

export const cadenceEnum = pgEnum('cadence', ['daily', 'weekly']);

export const insightStatusEnum = pgEnum('insight_status', ['pending', 'ready_to_send', 'approved', 'sent']);

// Users table (NextAuth compatible)
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  preferences: jsonb('preferences').$type<{
    signalTypeWeights?: Record<string, number>;
    objectiveTypeWeights?: Record<string, number>;
    sourceWeights?: Record<string, number>;
    onboardingComplete?: boolean;
  }>(),
});

// NextAuth required tables
export const accounts = pgTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires').notNull(),
});

// Partners table
export const partners = pgTable('partners', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  domain: text('domain'),
  rssUrl: text('rss_url'),
  githubOrg: text('github_org'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Objectives table
export const objectives = pgTable('objectives', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: objectiveTypeEnum('type').notNull(),
  detail: text('detail'),
  priority: integer('priority').notNull(), // 1 = highest, 3 = lowest
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Watchlist table
export const watchlist = pgTable('watchlist', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  partnerId: text('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
  keyword: text('keyword').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Signals table
export const signals = pgTable('signals', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  partnerId: text('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
  type: signalTypeEnum('type').notNull(),
  title: text('title').notNull(),
  sourceUrl: text('source_url').notNull(),
  summary: text('summary').notNull(),
  facets: jsonb('facets').$type<Record<string, any>>(),
  publishedAt: timestamp('published_at'),
  dedupeHash: text('dedupe_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Insights table
export const insights = pgTable('insights', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  signalId: text('signal_id').notNull().references(() => signals.id, { onDelete: 'cascade' }),
  objectiveId: text('objective_id').references(() => objectives.id, { onDelete: 'set null' }),
  score: integer('score').notNull(), // 0-100
  scoreBreakdown: jsonb('score_breakdown').$type<{
    baseScore: number;
    recencyMultiplier: number;
    priorityMultiplier: number;
    objectiveMatchBonus: number;
    llmAdjustment: number;
    signalStrength: number;
    objectiveFit: number;
  }>(),
  why: text('why').notNull(),
  recommendation: text('recommendation').notNull(),
  actions: jsonb('actions').$type<Array<{
    label: string;
    ownerHint: string;
    dueInDays: number;
  }>>().notNull(),
  outreachDraft: text('outreach_draft').notNull(),
  feedback: text('feedback').$type<'thumbs_up' | 'thumbs_down' | 'na'>(),
  status: insightStatusEnum('status').default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Channels table
export const channels = pgTable('channels', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  slackWebhookUrl: text('slack_webhook_url'),
  cadence: cadenceEnum('cadence').notNull().default('weekly'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

