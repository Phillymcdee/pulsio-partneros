# Getting Started with PartnerOS

This guide will help you set up and run PartnerOS MVP locally.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (we use [Neon](https://neon.tech) for development)
- OpenAI API key
- (Optional) Resend account for email delivery
- (Optional) Inngest account for scheduled jobs
- (Optional) Slack app for Slack notifications

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd pulsio-partneros
npm install
```

### 2. Set Up Environment Variables

Copy the `.env.example` file to `.env` and fill in the required variables:

```bash
cp .env.example .env
```

**Required variables:**
- `DATABASE_URL` - PostgreSQL connection string (e.g., from Neon)
- `AUTH_SECRET` - Random secret for NextAuth (generate with `openssl rand -base64 32`)
- `OPENAI_API_KEY` - Your OpenAI API key

**Optional variables:**
- `RESEND_API_KEY` - For email delivery via Resend
- `EMAIL_FROM` - Email address to send from (must be verified in Resend)
- `INNGEST_EVENT_KEY` - For scheduled jobs (RSS ingestion, digests)
- `INNGEST_SIGNING_KEY` - Inngest signing key
- `SLACK_SIGNING_SECRET` - For Slack interactive components

See `.env.example` for all available options.

### 3. Set Up Database

Run database migrations:

```bash
npm run db:push
```

This will create all necessary tables in your database.

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see the application.

## Setting Up External Services

### Database (Neon)

1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string to `DATABASE_URL` in `.env`

### Email (Resend)

1. Sign up at https://resend.com
2. Add and verify your domain
3. Get your API key and add to `RESEND_API_KEY`
4. Set `EMAIL_FROM` to your verified email address

### Scheduled Jobs (Inngest)

1. Sign up at https://inngest.com
2. Create a new app
3. Get your Event Key and Signing Key
4. Add to `.env`:
   ```
   INNGEST_EVENT_KEY="your-event-key"
   INNGEST_SIGNING_KEY="your-signing-key"
   ```
5. Set webhook URL in Inngest dashboard: `http://localhost:3000/api/inngest`

**Note:** For local development without Inngest, you can manually trigger jobs:
- RSS ingestion: `POST /api/ingest`
- Digest generation: `POST /api/digest`

### Slack (Optional)

1. Create a Slack app at https://api.slack.com/apps
2. Enable Interactive Components
3. Set Request URL to: `https://your-domain.com/api/slack/interactive`
4. Get your Signing Secret and add to `SLACK_SIGNING_SECRET`

## First Run

1. Visit http://localhost:3000
2. Sign in with email (magic link)
3. Complete onboarding:
   - Add at least 1 partner (with RSS URL)
   - Add at least 2 objectives
   - Configure delivery channel (email or Slack)
4. The app will automatically:
   - Trigger initial RSS ingestion
   - Backfill 7 days of historical data
   - Generate your first insights

## Running Tests

```bash
# Run all tests (unit + integration)
npm test

# Run E2E tests (requires dev server running)
npm run test:e2e

# Run tests in watch mode
npm test -- --watch
```

## Project Structure

- `app/` - Next.js app directory (pages, API routes)
- `lib/` - Core business logic
- `inngest/` - Scheduled jobs (RSS ingestion, digests)
- `drizzle/` - Database schema and migrations
- `tests/e2e/` - End-to-end tests (Playwright)
- `lib/__tests__/` - Unit and integration tests

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check that your database is accessible
- Ensure migrations have been run (`npm run db:push`)

### Environment Variable Errors
- Check that all required variables are set in `.env`
- Verify variable names match exactly (case-sensitive)
- Restart dev server after changing `.env`

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

### Email Not Sending
- Verify Resend domain is verified
- Check `EMAIL_FROM` matches verified domain
- Check Resend API key is correct

## Next Steps

- Read [Architecture.md](./docs/architecture/Architecture.md) for technical details
- Check [USER_FLOWS.md](./docs/implementation/USER_FLOWS.md) for user flow documentation
- Review [IMPLEMENTATION_STATUS.md](./docs/implementation/IMPLEMENTATION_STATUS.md) for current status
- See [Roadmap.md](./docs/implementation/Roadmap.md) for planned features

## Getting Help

- Check existing documentation in the `/docs` folder
- Review [QA_TESTING_PLAN.md](./docs/testing/QA_TESTING_PLAN.md) for testing guidance
- See [Implementation_Decisions.md](./docs/implementation/Implementation_Decisions.md) for technical rationale

