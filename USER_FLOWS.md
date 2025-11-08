# User Flows & Implementation Tasks

This document explicitly maps UX flows from `UX.md` to concrete implementation tasks. Each flow includes the user journey, implementation tasks, acceptance criteria, and testing requirements.

---

## Flow: First Run (≤5 min)
**Source**: UX.md "First run" section  
**User Goal**: Get set up and receive first Partner Pulse in ≤5 minutes

### User Journey
1. **Sign in** (magic link)
2. **Add partners/targets** (paste list); auto-detect RSS/press feeds
3. **Select 2–3 objectives** (integrations, co-sell, co-market, marketplace); set priorities
4. **Choose cadence + channel** (daily/weekly; email/Slack)
5. **App backfills 7 days** → creates first **Partner Pulse**

### Implementation Tasks

#### Onboarding Detection
- [ ] **Check onboarding status**
  - Query user's partners, objectives, and channels count
  - Return onboarding status (complete/incomplete)
  - File: `lib/onboarding.ts` → `getOnboardingStatus(userId)`
  - Dependencies: Database schema (partners, objectives, channels tables)

- [ ] **Onboarding completion criteria**
  - Minimum 1 partner
  - Minimum 2 objectives
  - At least 1 channel configured (email or Slack)
  - File: `lib/onboarding.ts` → `isOnboardingComplete(userId)`

#### Onboarding Wizard UI
- [ ] **Multi-step wizard component**
  - Step 1: Add Partners (with CSV import option)
  - Step 2: Set Objectives (minimum 2, with priorities)
  - Step 3: Configure Delivery (cadence + channel)
  - Progress indicator showing current step
  - File: `app/onboarding/page.tsx`

- [ ] **Step 1: Partners**
  - Reuse existing `/partners` form or create inline version
  - Show RSS autodetect feedback
  - Validate: ≥1 partner required
  - File: `app/onboarding/page.tsx` (or component)

- [ ] **Step 2: Objectives**
  - Reuse existing `/objectives` form or create inline version
  - Validate: ≥2 objectives required
  - File: `app/onboarding/page.tsx` (or component)

- [ ] **Step 3: Channels**
  - Reuse existing `/settings/channels` form or create inline version
  - Validate: At least email or Slack configured
  - File: `app/onboarding/page.tsx` (or component)

#### Onboarding Completion Logic
- [ ] **Completion API endpoint**
  - Validate all requirements met
  - Mark onboarding as complete (store in user preferences or separate table)
  - Trigger initial ingestion job
  - Trigger 7-day backfill job
  - Return success/error
  - File: `app/api/onboarding/complete/route.ts`

- [ ] **Backfill job**
  - Fetch historical RSS data (last 7 days)
  - Process through normal ingestion pipeline (dedupe, classify, score, generate insights)
  - File: `inngest/backfill.ts` or extend `partner_ingest.ts` with date range parameter

#### Post-Sign-In Routing
- [ ] **Homepage routing logic**
  - Check onboarding status after sign-in
  - Redirect to `/onboarding` if incomplete
  - Redirect to `/dashboard` if complete
  - File: `app/page.tsx` (server component) or middleware

- [ ] **Protected route middleware**
  - Ensure authenticated users see onboarding if incomplete
  - Prevent skipping onboarding steps
  - File: `middleware.ts` (optional, can be handled in page components)

### Acceptance Criteria
- [ ] User can complete onboarding in ≤5 minutes
- [ ] All three steps are required before completion
- [ ] Backfill triggers automatically on completion
- [ ] First Partner Pulse is generated within 10 minutes of completion
- [ ] User cannot access dashboard until onboarding complete
- [ ] Onboarding can be skipped/resumed later (optional enhancement)

### Testing Requirements
- [ ] **Unit tests**
  - `lib/onboarding.ts` → `getOnboardingStatus`, `isOnboardingComplete`
  - File: `lib/__tests__/onboarding.test.ts`

- [ ] **Integration tests**
  - Onboarding completion → backfill trigger
  - Backfill → signal creation → insight generation
  - File: `tests/integration/onboarding.test.ts`

- [ ] **E2E tests (Playwright)**
  - Complete onboarding flow end-to-end
  - Verify redirects work correctly
  - Verify backfill triggers
  - File: `tests/e2e/onboarding.spec.ts`

---

## Flow: Weekly Digest
**Source**: UX.md "Digest" section  
**User Goal**: Receive prioritized partner insights via email/Slack

### User Journey
1. User receives digest (email or Slack)
2. Each item shows: Partner — Signal — Score, Why it matters, Recommended action, Outreach draft
3. User can: Copy outreach, 👍/👎, Mark N/A, "Run this for me"

