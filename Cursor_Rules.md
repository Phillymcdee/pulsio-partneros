# Cursor Rules — How to Work with This Repo

## Documentation Structure

**Core docs** (read first):
- `ICP.md` — Ideal Customer Profile & personas
- `Problem_JTBD.md` — Problems, Jobs-to-be-Done, outcomes
- `UX.md` — End-to-end user experience (flows, journeys)
- `Architecture.md` — Tech stack & repo layout
- `DataModel.md` — Entities & tables
- `Workflows.md` — Ingestion, scoring, digest (backend jobs)
- `Prompts.md` — LLM prompts & response formats
- `Metrics_Success.md` — KPIs, acceptance criteria
- `Pricing_Packaging.md` — Plans & offers
- `Roadmap.md` — 10-day build, next phases
- `Risks_Guardrails.md` — Pre-mortem & safeguards

**Flow & Implementation docs**:
- `USER_FLOWS.md` — **Maps UX flows to implementation tasks** (read before implementing features)
- `Implementation_Decisions.md` — Technical decisions & rationale
- `IMPLEMENTATION_STATUS.md` — What's done, what's remaining
- `FLOW_TEMPLATE.md` — Template for documenting new flows

**Dev helpers**:
- `API_Contracts.md` — Internal function shapes / API stubs
- `Sample_Data.md` — Seed examples for dev & demos

## Implementation Process (Flow-First Approach)

### 1. Before Implementing Any Feature

**Always start with UX flows:**

1. **Read `UX.md`** to understand the user journey
2. **Check `USER_FLOWS.md`** for flow → task mappings
3. **Review `Roadmap.md`** to see where it fits in the timeline
4. **Check `IMPLEMENTATION_STATUS.md`** to see what's already done

### 2. For Each UX Flow, Ensure:

- **Detection logic**: When does this flow trigger? (e.g., first-time user, specific state)
- **UI components**: What does the user see? (pages, modals, wizards)
- **Completion logic**: What happens when the flow completes? (triggers, redirects, data updates)
- **Integration points**: How does it connect to other features? (APIs, jobs, state)

### 3. Implementation Checklist

When implementing a feature or flow:

- [ ] Read the relevant UX flow in `UX.md`
- [ ] Check `USER_FLOWS.md` for existing task breakdown
- [ ] If flow doesn't exist in `USER_FLOWS.md`, create it using `FLOW_TEMPLATE.md`
- [ ] Break down into concrete tasks with file paths
- [ ] Add tasks to `Roadmap.md` if not already there
- [ ] Implement features + orchestration together (not separately)
- [ ] Update `IMPLEMENTATION_STATUS.md` as you complete tasks
- [ ] Verify against `UX.md` acceptance criteria
- [ ] Write tests (unit, integration, E2E as specified in flow)

### 4. Code Organization

**Follow the Architecture.md structure:**
- `app/` — Next.js pages and API routes
- `lib/` — Core business logic (rss, scoring, insights, etc.)
- `inngest/` — Background jobs (ingest, digest, backfill)
- `drizzle/` — Database schema and migrations
- `components/` — Reusable React components
- `tests/` — Test files (unit, integration, e2e)

**Naming conventions:**
- Files: kebab-case (`partner-ingest.ts`)
- Components: PascalCase (`OnboardingWizard.tsx`)
- Functions: camelCase (`getOnboardingStatus`)
- Types: PascalCase (`OnboardingStatus`)

### 5. Database & Schema

- Always use Drizzle ORM (no raw SQL)
- Tenant isolation: All queries must filter by `userId`
- Schema changes: Update `drizzle/schema.ts`, then run `npm run db:push`
- Migrations: Use `npm run db:generate` for production migrations

### 6. API Routes

- Use Next.js 15 App Router conventions
- All routes must check authentication (`getCurrentUser()`)
- Tenant isolation: Filter by `userId` in all queries
- Error handling: Return appropriate HTTP status codes
- Type safety: Use TypeScript types from `lib/schema.ts`

### 7. Background Jobs (Inngest)

- Use Inngest for scheduled jobs and durable steps
- Jobs: `partner_ingest` (6h cron), `partner_digest` (daily/weekly)
- Manual triggers: Create API routes (`/api/ingest`, `/api/digest`)
- Error handling: Log errors, retry logic where appropriate

### 8. Testing

- **Unit tests**: Test individual functions (`lib/__tests__/`)
- **Integration tests**: Test database operations, API routes (`tests/integration/`)
- **E2E tests**: Test complete user flows (`tests/e2e/`)
- Run tests: `npm test` (unit), `npm run test:e2e` (Playwright)

### 9. Common Patterns

**Authentication:**
```typescript
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of logic
}
```

**Tenant isolation:**
```typescript
const partners = await db
  .select()
  .from(partners)
  .where(eq(partners.userId, user.id));
```

**Error handling:**
```typescript
try {
  // ... logic
} catch (error) {
  console.error('Error description:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

### 10. When Adding New Features

1. **Check if it's part of an existing flow** in `USER_FLOWS.md`
2. **If new flow**, document it in `USER_FLOWS.md` using the template
3. **Update `Roadmap.md`** with timeline
4. **Update `IMPLEMENTATION_STATUS.md`** as you progress
5. **Follow the implementation checklist above**

### 11. Key Principles

- **Flow-first**: Always think about user journeys, not just features
- **Orchestration matters**: Features need to work together, not in isolation
- **Tenant isolation**: Every query must filter by user
- **Type safety**: Use TypeScript types everywhere
- **Error handling**: Graceful failures, clear error messages
- **Testing**: Write tests for critical paths
- **Documentation**: Update docs as you implement

### 12. Common Mistakes to Avoid

- ❌ Building features without checking UX flows
- ❌ Missing orchestration logic (detection, completion, routing)
- ❌ Forgetting tenant isolation in queries
- ❌ Not updating `USER_FLOWS.md` when adding flows
- ❌ Implementing features separately without connecting them
- ❌ Skipping tests for critical paths

### 13. Questions to Ask Before Implementing

- What UX flow does this belong to?
- When does this flow trigger?
- What happens when the flow completes?
- How does this connect to other features?
- What are the acceptance criteria?
- What tests are needed?

---

**Remember**: Features are just building blocks. User flows are what create value. Always implement both the features AND the orchestration that connects them.
