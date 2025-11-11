# Data Model (Drizzle)

## Entities
- **users**: id, email, created_at
- **partners**: id, user_id, name, domain, rss_url, github_org, notes
- **objectives**: id, user_id, type(enum), detail, priority
- **watchlist**: id, partner_id, keyword
- **signals**: id, partner_id, type, title, source_url, summary, facets jsonb, published_at, dedupe_hash
- **insights**: id, signal_id, objective_id?, score, why, recommendation, actions jsonb, outreach_draft
- **channels**: id, user_id, email_enabled, slack_webhook_url, cadence

## Notes
- `signals.facets` holds extracted entities (products, regions, categories).
- `insights.actions` is array of `{ label, ownerHint, dueInDays }`.
- `dedupe_hash` = sha1(url + title).
