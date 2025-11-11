# Documentation Organization

This document describes the organization of all documentation files in the PartnerOS repository.

## Structure Overview

```
/
├── README.md                    # Main project overview and navigation
├── GETTING_STARTED.md          # Setup and getting started guide
├── .env.example                # Environment variables template
└── docs/
    ├── business/               # Product & business documentation
    ├── architecture/           # Technical architecture & design
    ├── implementation/         # Implementation status & flows
    ├── testing/                # QA & testing documentation
    └── reference/              # Reference materials & helpers
```

## Directory Details

### `/docs/business/` - Product & Business Documentation
- **ICP.md** - Ideal Customer Profile & personas
- **Problem_JTBD.md** - Problems, Jobs-to-be-Done, outcomes
- **UX.md** - End-to-end user experience
- **Pricing_Packaging.md** - Plans & offers
- **Metrics_Success.md** - KPIs, acceptance criteria
- **Risks_Guardrails.md** - Pre-mortem & safeguards

### `/docs/architecture/` - Technical Architecture
- **Architecture.md** - Tech stack & repo layout
- **DataModel.md** - Database entities & tables
- **Workflows.md** - Backend jobs (ingestion, scoring, digest)

### `/docs/implementation/` - Implementation Documentation
- **USER_FLOWS.md** - Maps UX flows to implementation tasks
- **IMPLEMENTATION_STATUS.md** - Current status, what's done, what's remaining
- **Implementation_Decisions.md** - Technical decisions & rationale
- **Roadmap.md** - Timeline, phases, planned features
- **FLOW_TEMPLATE.md** - Template for documenting new flows

### `/docs/testing/` - Testing & QA
- **QA_TESTING_PLAN.md** - QA testing checklist and procedures
- **QA_SUMMARY_REPORT.md** - Test results and status

### `/docs/reference/` - Reference Materials
- **API_Contracts.md** - Internal function shapes / API stubs
- **Prompts.md** - LLM prompts & response formats
- **Sample_Data.md** - Seed examples for dev & demos
- **Cursor_Rules.md** - How to work with this repo in Cursor

## Quick Navigation

- **New to the project?** Start with [GETTING_STARTED.md](../GETTING_STARTED.md)
- **Understanding the product?** Read [docs/business/UX.md](business/UX.md)
- **Implementing features?** Check [docs/implementation/USER_FLOWS.md](implementation/USER_FLOWS.md)
- **Checking status?** See [docs/implementation/IMPLEMENTATION_STATUS.md](implementation/IMPLEMENTATION_STATUS.md)
- **Technical details?** Review [docs/architecture/Architecture.md](architecture/Architecture.md)

## File Organization Principles

1. **Root level**: Only essential entry points (README.md, GETTING_STARTED.md)
2. **Categorized by purpose**: Business, Architecture, Implementation, Testing, Reference
3. **Logical grouping**: Related documents are grouped together
4. **Clear navigation**: README.md provides clear links to all documentation
5. **Updated references**: All internal links updated to reflect new structure

