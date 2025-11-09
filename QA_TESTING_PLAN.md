# PartnerOS MVP - QA Testing Plan

## Overview
This document outlines the comprehensive QA testing plan for the PartnerOS MVP. The codebase is ready for testing and QA validation.

## Test Infrastructure

### Unit Tests (Vitest)
- Location: `lib/__tests__/`
- Files:
  - `classify.test.ts` - Signal type classification
  - `scoring.test.ts` - Scoring algorithm
  - `rss.test.ts` - RSS feed parsing and deduplication
  - `digest.test.ts` - Digest generation
  - `onboarding.test.ts` - Onboarding logic

### Integration Tests (Vitest)
- Location: `lib/__tests__/integration.test.ts`
- Covers:
  - Onboarding flow
  - Digest generation
  - Feedback system
  - Tenant isolation
  - RSS → Signal → Deduplication pipeline
  - Signal processing pipeline
  - Feedback → Weight update → Re-scoring

### E2E Tests (Playwright)
- Location: `tests/e2e/`
- Files:
  - `basic.spec.ts` - Basic navigation and authentication
  - `onboarding.spec.ts` - Onboarding flow
  - `partners.spec.ts` - Partner management
  - `objectives.spec.ts` - Objectives management
  - `channels.spec.ts` - Channel configuration
  - `digest.spec.ts` - Digest receipt and interaction
  - `feedback.spec.ts` - Feedback system

## QA Checklist

### 1. Environment Setup ✅
- [ ] All required environment variables configured
- [ ] Database migrations applied
- [ ] Test database configured (separate from production)
- [ ] Inngest configured for testing
- [ ] External services (OpenAI, Resend, Slack) configured

### 2. Unit Tests ✅
- [ ] All unit tests pass
- [ ] Test coverage ≥80% for core functions
- [ ] Edge cases covered
- [ ] Error handling tested

**Run:** `npm test`

### 3. Integration Tests ✅
- [ ] All integration tests pass
- [ ] Database operations verified
- [ ] Tenant isolation verified
- [ ] Pipeline flows tested end-to-end
- [ ] Feedback system verified

**Run:** `npm test` (includes integration tests)

### 4. E2E Tests ✅
- [ ] All E2E tests pass
- [ ] Onboarding flow works end-to-end
- [ ] Partner management works
- [ ] Objectives management works
- [ ] Channel configuration works
- [ ] Digest generation and delivery works
- [ ] Feedback system works

**Run:** `npm run test:e2e`

### 5. Functional Testing

#### 5.1 Authentication & Authorization
- [ ] Email magic link authentication works
- [ ] Protected routes redirect unauthenticated users
- [ ] Onboarding middleware enforces completion
- [ ] Tenant isolation prevents cross-user data access

#### 5.2 Partner Management
- [ ] Add partner with RSS URL
- [ ] RSS autodetect works correctly
- [ ] CSV import works
- [ ] Edit partner details
- [ ] View partner timeline
- [ ] "Nudge Deeper Play" generates draft

#### 5.3 Objectives Management
- [ ] Add objective
- [ ] Edit objective priority
- [ ] Minimum 2 objectives enforced in onboarding
- [ ] Objectives affect scoring

#### 5.4 Channel Configuration
- [ ] Configure email channel
- [ ] Configure Slack webhook
- [ ] Set digest cadence
- [ ] Test email delivery
- [ ] Test Slack delivery

#### 5.5 RSS Ingestion
- [ ] RSS feed fetching works
- [ ] Deduplication prevents duplicates
- [ ] Signal creation from RSS items
- [ ] Error handling for invalid feeds
- [ ] Retry logic for failed fetches

#### 5.6 Signal Processing Pipeline
- [ ] Signal classification (launch, changelog, blog, etc.)
- [ ] Signal summarization
- [ ] Scoring calculation
- [ ] Insight generation
- [ ] Score breakdown visible

#### 5.7 Digest Generation
- [ ] Digest includes top-N insights
- [ ] Digest sorted by score
- [ ] Email digest formatted correctly
- [ ] Slack digest formatted correctly
- [ ] Action links work (copy draft, feedback)
- [ ] Hot signals filter works (score ≥80)

