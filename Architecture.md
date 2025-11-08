# Architecture (Cursor-first)

## Stack
- **Next.js 15 + TypeScript**
- **Neon Postgres** + **Drizzle ORM**
- **Auth**: NextAuth (email)
- **Jobs**: **Inngest** (cron + durable steps)
- **AI**: OpenAI (mini for summarize/classify; mid-tier for insight/action)
- **Delivery**: Resend (email), Slack Webhook
- **Later**: HubSpot/Notion sync

## Repo layout
```
app/
  dashboard/page.tsx
  partners/page.tsx
  objectives/page.tsx
  api/ingest/route.ts
  api/digest/route.ts
inngest/
  partner_ingest.ts
  partner_digest.ts
drizzle/
  schema.ts
  migrations/
lib/
  db.ts
  rss.ts
  github.ts
  classify.ts
  scoring.ts
  insights.ts
  email.ts
  slack.ts
components/
.env.example
drizzle.config.ts
next.config.js
package.json
tsconfig.json
```

## Data flow
1. **Ingest** feeds → normalize → dedupe → `signals`.
2. **Summarize + classify** → facets.
3. **Score** vs `objectives` → create `insights` (attach plays).
4. **Digest** compiles top-N → send via email/Slack.
5. **Feedback** (thumbs, N/A) updates weights/preferences.

## Security & privacy (MVP)
- Tenant-isolated tables keyed by user.
- Public web sources only by default; store evidence URLs/snippets.
- No PII in prompts unless user opts in.
