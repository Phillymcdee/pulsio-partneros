# PartnerOS (Pulsio Partnerships)

PartnerOS helps partnership teams stay on top of partner opportunities by automatically monitoring RSS feeds, scoring signals, and delivering prioritized insights via email or Slack.

**Getting Started**
- [GETTING_STARTED.md](./GETTING_STARTED.md) — **Start here** for setup instructions

## Documentation Structure

### 📚 Business & Product
- [ICP.md](./docs/business/ICP.md) — Ideal Customer Profile & personas
- [Problem_JTBD.md](./docs/business/Problem_JTBD.md) — Problems, Jobs-to-be-Done, outcomes
- [UX.md](./docs/business/UX.md) — End-to-end user experience
- [Pricing_Packaging.md](./docs/business/Pricing_Packaging.md) — Plans & offers
- [Metrics_Success.md](./docs/business/Metrics_Success.md) — KPIs, acceptance criteria
- [Risks_Guardrails.md](./docs/business/Risks_Guardrails.md) — Pre-mortem & safeguards

### 🏗️ Architecture & Technical
- [Architecture.md](./docs/architecture/Architecture.md) — Tech stack & repo layout
- [DataModel.md](./docs/architecture/DataModel.md) — Entities & tables
- [Workflows.md](./docs/architecture/Workflows.md) — Ingestion, scoring, digest

### 🔨 Implementation
- [USER_FLOWS.md](./docs/implementation/USER_FLOWS.md) — **Maps UX flows to implementation tasks** (read before implementing)
- [IMPLEMENTATION_STATUS.md](./docs/implementation/IMPLEMENTATION_STATUS.md) — What's done, what's remaining
- [Implementation_Decisions.md](./docs/implementation/Implementation_Decisions.md) — Technical decisions & rationale
- [Roadmap.md](./docs/implementation/Roadmap.md) — 10-day build, next phases
- [FLOW_TEMPLATE.md](./docs/implementation/FLOW_TEMPLATE.md) — Template for documenting new flows

### 🧪 Testing & QA
- [QA_TESTING_PLAN.md](./docs/testing/QA_TESTING_PLAN.md) — QA testing checklist and procedures
- [QA_SUMMARY_REPORT.md](./docs/testing/QA_SUMMARY_REPORT.md) — Test results and status

### 📖 Reference
- [API_Contracts.md](./docs/reference/API_Contracts.md) — Internal function shapes / API stubs
- [Prompts.md](./docs/reference/Prompts.md) — LLM prompts & response formats
- [Sample_Data.md](./docs/reference/Sample_Data.md) — Seed examples for dev & demos
- [Cursor_Rules.md](./docs/reference/Cursor_Rules.md) — How to work with this repo in Cursor

## Implementation Workflow

1. Start with **[GETTING_STARTED.md](./GETTING_STARTED.md)** for setup
2. Read **[Architecture.md](./docs/architecture/Architecture.md)** and **[DataModel.md](./docs/architecture/DataModel.md)** for implementation
3. **Read [UX.md](./docs/business/UX.md)** to understand user flows
4. **Check [USER_FLOWS.md](./docs/implementation/USER_FLOWS.md)** for flow → task mappings
5. Wire jobs from **[Workflows.md](./docs/architecture/Workflows.md)**
6. Copy prompts from **[Prompts.md](./docs/reference/Prompts.md)**
7. Follow **[Cursor_Rules.md](./docs/reference/Cursor_Rules.md)** for flow-first implementation approach
