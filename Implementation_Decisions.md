# Implementation Decisions & Rationale

## 1. Scoring Logic (Hybrid Rule-Based + LLM Enhancement)

### Base Rules (Rule-Based Foundation)
```typescript
// Base score components (0-100 scale)
- Signal type weights:
  - marketplace: 40
  - launch: 35
  - funding: 30
  - changelog: 25
  - blog: 15
  - pr: 10
  - hire: 5

- Recency decay: 
  - Published today: 1.0x
  - Published 1-3 days ago: 0.9x
  - Published 4-7 days ago: 0.7x
  - Published 8-14 days ago: 0.5x
  - Published 15+ days ago: 0.3x

- Objective priority multipliers:
  - Priority 1: 1.5x
  - Priority 2: 1.2x
  - Priority 3: 1.0x

- Objective type match bonuses:
  - Exact match (e.g., signal="marketplace" + objective="marketplace"): +30
  - Related match (e.g., signal="launch" + objective="co_market"): +15
  - No match: +0
```

### LLM Enhancement
- LLM analyzes signal content against objectives to add/subtract 0-20 points based on semantic relevance
- Final score = (base_score * recency * priority_multiplier) + objective_match_bonus + llm_adjustment
- Cap at 100, floor at 0

**Rationale**: Rule-based provides explainability and consistency; LLM adds nuance for edge cases. Users can see score breakdown (transparency requirement).

---

## 2. Objectives Structure

**MVP Approach**: Predefined enum types with optional detail field for context.

```typescript
enum ObjectiveType {
  integrations = "integrations",
  co_sell = "co_sell", 
  co_market = "co_market",
  marketplace = "marketplace",
  geography = "geography",
  vertical = "vertical"
}
```

- User selects type from dropdown
- Optional `detail` text field for specifics (e.g., "Co-list on data marketplaces", "Focus on EMEA")
- Priority: 1 (highest) to 3 (lowest)

**Rationale**: 
- Faster setup (no free-text parsing)
- Consistent scoring (type-based matching)
- Detail field provides context for LLM without complexity
- Aligns with ICP need for speed (≤5 min setup)

---

## 3. Deduplication Strategy

**MVP**: Hash-based only (`sha1(url + title)`)

**Phase 2 Enhancement**: Add similarity checking for:
- Same partner + similar title (Levenshtein distance < 3) within 7 days
- Same partner + same domain path (different query params) within 3 days

**Rationale**: Hash-based is fast, reliable, and sufficient for MVP. Similarity checking adds complexity and can be tuned based on real-world feedback.

---

## 4. RSS Autodetect Logic

**Smart Discovery Order**:
1. User-provided URL (if valid RSS/Atom)
2. Try common paths in order:
   - `/feed`
   - `/rss`
   - `/rss.xml`
   - `/feed.xml`
   - `/blog/feed`
   - `/blog/rss`
   - `/news/feed`
   - `/company-news/rss.xml`
3. Parse HTML `<link rel="alternate" type="application/rss+xml">` tags
4. Fallback: prompt user to provide RSS URL

**Implementation**: 
- Use `feedparser` or similar library
- Validate feed format before saving
- Show detected URL in UI with "Edit" option

**Rationale**: Reduces friction for ICP (they want speed). Most major partners have standard RSS paths. HTML parsing catches edge cases.

---

## 5. Outreach Drafts

**MVP Approach**: Context-aware but template-based

```typescript
// Draft structure
- Opening: Personalized greeting (partner name)
- Context: Signal summary (2-3 sentences)
- Hook: Why it matters (from insight.why)
- Ask: Specific action (from insight.actions[0])
- CTA: Clear next step
- Signature: Generic but professional
```

**Personalization Levels**:
- Level 1 (MVP): Partner name, signal context, action type
- Level 2 (Phase 2): Relationship history, past interactions, tone adjustment

**Rationale**: 
- MVP needs to be "ready to send" but not over-engineered
- Template-based ensures consistency and speed
- Can enhance with relationship data later

---

## 6. Feedback Mechanism

**MVP Feedback Impact**:

```typescript
// Per-user learning weights (stored in user preferences JSONB)
{
  signalTypeWeights: {
    marketplace: 1.0,  // baseline
    launch: 1.0,
    // ... adjusted based on thumbs
  },
  objectiveTypeWeights: {
    integrations: 1.0,
    co_sell: 1.0,
    // ... adjusted based on thumbs
  },
  sourceWeights: {
    rss: 1.0,
    github: 1.0,
    // ... for future sources
  }
}

// Adjustment logic
- Thumbs up on insight: +0.1 to matching signal type + objective type weights
- Thumbs down: -0.1 to matching weights
- Mark N/A: -0.15 (stronger signal that it's noise)
- Cap weights: 0.5 to 2.0 range
```

**Rationale**: 
- Simple but effective learning
- Per-user customization (important for diverse ICP needs)
- Weighted scoring allows gradual improvement
- Can add more sophisticated ML later

---

## 7. CSV Import Scope (MVP)

**MVP**: Partners only (bulk import)

**Format**:
```csv
name,domain,rss_url,github_org,notes
Snowflake,snowflake.com,https://www.snowflake.com/en/feed/,,Data platform
```

**Phase 2**: Add objectives and watchlist import

**Rationale**: 
- Partners are the core entity users need to bulk-add
- Objectives are strategic (users should set thoughtfully, not bulk import)
- Watchlist can be added per-partner in UI

---

## 8. Authentication (NextAuth)

**MVP Configuration**:
- Email magic links only
- No domain restrictions (open signup)
- Session: 30 days
- No team invites (single-user MVP)

**Phase 2**: 
- Domain-based orgs
- Team invites
- Role-based access

**Rationale**: 
- Simplest path to MVP
- ICP is small teams (often single user initially)
- Can add org features when users request it

---

## 9. Inngest Job Cadence

**MVP**: Fixed schedules
- `partner_ingest`: Every 6 hours (4x/day)
- `partner_digest`: Daily at 8 AM user's timezone (or weekly per user preference)

**Phase 2**: 
- User-configurable ingest frequency (6h, 12h, daily)
- Digest time preferences

**Rationale**: 
- Fixed schedules simplify MVP
- 6h ingest balances freshness vs. API costs
- Daily digest aligns with UX (weekly rhythm, Monday actions)

---

## 10. "Run This For Me" Button

**MVP**: Hidden (not in UI)

**Phase 2**: 
- Add button to digest items
- Show "Coming soon" modal or queue for service tier

**Rationale**: 
- MVP focuses on intelligence + drafts
- Service overlay is Phase 2 feature
- Avoids confusion/promise we can't deliver yet

---

## Additional Implementation Notes

### Error Handling
- RSS fetch failures: Log, retry 3x with exponential backoff, mark partner as "needs attention"
- LLM failures: Fallback to rule-based scoring, log error
- Digest send failures: Retry once, log for manual follow-up

### Rate Limiting
- RSS fetches: Max 10 partners per ingest run (Inngest limit)
- LLM calls: Batch where possible, use mini model for summarize/classify
- Digest: One per user per cadence period

### Data Retention
- Signals: Keep all (needed for timeline view)
- Insights: Keep all (needed for feedback learning)
- Soft delete partners (don't lose historical data)

### Monitoring (MVP)
- Log key events: ingest runs, insight generation, digest sends
- Track: precision@5, latency, actions/week per user
- Simple dashboard: Inngest runs, error rates, user activity

### Security
- Tenant isolation: All queries filtered by `user_id`
- RSS URLs: Validate format, no SSRF (use allowlist or fetch service)
- API routes: Auth required, rate limit per user

