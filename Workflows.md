# Workflows

## partner_ingest (cron: 6h)
1. Load partners with `rss_url` (and later changelog/GitHub).
2. Fetch feed → iterate items:
   - Build `dedupe_hash`; skip if exists.
   - Summarize content (mini model).
   - Classify type → facets.
   - Insert `signals`.
3. Load user `objectives`.
4. Compute `score` (rule-based + LLM enhancement).
5. Generate **insight** (JSON: why, score, actions[], outreachDraft).
6. Insert `insights`.

## partner_digest (cron: daily @ user morning OR weekly)
1. For each user, select recent top `insights` by `score`.
2. Render items (email + Slack).
3. Include action buttons/links (copy outreach, mark N/A).

## Feedback & tuning
- **👍/👎** on insight: adjust type/source weights for user.
- **Mark N/A**: downweight duplicates/known items.
- **Objective change**: rebalance scoring weights.

## Service overlay (later)
- “Run this for me” pushes insight into **ops queue** with status (`Queued → Sent → Awaiting Reply → Booked`).