### Implementation Tasks

#### Digest Generation (✅ Already Implemented)
- ✅ Digest generation logic (`lib/digest.ts`)
- ✅ Email template (`lib/email.ts`)
- ✅ Slack blocks (`lib/slack.ts`)
- ✅ Inngest job (`inngest/partner_digest.ts`)

#### Digest Interaction
- [ ] **Email action links**
  - Copy-to-clipboard link (opens web app with pre-filled draft)
  - Feedback links (thumbs up/down, N/A)
  - "Run this for me" link (future)
  - File: `app/api/digest/[action]/route.ts`

- [ ] **Slack action buttons**
  - Copy button (sends draft to user)
  - Feedback buttons (👍/👎/N/A)
  - "Run this for me" button (future)
  - File: Update `lib/slack.ts` with interactive buttons

### Acceptance Criteria
- [ ] All digest items include required fields (partner, signal, score, why, action, draft)
- [ ] Action buttons/links work correctly
- [ ] Feedback updates user preferences
- [ ] Copy functionality works in email and Slack

### Testing Requirements
- [ ] **Integration tests**
  - Digest generation → email/Slack delivery
  - Feedback from email/Slack → preference update
  - File: `tests/integration/digest.test.ts`

- [ ] **E2E tests**
  - Receive digest → interact with actions → verify updates
  - File: `tests/e2e/digest.spec.ts`

---

## Flow: Weekly Rhythm (90 min total)
**Source**: UX.md "Weekly rhythm" section  
**User Goal**: Efficiently manage partner opportunities throughout the week

### User Journey
1. **Monday**: Approve & send 2–4 actions
2. **Mid-week**: React to "hot" high-score signals
3. **Friday**: Check two Partner Pages; nudge one deeper play

### Implementation Tasks

#### Dashboard Enhancements
- [ ] **Action queue/approval workflow**
  - Mark insights as "Ready to send"
  - Batch approve multiple insights
  - Track sent status
  - File: `app/dashboard/page.tsx` + `app/api/insights/[id]/approve/route.ts`

- [ ] **Hot signals filter**
  - Filter insights by score threshold (e.g., ≥80)
  - Sort by recency + score
  - File: `app/dashboard/page.tsx`

- [ ] **Partner Page quick actions**
  - "Nudge deeper play" button
  - Generate follow-up outreach draft
  - File: `app/partners/[id]/page.tsx` + `lib/insights.ts`

### Acceptance Criteria
- [ ] User can approve multiple insights at once
- [ ] Hot signals are easily discoverable
- [ ] Partner Pages show actionable next steps
- [ ] Weekly workflow can be completed in ≤90 minutes

### Testing Requirements
- [ ] **E2E tests**
  - Complete weekly workflow simulation
  - File: `tests/e2e/weekly-rhythm.spec.ts`

---

## Flow: Feedback Loop
**Source**: UX.md "Feedback loop" section  
**User Goal**: Improve precision through feedback

### User Journey
1. User gives 👍/👎 on insights
2. System adjusts signal type/objective weights
3. Future insights reflect updated preferences

### Implementation Tasks

#### Feedback Processing (✅ Already Implemented)
- ✅ Feedback API (`app/api/insights/[id]/feedback/route.ts`)
- ✅ Weight adjustment logic (in feedback route)
- ✅ User preferences storage (users.preferences JSONB)

#### Feedback Visualization
- [ ] **Show feedback impact**
  - Display how feedback affected weights
  - Show precision improvement over time
  - File: `app/settings/preferences/page.tsx` (new)

- [ ] **Monthly objective refresh reminder**
  - Notify user to review objectives
  - Suggest objective updates based on feedback
  - File: `inngest/monthly_review.ts` (future)

### Acceptance Criteria
- [ ] Feedback updates weights correctly
- [ ] Future insights reflect updated preferences
- [ ] User can see feedback impact
- [ ] Precision improves over time (tracked in metrics)

### Testing Requirements
- [ ] **Integration tests**
  - Feedback → weight update → re-scoring
  - File: `tests/integration/feedback.test.ts`

---

## Future Flows (To Be Documented)

### Flow: "Run This For Me"
**Source**: UX.md "Service overlay" section  
**Status**: Phase 2

### Flow: Objective Refresh
**Source**: UX.md "Feedback loop" section  
**Status**: Future enhancement

---

## Flow Implementation Checklist Template

When implementing a new flow:

1. **Document the flow** in this file
2. **Break down into tasks** with file paths
3. **Add to Roadmap.md** with timeline
4. **Create acceptance criteria**
5. **Define testing requirements**
6. **Update IMPLEMENTATION_STATUS.md** with progress
7. **Verify against UX.md** original specification

