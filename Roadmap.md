# Roadmap

## 10-day build plan (MVP)

### Features
- **D1–2:** Next.js scaffold; Drizzle schema; partners CRUD; RSS autodetect.
- **D3–4:** Ingest job; dedupe; summarize + classify; insert `signals`.
- **D5–6:** Objectives CRUD; scoring; generate `insights`; "Top N" per user nightly.
- **D7–8:** Resend email + Slack digest; Partner Page timeline; score breakdown.
- **D9–10:** CSV import; thumbs/N/A feedback; logs; ship to 3 pilots.

### User Flows (Orchestration Layer)
- **D1–2:** First-run detection logic (`lib/onboarding.ts`)
- **D9–10:** Onboarding wizard UI (`app/onboarding/page.tsx`); completion trigger; backfill integration
- **D9–10:** Post-sign-in routing (onboarding vs dashboard)

**Note**: See `USER_FLOWS.md` for detailed flow → task mappings.

## Phase 2
- Marketplace & changelog sources; GitHub releases per partner.
- Per-tenant weight tuning; learning from feedback.
- “Run this for me” ops queue + status.

## Phase 3
- HubSpot/Notion sync; Opportunity Board.
- Play Packs by ecosystem (AWS, Snowflake, Shopify).
- Team features (multi-user, org view).
