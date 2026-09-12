# 📚 CSEC-ASTU Platform — Documentation Portal & Architecture Index

<div align="center">

[![Platform Version](https://img.shields.io/badge/Platform%20Version-v3.5%20Institutional-6366f1?style=for-the-badge)](PROJECT_ANALYSIS_AND_ROADMAP.md)
[![Audit Score](https://img.shields.io/badge/Audit%20Score-100%2F100%20(A%2B)-10b981?style=for-the-badge&logo=codacy&logoColor=white)](PROJECT_ANALYSIS_AND_ROADMAP.md)
[![API Contract](https://img.shields.io/badge/API-REST%20v1%20Compliant-0ea5e9?style=for-the-badge&logo=fastapi&logoColor=white)](api-contract.md)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20Neon-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)

*Welcome to the centralized engineering documentation and technical specifications portal for the Computer Science and Engineering Club at Adama Science and Technology University (CSEC-ASTU).*

</div>

---

## 🧭 Documentation Map & Catalog

This directory contains the authoritative architecture blueprints, API contracts, design guides, and improvement records governing the platform.

```
docs/
├── README.md                              # Central Documentation Portal (You are here)
├── PROJECT_ANALYSIS_AND_ROADMAP.md        # 100/100 Comprehensive Engineering Audit & Roadmap
├── ARCHITECTURE_UPDATE_GUIDE.md           # Modularization Guide & Separation of Concerns Blueprint
├── api-contract.md                        # Exhaustive REST API Specification (Endpoints, DTOs, Auth)
├── design-guide.md                        # Notion Database Design System & Visual Tokens
├── bot-integration-guide.md               # Standalone Telegram Bot Architecture (Port 8001)
├── telegram-bot-messages.md               # Bot Command Scripting & Rich Formatting Templates
│
└── improvements/                          # 17 Detailed Shipped Architectural Upgrades
    ├── 01-login-attempt-failures.md       # Audit logging for unmatched Google logins
    ├── 02-permission-grant-history.md     # Append-only RBAC delegation audit log
    ├── 03-auto-approve-low-stakes-claims.md # Zero-touch claim resolution engine
    ├── 04-refresh-token-store.md          # Cryptographic refresh token rotation
    ├── 05-decision-reason-column.md       # Granular rejection reason tracking on ledger
    ├── 06-configurable-initial-buffer-view.md # Dynamic loss-aversion 50-point buffer
    ├── 07-request-id-middleware.md        # Distributed X-Request-ID tracing
    ├── 08-login-failures-admin-endpoint.md # Executive login failure triage endpoint
    ├── 09-attendance-session-codes.md     # 6-digit rotating whiteboard PIN engine
    ├── 10-normal-warning-tier.md          # -15 point routine infraction disciplinary tier
    ├── 11-duplicate-claim-prevention-engine.md # Multi-guard duplicate claim rejection
    ├── 12-member-contact-fields-and-personal-email-auth.md # Student schema & personal email OAuth
    ├── 13-officer-productivity-and-export-suite.md # Inactivity Radar, batch deltas & CSV export
    ├── 14-google-form-csv-import-auto-mapper.md # 14-question Google Form auto-mapper wizard
    ├── 15-standalone-telegram-bot-service.md # Standalone bot microservice & push engine
    ├── 16-attendance-and-punctuality-engine.md # 15-min late arrival detection & club sessions
    └── 17-modular-architecture-and-feature-sliced-design.md # Feature-sliced decomposition
```

---

## 🏛️ System Architecture Topology

The platform is architected around a high-performance decoupled microservice topology:

```
                                  CSEC-ASTU SYSTEM TOPOLOGY
                                  
   ┌────────────────────────────────┐                 ┌─────────────────────────────────┐
   │    Next.js 16 Web Frontend     │                 │   Telegram Bot Microservice     │
   │  React 19 / TypeScript 5 / UI  │                 │    Python 3.13 / Port 8001      │
   │  TanStack Query v5 / Radix     │                 │    Async Webhooks & Polling     │
   └───────────────┬────────────────┘                 └────────────────┬────────────────┘
                   │                                                   │
                   │  REST API (HttpOnly JWT)                          │  Push Notifications
                   ▼                                                   ▼  & Verification Deep-Links
   ┌────────────────────────────────────────────────────────────────────────────────────┐
   │                               FastAPI Backend Core                                 │
   │                                Python 3.13 / Port 8000                             │
   │                                                                                    │
   │  ├── API Routers (12 domains)        ├── Repositories (Member, Task, PointEvent)   │
   │  ├── Pydantic v2 Schemas (11 domains)├── Services (Ledger, Batch, CSV Mapper)      │
   │  └── Core Engine (RBAC, JWT, Anti-Fraud Presence Verification)                     │
   └─────────────────────────────────────────┬──────────────────────────────────────────┘
                                             │
                                             │ SQLAlchemy 2.0 Async Session
                                             │ (-pooler Connection Pooling)
                                             ▼
   ┌────────────────────────────────────────────────────────────────────────────────────┐
   │                         Neon Serverless PostgreSQL DB                              │
   │                              AWS Frankfurt Region                                  │
   │                                                                                    │
   │  ├── Financial-Grade Append-Only Ledger (`point_events`)                           │
   │  ├── Rotating Physical Whiteboard Presence Sessions (`attendance_sessions`)        │
   │  ├── Standardized 1224 Academic Competition Ranks (`member_scores` view)           │
   │  └── Historical Annual Archives (`annual_summaries`)                               │
   └────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📑 Core Specifications Quick Reference

### 1. [REST API Contract](api-contract.md)
The complete contract governing client-backend communication:
- Base URL: `/api/v1`
- **Authentication:** Google OAuth 2.0 with HttpOnly session cookies (`access_token` and `refresh_token`), personal email alignment, and server-side cryptographic rotation.
- **12 Dedicated Domain Resource Routers:** Auth, Members, Tasks, Claims, Point Events, Attendance, Divisions, Permissions, Dashboard, Admin, Bot, and Settings.
- **Status & Error Protocol:** Strict RFC 7807 compliant error payloads with machine-readable detail codes.

### 2. [Comprehensive Audit & Roadmap](PROJECT_ANALYSIS_AND_ROADMAP.md)
Authoritative analysis document evaluating architecture, security, and governance:
- **Financial-Grade Double-Entry Ledger:** All points are derived dynamically from immutable append-only events.
- **Dual Score Structure:** `cycle_score` (capped at 2,500 pts, resets annually into `annual_summaries`) vs `career_score` (uncapped lifetime tally).
- **Loss-Aversion Buffer:** Members receive a **+50 point buffer** upon onboarding; penalties hit the buffer first to discourage inactivity.
- **Three-Tier Disciplinary Sanctions:** Normal Warning (`-15 pts`), Yellow Warning (`-25 pts`), and Red Warning (`-50 pts`).

### 3. [Notion Database Design System](design-guide.md)
Design guidelines governing the UI transformation:
- **Borderless Editorial Layout:** Open-canvas design system replacing legacy boxed borders and shadows.
- **Sticky Column Headers:** Notion property icons (`#` for IDs/Ranks, `Aa` for Names, tag icon for Roles/Divisions, calendar icon for Dates).
- **High-Contrast Presence Matrix:** Visual check-in grid featuring glowing emerald on-time chips, amber late badges, and subtle muted absence markers.
- **Zero-Layout Shift & Hydration Safety:** Server-safe hydration guards, skeleton loaders, and debounced search inputs.

### 4. [Standalone Telegram Bot Service](bot-integration-guide.md)
Microservice architecture connecting members directly to club activity:
- Dedicated Python service running on **Port 8001**.
- Account linking via cryptographically signed deep-links (`/start bind_<token>`).
- Real-time push notifications for approved claims, warning sanctions, upcoming workshops, and attendance session announcements.
- Resilient polling and webhook modes with automatic failover.

### 5. [Architecture Update Guide](ARCHITECTURE_UPDATE_GUIDE.md)
The comprehensive engineering blueprint executed during Phase 3 refactoring:
- **Frontend Decomposition:** 1,151-line attendance page reduced to 12 lines via `frontend/features/attendance/`.
- **Backend Schema Modularization:** 530-line `schemas.py` refactored into 11 isolated domain modules in `app/schemas/`.
- **React Query Hook Slices:** 410-line query file decomposed into 8 targeted hooks in `frontend/hooks/queries/`.
- **Repository Pattern:** Database interaction abstracted into `backend/app/repositories/`.

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

| Capability | President | Vice President | Division Head | Regular Member |
|---|:---:|:---:|:---:|:---:|
| **View Own Scores & Personal Timeline** | ✅ | ✅ | ✅ | ✅ |
| **Claim Regular Task Points** | ✅ | ✅ | ✅ | ✅ |
| **Enter 6-Digit Whiteboard PIN** | ✅ | ✅ | ✅ | ✅ |
| **Browse Members Directory** | ✅ (Full) | ✅ (Full) | ✅ (Full) | 👁️ (Masked Contacts) |
| **Launch Division Attendance Session** | ✅ | ✅ | ✅ (Own Division) | ❌ |
| **Launch Club-Wide Attendance Session** | ✅ | ✅ | ❌ | ❌ |
| **Approve / Reject Claims** | ✅ | ✅ | ✅ (Own Division) | ❌ |
| **Execute Batch Point Adjustments** | ✅ | ✅ | ❌ | ❌ |
| **View Inactivity Radar** | ✅ | ✅ | ❌ | ❌ |
| **Import Google Form CSV** | ✅ | ✅ | ❌ | ❌ |
| **Export Roster to RFC 4180 CSV** | ✅ | ✅ | ✅ | ❌ |
| **Manage RBAC Permissions (`/permissions`)** | ✅ | ✅ | ❌ (Route Guarded) | ❌ (Route Guarded) |

---

## 🧪 Verification & Engineering Standards

The codebase enforces strict quality gates across all modules:

```bash
# 1. Backend Pytest Suite (53 Tests Passing)
cd backend
.venv\Scripts\pytest tests/ -v

# 2. Frontend TypeScript Build Verification (0 Errors)
cd frontend
npx tsc --noEmit
npm run build
```

---

## 👥 Engineering & Governance

Platform developed and maintained for **CSEC-ASTU**  
*Computer Science and Engineering Club, Adama Science and Technology University*  
*Adama, Oromia, Ethiopia.*
