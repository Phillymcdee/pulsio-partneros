# Flow Template

Use this template when documenting a new user flow from `docs/business/UX.md`.

---

## Flow: [Flow Name]
**Source**: docs/business/UX.md [section name]  
**User Goal**: [What is the user trying to accomplish?]

### User Journey
1. [Step 1 - what user does]
2. [Step 2 - what user does]
3. [Step 3 - what user does]
...

### Implementation Tasks

#### [Task Category 1]
- [ ] **Task Name**
  - Description of what needs to be built
  - File: `path/to/file.ts` or `app/path/page.tsx`
  - Dependencies: [other tasks or features]
  - Notes: [any special considerations]

- [ ] **Another Task**
  - Description
  - File: `path/to/file.ts`
  - Dependencies: [list]

#### [Task Category 2]
- [ ] **Task Name**
  - Description
  - File: `path/to/file.ts`
  - Dependencies: [list]

### Acceptance Criteria
- [ ] Criterion 1 (measurable, testable)
- [ ] Criterion 2 (measurable, testable)
- [ ] Criterion 3 (measurable, testable)

### Testing Requirements
- [ ] **Unit tests**
  - What functions need unit tests
  - File: `lib/__tests__/[name].test.ts`

- [ ] **Integration tests**
  - What flows need integration tests
  - File: `tests/integration/[name].test.ts`

- [ ] **E2E tests (Playwright)**
  - What user journey needs E2E test
  - File: `tests/e2e/[name].spec.ts`

### Dependencies
- [ ] Feature X must be completed first
- [ ] API Y must be available
- [ ] Database schema Z must exist

### Notes
- Any additional context, edge cases, or considerations

---

## Example: Flow Template Usage

```markdown
## Flow: First Run (≤5 min)
**Source**: docs/business/UX.md "First run" section  
**User Goal**: Get set up and receive first Partner Pulse in ≤5 minutes

### User Journey
1. Sign in (magic link)
2. Add partners/targets (paste list); auto-detect RSS
3. Select 2–3 objectives; set priorities
4. Choose cadence + channel
5. App backfills 7 days → creates first Partner Pulse

### Implementation Tasks

#### Onboarding Detection
- [ ] **Check onboarding status**
  - Query user's partners, objectives, and channels count
  - Return onboarding status (complete/incomplete)
  - File: `lib/onboarding.ts` → `getOnboardingStatus(userId)`
  - Dependencies: Database schema (partners, objectives, channels tables)

...
```

---

## Checklist for Creating a New Flow

When documenting a new flow:

1. [ ] Read the UX flow in `docs/business/UX.md`
2. [ ] Understand the user goal and context
3. [ ] Break down into implementation tasks
4. [ ] Identify detection logic (when does flow trigger?)
5. [ ] Identify UI components needed
6. [ ] Identify completion logic (what happens when done?)
7. [ ] Identify integration points (how does it connect?)
8. [ ] Write acceptance criteria (measurable, testable)
9. [ ] Define testing requirements
10. [ ] Add to `docs/implementation/USER_FLOWS.md`
11. [ ] Update `docs/implementation/Roadmap.md` with timeline
12. [ ] Update `docs/implementation/IMPLEMENTATION_STATUS.md` with tasks

