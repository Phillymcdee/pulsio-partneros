# User Flows & Implementation Tasks

This document explicitly maps UX flows from `docs/business/UX.md` to concrete implementation tasks. Each flow includes the user journey, implementation tasks, acceptance criteria, and testing requirements.

---

## Flow: First Run (≤5 min)
**Source**: docs/business/UX.md "First run" section  
**User Goal**: Get set up and receive first Partner Pulse in ≤5 minutes

### User Journey
1. **Sign in** (magic link)
2. **Add partners/targets** (paste list); auto-detect RSS/press feeds
3. **Select 2–3 objectives** (integrations, co-sell, co-market, marketplace); set priorities
4. **Choose cadence + channel** (daily/weekly; email/Slack)
5. **App backfills 7 days** → creates first **Partner Pulse**

### Implementation Tasks

#### Onboarding Detection
- [x] **Check onboarding status** ✅ **COMPLETE**
  - Query user's partners, objectives, and channels count
  - Return onboarding status (complete/incomplete)
  - File: `lib/onboarding.ts` → `getOnboardingStatus(userId)`
  - Dependencies: Database schema (partners, objectives, channels tables)

- [x] **Onboarding completion criteria** ✅ **COMPLETE**
  - Minimum 1 partner
  - Minimum 2 objectives
  - At least 1 channel configured (email or Slack)
  - File: `lib/onboarding.ts` → `isOnboardingComplete(userId)`

#### Onboarding Wizard UI
- [x] **Multi-step wizard component** ✅ **COMPLETE**
  - Step 1: Add Partners (with CSV import option)
  - Step 2: Set Objectives (minimum 2, with priorities)
  - Step 3: Configure Delivery (cadence + channel)
  - Progress indicator showing current step
  - File: `app/onboarding/page.tsx`

- [x] **Step 1: Partners** ✅ **COMPLETE**
  - Reuse existing `/partners` form or create inline version
  - Show RSS autodetect feedback
  - Validate: ≥1 partner required
  - File: `app/onboarding/page.tsx` (or component)

- [x] **Step 2: Objectives** ✅ **COMPLETE**
  - Reuse existing `/objectives` form or create inline version
  - Validate: ≥2 objectives required
  - File: `app/onboarding/page.tsx` (or component)

- [x] **Step 3: Channels** ✅ **COMPLETE**
  - Reuse existing `/settings/channels` form or create inline version
  - Validate: At least email or Slack configured
  - File: `app/onboarding/page.tsx` (or component)

#### Onboarding Completion Logic
- [x] **Completion API endpoint** ✅ **COMPLETE**
  - Validate all requirements met
  - Mark onboarding as complete (store in user preferences or separate table)
  - Trigger initial ingestion job
  - Trigger 7-day backfill job
  - Return success/error
  - File: `app/api/onboarding/complete/route.ts`

- [x] **Backfill job** ✅ **COMPLETE**
  - Fetch historical RSS data (last 7 days)
  - Process through normal ingestion pipeline (dedupe, classify, score, generate insights)
  - File: `inngest/backfill.ts` or extend `partner_ingest.ts` with date range parameter

#### Post-Sign-In Routing
- [x] **Homepage routing logic** ✅ **COMPLETE**
  - Check onboarding status after sign-in
  - Redirect to `/onboarding` if incomplete
  - Redirect to `/dashboard` if complete
  - File: `app/page.tsx` (server component) or middleware

- [x] **Protected route middleware** ✅ **COMPLETE**
  - Ensure authenticated users see onboarding if incomplete
  - Prevent skipping onboarding steps
  - File: `middleware.ts` (optional, can be handled in page components)

### Acceptance Criteria
- [x] User can complete onboarding in ≤5 minutes ✅ **IMPLEMENTED** (needs manual testing)
- [x] All three steps are required before completion ✅ **COMPLETE**
- [x] Backfill triggers automatically on completion ✅ **COMPLETE**
- [x] First Partner Pulse is generated within 10 minutes of completion ✅ **COMPLETE**
- [x] User cannot access dashboard until onboarding complete ✅ **COMPLETE**
- [ ] Onboarding can be skipped/resumed later (optional enhancement)

### Testing Requirements
- [x] **Unit tests** ✅ **COMPLETE**
  - `lib/onboarding.ts` → `getOnboardingStatus`, `isOnboardingComplete`
  - File: `lib/__tests__/onboarding.test.ts` (9/9 tests passing)

- [x] **Integration tests** ✅ **COMPLETE**
  - Onboarding completion → backfill trigger
  - Backfill → signal creation → insight generation
  - File: `lib/__tests__/integration.test.ts` (onboarding tests passing)

