# PartnerOS (Pulsio Partnerships) — Docs Pack

This folder gives Cursor's agent rich context to build the MVP.

**Core docs**
- ICP.md — Ideal Customer Profile & personas
- Problem_JTBD.md — Problems, Jobs-to-be-Done, outcomes
- UX.md — End-to-end user experience
- Architecture.md — Tech stack & repo layout
- DataModel.md — Entities & tables
- Workflows.md — Ingestion, scoring, digest
- Prompts.md — LLM prompts & response formats
- Metrics_Success.md — KPIs, acceptance criteria
- Pricing_Packaging.md — Plans & offers
- Roadmap.md — 10-day build, next phases
- Risks_Guardrails.md — Pre-mortem & safeguards

**Flow & Implementation docs**
- USER_FLOWS.md — **Maps UX flows to implementation tasks** (read before implementing)
- Implementation_Decisions.md — Technical decisions & rationale
- IMPLEMENTATION_STATUS.md — What's done, what's remaining
- FLOW_TEMPLATE.md — Template for documenting new flows

**Dev helpers**
- Cursor_Rules.md — How to work with this repo in Cursor
- API_Contracts.md — Internal function shapes / API stubs
- Sample_Data.md — Seed examples for dev & demos

**Implementation workflow:**
1. Start with **Architecture.md** and **DataModel.md** for implementation
2. **Read UX.md** to understand user flows
3. **Check USER_FLOWS.md** for flow → task mappings
4. Wire jobs from **Workflows.md**
5. Copy prompts from **Prompts.md**
6. Follow **Cursor_Rules.md** for flow-first implementation approach
