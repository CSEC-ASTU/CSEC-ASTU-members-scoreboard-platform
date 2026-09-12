# Platform Improvements Log

This directory tracks architectural, behavioral, and functional improvements implemented in the **CSEC ASTU Platform** that go beyond the initial specifications in `docs/`.

Each document details the motivation, schema/API changes, implementation specifics, and verification criteria.

| ID | Title | Scope | Status |
|:---:|---|:---:|:---:|
| [01](01-login-attempt-failures.md) | Log Unmatched Google Login Attempts | Security / Auth | Shipped |
| [02](02-permission-grant-history.md) | Append-Only Permission Grant Audit History | Security / RBAC | Shipped |
| [03](03-auto-approve-low-stakes-claims.md) | Auto-Approve Low-Stakes & Automated Claims | Automation | Shipped |
| [04](04-refresh-token-store.md) | Cryptographic Server-Side Refresh Token Store & Rotation | Security / Auth | Shipped |
| [05](05-decision-reason-column.md) | Granular Decision Reason Column on Point Event Ledger | Auditability | Shipped |
| [06](06-configurable-initial-buffer-view.md) | Dynamic Loss-Aversion Initial Buffer (50 pts) via App Settings | Ledger Engine | Shipped |
| [07](07-request-id-middleware.md) | Distributed `X-Request-ID` Tracing Middleware | Observability | Shipped |
| [08](08-login-failures-admin-endpoint.md) | Officer Security Endpoint for Unmatched Login Triage | Security | Shipped |
| [09](09-attendance-session-codes.md) | Physical Presence Verification with 6-Digit Rotating Whiteboard PINs | Anti-Fraud | Shipped |
| [10](10-normal-warning-tier.md) | Three-Tier Disciplinary Matrix with Normal Warning (`-15 pts`) | Governance | Shipped |
| [11](11-duplicate-claim-prevention-engine.md) | Automated Multi-Vector Duplicate Claim Prevention Engine | Anti-Fraud | Shipped |
| [12](12-member-contact-fields-and-personal-email-auth.md) | Student Schema Expansion & Personal Email Google OAuth Alignment | Auth / Data | Shipped |
| [13](13-officer-productivity-and-export-suite.md) | Batch Adjustment Modal, Inactivity Radar & UTF-8 BOM CSV Exporter | Officer UX | Shipped |
| [14](14-google-form-csv-import-auto-mapper.md) | Google Form 14-Question CSV Auto-Mapper & 11-Card Pre-Flight Wizard | Onboarding | Shipped |
| [15](15-standalone-telegram-bot-service.md) | Standalone Telegram Bot Microservice (Port 8001) & Real-Time Push | Notifications | Shipped |
| [16](16-attendance-and-punctuality-engine.md) | Attendance & Punctuality Engine with 15-Min Late Detection & Club Sessions | Presence | Shipped |
| [17](17-modular-architecture-and-feature-sliced-design.md) | Modular Domain Schemas, Sliced Query Hooks & Backend Repository Layer | Architecture | Shipped |

---

For the complete architectural roadmap and executive audit scorecards, refer to [`PROJECT_ANALYSIS_AND_ROADMAP.md`](../PROJECT_ANALYSIS_AND_ROADMAP.md).
