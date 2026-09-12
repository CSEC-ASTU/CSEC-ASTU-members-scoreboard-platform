<div align="center">

# 🏛️ CSEC ASTU Platform
### Institutional Governance, Member Accountability & Scoreboard Engine

*An enterprise-grade collegiate governance platform engineered for the Computer Science and Engineering Club at Adama Science and Technology University (CSEC-ASTU).*

[![Audit Score](https://img.shields.io/badge/Audit%20Score-100%2F100%20(A%2B)-10b981?style=for-the-badge&logo=codacy&logoColor=white)](docs/PROJECT_ANALYSIS_AND_ROADMAP.md)
[![Pytest Suite](https://img.shields.io/badge/Pytest-53%20Passing-brightgreen?style=for-the-badge&logo=pytest&logoColor=white)](backend/tests)
[![FastAPI Core](https://img.shields.io/badge/FastAPI-Port%208000-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js 16](https://img.shields.io/badge/Next.js-16%20(React%2019)-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%20Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Telegram Bot](https://img.shields.io/badge/Telegram%20Bot-Port%208001-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](telegram_bot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Frankfurt-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![CI/CD Keep-Alive](https://img.shields.io/badge/Keep--Alive-24%2F7%20Active-ff69b4?style=for-the-badge&logo=githubactions&logoColor=white)](.github/workflows/keep-alive.yml)

---

</div>

## 📌 Executive Overview

The **CSEC ASTU Platform** replaces fragmented spreadsheets and informal attendance tracking with a **financial-grade double-entry point ledger**, strict **loss-aversion member psychology**, an **anti-fraud physical presence verification engine**, and a **Notion-style editorial database design system**.

Tailored specifically for ASTU's 7 technical divisions, the platform handles multi-division memberships, delegated officer permissions, rotating 6-digit whiteboard session codes, automated 15-minute late check-in detection, Telegram bot push notifications, batch triage operations, and pre-flight Google Form recruitment imports.

```
                                      CSEC-ASTU DISTRIBUTED TOPOLOGY
                                      
  ┌───────────────────────────────────┐               ┌───────────────────────────────────┐
  │     Next.js 16 Web Frontend       │               │     Telegram Bot Microservice     │
  │   React 19 / TypeScript / Radix   │               │      Python 3.13 / Port 8001      │
  │   Feature-Sliced Architecture     │               │     Real-Time Push Notifications  │
  └─────────────────┬─────────────────┘               └─────────────────┬─────────────────┘
                    │                                                   │
                    │ REST API (HttpOnly JWT)                           │ Webhooks & Polling
                    ▼                                                   ▼ Deep-Link Verification
  ┌───────────────────────────────────────────────────────────────────────────────────────┐
  │                               FastAPI Backend Core Service                            │
  │                                  Python 3.13 / Port 8000                              │
  │                                                                                       │
  │   ├── 12 REST API Routers              ├── Repository Abstraction Layer               │
  │   ├── 11 Domain Pydantic v2 Schemas    ├── Presence & Punctuality Engine              │
  │   └── RBAC Permission Guards           └── Ledger & Batch Adjustment Services         │
  └──────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             │ Async SQLAlchemy 2.0 Pool
                                             │ (Frankfurt Europe-West)
                                             ▼
  ┌───────────────────────────────────────────────────────────────────────────────────────┐
  │                             Neon Serverless PostgreSQL DB                             │
  │                                                                                       │
  │   ├── Append-Only Event Ledger (`point_events`)                                       │
  │   ├── Rotating Whiteboard Attendance Sessions (`attendance_sessions`)                 │
  │   ├── Standard 1224 Competition Ranking View (`member_scores`)                        │
  │   └── Historical Annual Archives (`annual_summaries`)                                 │
  └───────────────────────────────────────────────────────────────────────────────────────┘
                                             ▲
                                             │ 10-Minute Health Heartbeat
  ┌──────────────────────────────────────────┴────────────────────────────────────────────┐
  │                      GitHub Actions 24/7 Keep-Alive Workflow                          │
  │                 Automated Cron Runner Preventing Render Cold-Starts                   │
  └───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Core Architectural Pillars

### 1. 🏛️ Financial-Grade Immutable Points Ledger
- **Append-Only Ledger (`point_events`):** Raw member point totals are never directly modified in place. All scores are computed dynamically from an immutable, append-only event stream.
- **Dual Score Architecture:**
  - `cycle_score`: Annual point tally with platform score-cap protection (default: 2,500 pts) to prevent runaway leaderboards. Resets each academic year into archived `annual_summaries`.
  - `career_score`: Uncapped lifetime historical tally that persists across a member's entire university tenure for alumni credentials and resume verification.
- **Loss-Aversion Initial Buffer:** Every member starts with a **+50 point buffer** upon onboarding. Disciplinary deductions hit the buffer first, leveraging behavioral psychology to deter inactivity.
- **Standard Competition Ranking ("1224"):** Tied scores share identical ranks with proper rank skipping, computed natively via database window functions (`DENSE_RANK()` / `RANK()`).

### 2. 📄 Notion Database Redesign System
- **Editorial Borderless Tables:** All core tables (`/members`, `/leaderboard`, `/attendance`, `/claims`, `/permissions`) feature open-canvas, unboxed layouts with subtle row dividers and generous padding.
- **Sticky Column Headers:** Notion property indicators (`#` for ID/Rank, `Aa` for Names, tags for Roles/Divisions, calendar for Dates and Sessions).
- **High-Contrast Presence Matrix:** Interactive check-in grid featuring glowing emerald on-time chips, amber late badges, and subtle muted absence markers.
- **Hydration Safety & Zero Layout Shift:** Protected against SSR hydration mismatches via custom skeleton loaders (`attendance-skeleton.tsx`, `members-skeleton.tsx`) and debounced search filters.

### 3. ⏱️ Attendance & Punctuality Engine with 15-Minute Late Detection
- **Automated Punctuality Triage:** Automatically checks claim timestamps against session creation (`claim_time - created_at > 15 minutes`). Submissions after the 15-minute window are flagged as **Late**, calculating real-time **On-Time Rate %** and **Late Counts**.
- **6-Digit Rotating Whiteboard PINs:** Division Heads launch live sessions on demand with countdown timers (30m to 3h). PINs are written on physical lab whiteboards (`• • •   • • •`), stopping dorm proxy attendance farming. Includes an instant officer **"End Session" kill switch**.
- **Club-Wide Assemblies:** Supports general meetings, hackathons, and symposiums with `division_id = null`, accessible to all members across all 7 divisions.
- **Member Attendance Streak Hub:** Regular members access a dedicated personal timeline tracking attendance rate, active meeting streaks, and verified history.

### 4. 🛡️ Smart Access Control & Backend Privacy Scoping
- **Role-Tailored Views:**
  - **Executive Officers (President / VP):** Global cross-division oversight, division turnout comparisons, and multi-division comparative matrix.
  - **Division Heads:** Automatically scoped to their respective division matrix with selector locks preventing unauthorized cross-division queries.
  - **Regular Members:** Completely shielded from administrative rosters; isolated to personal stats and verified check-in history.
- **Strict Database-Level Scoping:** `GET /api/v1/attendance-sessions/matrix` filters at the SQL level via `WHERE Member.id == current_user.member.id` for members. Unauthorized cross-division requests by Division Heads return **HTTP 403 Forbidden**.
- **Administrative Route Isolation:** `/permissions` is protected by both sidebar menu suppression and an upfront client-side route guard.

### 5. 🤖 Standalone Telegram Bot Microservice (Port 8001)
- **Decoupled Architecture:** Runs as an independent Python 3.13 microservice on Port 8001 alongside the FastAPI core backend.
- **Cryptographic Deep-Linking:** Generates secure, short-lived bind tokens (`/start bind_<token>`) allowing members to link their Telegram accounts with one click.
- **Real-Time Push Engine:** Sends rich HTML notifications for claim approvals, rejections (with officer reasoning), warning sanctions, and upcoming lab sessions.
- **Resilient Delivery:** Dual-mode support for both webhooks and asynchronous long-polling with graceful reconnection.

### 6. ⚡ Officer Productivity & Batch Operations Suite
- **Interactive Batch Operations Modal (`batch-adjustment-dialog.tsx`):**
  - Searchable multi-select member picker with real-time division filtering, "Select All Filtered", and "Clear Selection".
  - One-click bulk adjustments: uniform bonuses, custom point deltas, or cohort-wide disciplinary actions.
  - Dedicated backend endpoint (`POST /api/v1/point-events/batch-officer`) executing within atomic transactional boundaries.
- **Inactivity Radar & Warning Ladder Triage (`inactivity-radar.tsx`):**
  - Instant visual triage surfacing members across risk categories:
    - 🔴 **Critical Zone (`cycle_score <= 0`):** Immediate dismissal risk under club bylaws.
    - 🟡 **Warning Zone (`1 - 25 pts`):** Probationary at-risk threshold.
    - 🟢 **Good Standing (`> 25 pts`):** Fully compliant.
- **One-Click RFC 4180 CSV / Excel Export Engine (`csv-export.ts`):**
  - Prepends Excel UTF-8 BOM (`\uFEFF`) ensuring Amharic and accented text render flawlessly in Microsoft Excel and Google Sheets.
  - Integrated across: Members Roster, Leaderboard Standings, Approvals Queue, and Audit Log.

### 7. 📋 Google Form 14-Question CSV Importer & Personal Email Auth
- **11-Card Pre-Flight Import Wizard (`csv-import-wizard.tsx`):**
  - Displays 10 emerald "Required" badges and 1 purple "Optional" badge (`secondary_division`).
  - Fuzzy header normalization parses complex Google Form questions automatically.
  - Client-side pre-flight table previews first 10 rows with issue warning pills before submitting.
- **Personal Email Google OAuth Alignment:**
  - Uses `Personal Email` as `Member.email` so Google OAuth logins match members' personal Google accounts, eliminating student-email lockout loops.

### 8. 🔄 24/7 Automated Keep-Alive Workflow
- **Zero Cold-Starts:** Scheduled GitHub Actions runner (`.github/workflows/keep-alive.yml`) pings `/health` endpoints on Render every 10 minutes.
- **Dual Service Probes:** Validates both FastAPI Core (Port 8000) and Telegram Bot (Port 8001) with response latency tracking.

---

## ⚠️ Three-Tier Disciplinary Matrix

| Tier | Point Delta | Bylaw Policy & Action |
| :--- | :---: | :--- |
| **Normal Warning** | **-15 pts** | Routine infraction penalty recorded on ledger without triggering formal dismissal ladder. |
| **Yellow Warning** | **-25 pts** | Formal probationary warning; triggers mandatory division head counseling. |
| **Red Warning** | **-50 pts** | Critical disciplinary sanction; triggers executive termination review. |
| **Layoff / Inactive** | *Terminal* | President-only action revoking active privileges while freezing historical career score. |

---

## 🌐 7 Official ASTU Technical Divisions

Members enroll in a **Primary Division** and an optional **Secondary Division**:
1. 💻 **Development** (Web, Mobile, Backend & Systems)
2. 🛡️ **Cybersecurity** (Offensive Security, CTFs, Forensics)
3. 🏆 **Competitive Programming** (ICPC, Codeforces, Algorithms)
4. 🤖 **Data Science & AI** (ML, Computer Vision, Analytics)
5. 🚀 **Capacity Building** (Workshops, Mentorship, Tech Bootcamps)
6. 📱 **Social Media & Outreach** (Branding, Events, Public Relations)
7. ⛓️ **Blockchain Team** (Smart Contracts, Web3, Distributed Ledgers)

---

## 🛠️ Technology Stack

| Layer | Technologies | Architectural Function |
| :--- | :--- | :--- |
| **Web Frontend** | **Next.js 16**, React 19, TypeScript 5, Tailwind CSS | App Router, Feature-Sliced architecture, TanStack Query v5, Radix primitives, Sonner toasts |
| **Core Backend** | **FastAPI**, Python 3.13, Pydantic v2, SQLAlchemy 2.0 | Async endpoints, repository abstraction layer, domain schemas, Alembic migrations |
| **Bot Microservice** | **Python 3.13**, `aiogram` / `python-telegram-bot` | Standalone microservice on Port 8001, deep-linking, real-time push engine |
| **Database** | **PostgreSQL** (Neon Serverless Frankfurt) | Multi-tenant schema, `-pooler` connection pooling (~300ms warm handshakes), immutable event ledger |
| **Authentication** | **Google OAuth 2.0**, HttpOnly Cookies, JWT | Refresh token store with cryptographic rotation, personal email alignment, CSRF state protection |
| **DevOps & CI/CD** | **GitHub Actions**, Docker, Render | 24/7 Keep-Alive heartbeat, automated linting, containerized microservices |
| **Quality & Tests** | **Pytest**, AnyIO, Asyncio | 53 automated tests covering auth, presence, batch ops, duplicates, and permissions |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.11+** (Python 3.13 recommended)
- **Node.js 20+** & **npm**
- **PostgreSQL Database** (or free [Neon.tech](https://neon.tech) serverless instance)

---

### 1. Backend Core Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
# Windows (PowerShell):
python -m venv .venv
.venv\Scripts\Activate.ps1

# Linux / macOS:
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, FRONTEND_URL, and GOOGLE_CLIENT_ID

# Run database migrations
alembic upgrade head

# Launch backend API server (Port 8000)
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API docs available at `http://localhost:8000/docs`.

---

### 2. Frontend Web Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Start development server (Port 3000)
npm run dev
```
Web application live at `http://localhost:3000`.

---

### 3. Telegram Bot Microservice Setup

```bash
# Navigate to telegram_bot directory
cd telegram_bot

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Configure TELEGRAM_BOT_TOKEN and BACKEND_API_URL

# Launch Telegram Bot microservice (Port 8001)
python -m bot.main
```

---

### 4. Running Verification Suite

```bash
# Run backend test suite (53 unit & integration tests)
cd backend
.venv\Scripts\pytest tests/ -v

# Verify frontend TypeScript build (0 errors)
cd frontend
npx tsc --noEmit
npm run build
```

---

## 📂 Repository Structure

```
csec-astu-platform/
├── backend/
│   ├── alembic/versions/         # 5 Alembic migrations (0001 through 0005)
│   ├── app/
│   │   ├── api/v1/routers/       # 12 FastAPI route controllers (auth, members, tasks, etc.)
│   │   ├── core/                 # Security, JWT tokens, RBAC permission checker
│   │   ├── models/               # SQLAlchemy 2.0 models (Member, Task, PointEvent, AttendanceSession)
│   │   ├── repositories/         # Data access layer (MemberRepository, TaskRepository, PointEventRepository)
│   │   ├── schemas/              # 11 Domain-driven Pydantic v2 schemas (auth, member, task, attendance, etc.)
│   │   └── services/             # Ledger calculations, batch adjustments, CSV import auto-mapper
│   └── tests/                    # 53 Automated Pytest tests (auth, attendance, batch, duplicates, RBAC)
├── frontend/
│   ├── app/                      # Next.js 16 App Router pages (clean 12-line routers)
│   ├── components/
│   │   ├── csec/                 # Domain components (InactivityRadar, BatchAdjustment, ImportWizard)
│   │   ├── dashboard/            # Semantic dashboard aliases (ActivityCard, StatsCard, WelcomeCard)
│   │   ├── kokonutui/            # Polished UI widgets (lists, achievement cards, profile cards)
│   │   └── ui/                   # Radix primitive components (buttons, dialogs, tables, badges)
│   ├── features/                 # Feature-sliced modules
│   │   ├── attendance/           # Attendance matrix, timeline, active sessions, PIN dialogs, skeletons
│   │   └── members/              # Members table, filters, header, CSV import wizard
│   ├── hooks/queries/            # 8 Domain-scoped React Query hooks (auth, member, task, attendance, etc.)
│   └── lib/
│       ├── api/                  # Typed API clients and endpoints
│       └── csv-export.ts         # RFC 4180 CSV export engine with UTF-8 BOM
├── telegram_bot/
│   ├── bot/                      # Standalone microservice (Port 8001)
│   │   ├── handlers/             # Telegram command handlers (/start, /bind, /stats)
│   │   └── services/             # Notification dispatcher and deep-link verification
│   └── requirements.txt          # Microservice dependencies
├── .github/workflows/
│   └── keep-alive.yml            # 24/7 Automated cron heartbeat workflow
└── docs/
    ├── README.md                 # Centralized Documentation Portal & Architecture Index
    ├── PROJECT_ANALYSIS_AND_ROADMAP.md # 100/100 Comprehensive Engineering Audit & Roadmap
    ├── ARCHITECTURE_UPDATE_GUIDE.md    # Modularization & Separation of Concerns Blueprint
    ├── api-contract.md                 # Complete REST API Contract Specification
    ├── bot-integration-guide.md        # Telegram Bot Microservice Integration Guide
    ├── design-guide.md                 # Notion Database Design System Guidelines
    ├── telegram-bot-messages.md        # Telegram Bot Message Templates & Formatting
    └── improvements/                   # 17 Shipped Architectural Upgrade Logs
```

---

## 📚 Documentation & Reference Links

- 🏛️ **[Documentation Portal (`docs/README.md`)](docs/README.md)**: Master documentation index, architecture topology, and sitemaps.
- 📊 **[Comprehensive Audit & Roadmap (100/100)](docs/PROJECT_ANALYSIS_AND_ROADMAP.md)**: Executive assessment, scorecards, and roadmap tracker.
- 📐 **[Architecture Update Guide](docs/ARCHITECTURE_UPDATE_GUIDE.md)**: Detailed breakdown of the modular refactoring and feature-sliced patterns.
- 💡 **[Platform Improvements Log](docs/improvements/README.md)**: 17 dedicated technical logs detailing each major architectural upgrade.
- 📑 **[REST API Contract](docs/api-contract.md)**: Complete endpoint documentation, request/response schemas, and auth flows.
- 🤖 **[Telegram Bot Integration Guide](docs/bot-integration-guide.md)**: Webhooks, polling, deep-linking, and push notification architecture.

---

## 👥 Authors & Maintainers

Built with ❤️ for **CSEC-ASTU**  
*Computer Science and Engineering Club, Adama Science and Technology University*  
*Adama, Oromia, Ethiopia.*