#### 5.8 Feedback System
- [ ] Thumbs up updates preferences
- [ ] Thumbs down updates preferences
- [ ] Mark N/A works
- [ ] Feedback affects future scoring
- [ ] Feedback via email links works
- [ ] Feedback via Slack buttons works

#### 5.9 Onboarding Flow
- [ ] Onboarding wizard displays correctly
- [ ] Step 1: Add partners works
- [ ] Step 2: Set objectives works (min 2)
- [ ] Step 3: Configure delivery works
- [ ] Completion triggers backfill
- [ ] Backfill fetches 7 days of history
- [ ] Post-completion redirects to dashboard
- [ ] Can complete in ≤5 minutes

#### 5.10 Action Queue/Approval Workflow
- [ ] Insights have status field
- [ ] Status transitions work (pending → ready_to_send → approved → sent)
- [ ] Single insight approval works
- [ ] Batch approval works
- [ ] Dashboard shows action queue
- [ ] Status badges display correctly

### 6. Performance Testing
- [ ] Partner add → first insight latency ≤10 min
- [ ] RSS ingestion handles multiple feeds
- [ ] Digest generation completes in reasonable time
- [ ] Database queries optimized
- [ ] No memory leaks

### 7. Security Testing
- [ ] Rate limiting works on API routes
- [ ] Input validation prevents injection
- [ ] Slack signature verification works
- [ ] Tenant isolation enforced
- [ ] Environment variables not exposed
- [ ] SQL injection prevention verified

### 8. Error Handling
- [ ] Graceful error messages
- [ ] Error boundaries catch React errors
- [ ] API errors return proper status codes
- [ ] Logging captures errors
- [ ] Retry logic for transient failures

### 9. UI/UX Testing
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Forms validate input
- [ ] Responsive design works
- [ ] Accessibility basics (keyboard navigation, ARIA labels)

### 10. Data Integrity
- [ ] Database constraints enforced
- [ ] Foreign key relationships maintained
- [ ] Data deduplication works
- [ ] Timestamps accurate
- [ ] Soft deletes work (if implemented)

## Test Execution

### Prerequisites
1. Set up test environment variables
2. Run database migrations
3. Ensure test database is separate from production

### Running Tests

```bash
# Unit and integration tests
npm test

# E2E tests (requires dev server running)
npm run test:e2e

# Test with UI
npm run test:ui
```

### Manual Testing Scenarios

#### Scenario 1: New User Onboarding
1. Sign up with email
2. Complete onboarding wizard
3. Verify backfill triggers
4. Verify redirect to dashboard
5. Verify initial insights appear

#### Scenario 2: Partner RSS Ingestion
1. Add partner with RSS URL
2. Trigger manual ingestion
3. Verify signals created
4. Verify deduplication works
5. Verify insights generated

#### Scenario 3: Digest Delivery
1. Generate digest manually
2. Verify email sent (check inbox)
3. Verify Slack message sent (check channel)
4. Test action links (copy draft, feedback)
5. Verify feedback updates preferences

#### Scenario 4: Feedback Loop
1. Give thumbs up to insight
2. Verify preferences updated
3. Generate new insight
4. Verify scoring reflects feedback

## Known Issues & Limitations

### From IMPLEMENTATION_STATUS.md
- ✅ All known issues resolved
- Consider Redis for rate limiting at scale (optional)
- Add full Sentry SDK integration (scaffolded)

## Acceptance Criteria

### From Metrics_Success.md
- [ ] First-run flow completion ≤5 min
- [ ] Precision@5 ≥60% (track thumbs up/down on top 5 insights)
- [ ] Actions/week per user ≥2
- [ ] Error rate <5% (RSS failures, LLM failures, digest send failures)

## QA Sign-off

### Test Results Summary
- [ ] All unit tests: ___/___ passing
- [ ] All integration tests: ___/___ passing
- [ ] All E2E tests: ___/___ passing
- [ ] Manual testing: ___/___ scenarios passing

### Issues Found
- [ ] Critical: ___
- [ ] High: ___
- [ ] Medium: ___
- [ ] Low: ___

### Sign-off
- [ ] QA Lead: _________________ Date: _______
- [ ] Tech Lead: _________________ Date: _______

## Next Steps After QA
1. Fix any critical/high priority issues
2. Re-run tests
3. Deploy to staging environment
4. Perform smoke tests in staging
5. Deploy to production
6. Monitor metrics and error rates