- [x] **E2E tests (Playwright)** ✅ **COMPLETE**
  - Complete onboarding flow end-to-end
  - Verify redirects work correctly
  - Verify backfill triggers
  - File: `tests/e2e/onboarding.spec.ts` (tests implemented and passing)

---

## Flow: Weekly Digest
**Source**: docs/business/UX.md "Digest" section  
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
- [x] **Email action links** ✅ **COMPLETE**
  - Copy-to-clipboard link (opens web app with pre-filled draft)
  - Feedback links (thumbs up/down, N/A)
  - "Run this for me" link (future)
  - File: `app/api/insights/[id]/copy/route.ts` and `app/api/insights/[id]/feedback/route.ts`

- [x] **Slack action buttons** ✅ **COMPLETE**
  - Copy button (sends draft to user)
  - Feedback buttons (👍/👎/N/A)
  - "Run this for me" button (future)
  - File: `app/api/slack/interactive/route.ts` handles button clicks

### Acceptance Criteria
- [x] All digest items include required fields (partner, signal, score, why, action, draft) ✅ **COMPLETE**
- [x] Action buttons/links work correctly ✅ **COMPLETE**
- [x] Feedback updates user preferences ✅ **COMPLETE**
- [x] Copy functionality works in email and Slack ✅ **COMPLETE**

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
**Source**: docs/business/UX.md "Weekly rhythm" section  
**User Goal**: Efficiently manage partner opportunities throughout the week

### User Journey
1. **Monday**: Approve & send 2–4 actions
2. **Mid-week**: React to "hot" high-score signals
3. **Friday**: Check two Partner Pages; nudge one deeper play

### Implementation Tasks

#### Dashboard Enhancements
- [x] **Action queue/approval workflow** ✅ **COMPLETE**
  - Mark insights as "Ready to send"
  - Batch approve multiple insights
  - Track sent status
  - File: `app/dashboard/page.tsx` + `app/api/insights/[id]/approve/route.ts` + `app/api/insights/batch-approve/route.ts`

- [x] **Hot signals filter** ✅ **COMPLETE**
  - Filter insights by score threshold (e.g., ≥80)
  - Sort by recency + score
  - File: `app/dashboard/page.tsx`

- [x] **Partner Page quick actions** ✅ **COMPLETE**
  - "Nudge deeper play" button
  - Generate follow-up outreach draft
  - File: `app/partners/[id]/page.tsx` + `app/api/partners/[id]/deeper-play/route.ts`

### Acceptance Criteria
- [x] User can approve multiple insights at once ✅ **COMPLETE**
- [x] Hot signals are easily discoverable ✅ **COMPLETE**
- [x] Partner Pages show actionable next steps ✅ **COMPLETE**
- [ ] Weekly workflow can be completed in ≤90 minutes (needs manual testing)

### Testing Requirements
- [ ] **E2E tests**
  - Complete weekly workflow simulation
  - File: `tests/e2e/weekly-rhythm.spec.ts`

---

## Flow: Feedback Loop
**Source**: docs/business/UX.md "Feedback loop" section  
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
- [ ] **Show feedback impact** (Future enhancement)
  - Display how feedback affected weights
  - Show precision improvement over time
  - File: `app/settings/preferences/page.tsx` (new)

- [ ] **Monthly objective refresh reminder** (Future enhancement)
  - Notify user to review objectives
  - Suggest objective updates based on feedback
  - File: `inngest/monthly_review.ts` (future)

### Acceptance Criteria
- [x] Feedback updates weights correctly ✅ **COMPLETE**
- [x] Future insights reflect updated preferences ✅ **COMPLETE**
- [ ] User can see feedback impact (Future enhancement)
- [ ] Precision improves over time (tracked in metrics) (Future enhancement - needs monitoring)

### Testing Requirements
- [ ] **Integration tests**
  - Feedback → weight update → re-scoring
  - File: `tests/integration/feedback.test.ts`

---

## Future Flows (To Be Documented)

### Flow: "Run This For Me"
**Source**: docs/business/UX.md "Service overlay" section  
**Status**: Phase 2

### Flow: Objective Refresh
**Source**: docs/business/UX.md "Feedback loop" section  
**Status**: Future enhancement

---

## Flow Implementation Checklist Template

When implementing a new flow:

1. **Document the flow** in this file
2. **Break down into tasks** with file paths
3. **Add to docs/implementation/Roadmap.md** with timeline
4. **Create acceptance criteria**
5. **Define testing requirements**
6. **Update docs/implementation/IMPLEMENTATION_STATUS.md** with progress
7. **Verify against docs/business/UX.md** original specification

