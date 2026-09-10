<div align="center">

# 🏛️ CSEC ASTU Platform
### Member Management, Accountability & Scoreboard Engine

*An institutional-grade collegiate governance platform engineered for the Computer Science and Engineering Club at Adama Science and Technology University (CSEC-ASTU).*

[![Audit Score](https://img.shields.io/badge/Audit%20Score-98%2F100%20(A%2B)-10b981?style=for-the-badge&logo=codacy&logoColor=white)](docs/PROJECT_ANALYSIS_AND_ROADMAP.md)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python 3.13](https://img.shields.io/badge/Python-3.13.14-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Next.js 16](https://img.shields.io/badge/Next.js-16%20(React%2019)-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![Pytest](https://img.shields.io/badge/Pytest-19%20Passed-brightgreen?style=for-the-badge&logo=pytest&logoColor=white)](backend/tests)

---

</div>

## 📌 Executive Overview

The **CSEC ASTU Platform** replaces informal spreadsheets and manual attendance tracking with a **financial-grade double-entry point ledger**, strict **loss-aversion member psychology**, and an **anti-fraud physical presence verification engine**.

Designed specifically for ASTU's 7 technical divisions, the platform handles multi-division memberships, delegated officer permissions, rotating session codes, batch triage, and automated Google Form recruitment imports.

```
                                  CSEC-ASTU PLATFORM TOPOLOGY
                                  
  ┌─────────────────────────┐          ┌──────────────────────────┐          ┌─────────────────────────┐
  │   Next.js 16 Frontend   │          │     FastAPI Backend      │          │    Neon PostgreSQL      │
  │  React 19 / TypeScript  │ ◄──────► │ Async SQLAlchemy 2.0     │ ◄──────► │ Serverless Frankfurt    │
  │  TanStack Query v5 / UI │   REST   │ 5 Alembic Migrations     │   Pool   │ Immutable Ledger Views  │
  └─────────────────────────┘          └──────────────────────────┘          └─────────────────────────┘
               ▲                                     ▲                                    ▲
               │                                     │                                    │
    ┌──────────────────────┐              ┌──────────────────────┐             ┌──────────────────────┐
    │  Officer Dashboard   │              │ Presence Code Engine │             │  Google OAuth + CSV  │
    │  Radar / Batch Ops   │              │ 6-Digit Rotating PIN │             │  Auto-Mapper 11-Card │
    └──────────────────────┘              └──────────────────────┘             └──────────────────────┘
```

---

## ⚡ Core Architectural Pillars

### 1. 🏛️ Financial-Grade Immutable Points Ledger
- **Append-Only Ledger (`point_events`):** Raw point totals are never directly modified in the database. All member scores are calculated on-the-fly via the immutable ledger stream.
- **Dual Score Architecture:**
  - `cycle_score`: Annual point tally with platform score-cap protection (default: 2,500 pts) to prevent runaway leaderboards. Resets each academic year into archived `annual_summaries`.
  - `career_score`: Uncapped lifetime historical tally that persists across a member's university tenure for resume and LinkedIn extracurricular credentialing.
- **Loss-Aversion Initial Buffer:** Every member starts with a **+50 point buffer** upon onboarding. Disciplinary deductions hit the buffer first, leveraging behavioral psychology to deter inactivity.

### 2. ⚡ Officer Productivity & Batch Operations Suite
- **Interactive Batch Operations Modal (`batch-adjustment-dialog.tsx`):**
  - Searchable multi-select member picker with real-time division filtering, "Select All Filtered", and "Clear Selection".
  - One-click bulk adjustments: uniform bonuses, custom point deltas, or cohort-wide disciplinary actions.
  - Dedicated backend endpoint (`POST /api/v1/point-events/batch-officer`) executing within transactional boundaries.
- **Inactivity Radar & Warning Ladder Triage (`inactivity-radar.tsx`):**
  - Instant visual triage surfacing members across risk categories:
    - 🔴 **Critical Zone (`cycle_score <= 0`):** Immediate dismissal risk under club bylaws.
    - 🟡 **Warning Zone (`1 - 25 pts`):** Probationary at-risk threshold.
    - 🟢 **Good Standing (`> 25 pts`):** Fully compliant.
  - Pre-populated 1-click action buttons ("Issue Warning", "Award Points") to accelerate triage.
- **One-Click RFC 4180 CSV / Excel Export Engine (`csv-export.ts`):**
  - Prepends Excel UTF-8 BOM (`\uFEFF`) ensuring Amharic and accented text render flawlessly in Microsoft Excel and Google Sheets.
  - Integrated across: Members Roster, Leaderboard Standings, Approvals Queue, and Audit Log.

### 3. 🔐 Anti-Fraud & Physical Presence Engine
- **Dynamic 6-Digit Rotating Whiteboard Session PINs (`AttendanceSession`):**
  - Eliminates dorm attendance farming and proxy claiming on campus Telegram groups.
  - Division Heads launch live sessions on demand with customizable countdown timers (30m to 3h).
  - PINs are written on physical club lab whiteboards; members enter the 6 digits (`• • •   • • •`) in their claim dialog.
  - Includes an immediate officer **"End Session" kill switch** and database-level unique constraint (`uq_point_events_member_session`).
- **Automated Duplicate Claim Prevention Engine:**
  - **Pending Review Guard:** Blocks submissions if a claim for the task is already awaiting officer review (`400 Bad Request`).
  - **Non-Repeatable Task Guard:** Blocks submissions if a task has `is_repeatable = False` and has been approved (`400 Bad Request`).
  - **Cooldown Lock:** Enforces a 24-hour cooldown on repeatable tasks.
  - **Session Lock:** Strictly limits 1 claim per `attendance_session_id`.

### 4. 📋 Google Form 14-Question CSV Importer & Contact Schema
- **Alembic Migration (`0005_add_member_contact_fields.py`):**
  - Added `student_id` (`String(50)`), `phone_number` (`String(50)`), and `github_url` (`String(255)`) to `Member`.
- **Personal Email Google OAuth Alignment:**
  - Uses `Personal Email (use one you check regularly)` as `Member.email` so Google OAuth logins match members' personal Google accounts.
  - University student emails are explicitly discarded from authentication storage to eliminate login lockouts.
- **11-Card Pre-Flight Import Wizard (`csv-import-wizard.tsx`):**
  - Displays 10 emerald "Required" badges and 1 purple "Optional" badge (`secondary_division`).
  - Fuzzy header normalization parses complex Google Form questions automatically.
  - Client-side pre-flight table previews first 10 rows with issue warning pills before submitting.

### 5. ⚠️ Three-Tier Disciplinary Matrix
| Tier | Point Delta | Purpose & Bylaw Policy |
| :--- | :---: | :--- |
| **Normal Warning** | **-15 pts** | Standard logged penalty on the ledger for routine infractions without triggering the dismissal ladder. |
| **Yellow Warning** | **-25 pts** | Formal probationary warning; triggers mandatory officer counseling. |
| **Red Warning** | **-50 pts** | Critical disciplinary sanction; triggers executive termination review. |
| **Layoff / Inactive** | *Terminal* | President-only action revoking active privileges while freezing historical career score. |

### 6. 🌐 7 Official ASTU Technical Divisions
Members can enroll in a **Primary Division** and an optional **Secondary Division**:
1. 💻 **Development**
2. 🛡️ **Cybersecurity**
3. 🏆 **Competitive Programming**
4. 🤖 **Data Science**
5. 🚀 **Capacity Building**
6. 📱 **Social Media & Outreach**
7. ⛓️ **Blockchain Team**

---

## 🛠️ Technology Stack

| Layer | Technologies | Key Highlights |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 16**, React 19, TypeScript 5, Tailwind CSS | App Router, TanStack Query v5 (0ms tab switches), KokonutUI / Radix primitives, Sonner toasts |
| **Backend** | **FastAPI**, Python 3.13, Pydantic v2 | Fully async endpoints, SQLAlchemy 2.0 async sessions, Alembic migrations, custom RBAC dependencies |
| **Database** | **PostgreSQL** (Neon Serverless Frankfurt) | Multi-tenant schema, `-pooler` connection pooling (~300ms warm handshakes), immutable event ledger |
| **Authentication** | **Google OAuth 2.0**, HttpOnly Cookies, JWT | Refresh token store with cryptographic rotation, personal email alignment, CSRF state protection |
| **Quality & Tests** | **Pytest**, AnyIO, Asyncio | 19 automated unit tests covering attendance, batch operations, duplicate prevention, and permissions |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.11+** (Python 3.13 recommended)
- **Node.js 20+** & **npm**
- **PostgreSQL Database** (or free [Neon.tech](https://neon.tech) serverless instance)

---

### 1. Backend Setup

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

# Launch backend API server
uvicorn app.main:app --reload --port 8000
```
API docs will be live at `http://localhost:8000/docs`.

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Start development server
npm run dev
```
Web app will be live at `http://localhost:3000`.

---

### 3. Running Verification & Tests

```bash
# Run backend test suite (19 unit tests)
cd backend
.venv\Scripts\pytest tests/

# Verify frontend TypeScript build
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
│   │   ├── api/v1/routers/       # FastAPI route controllers (auth, members, tasks, point_events, etc.)
│   │   ├── core/                 # Security, JWT tokens, RBAC permission checker
│   │   ├── models/               # SQLAlchemy 2.0 models (Member, Task, PointEvent, AttendanceSession)
│   │   ├── schemas/              # Pydantic v2 schemas and request/response DTOs
│   │   └── services/             # Ledger calculations, batch adjustments, CSV import auto-mapper
│   └── tests/                    # Automated Pytest suite (attendance, batch, duplicates, permissions)
├── frontend/
│   ├── app/                      # Next.js 16 App Router pages (dashboard, tasks, approvals, members, etc.)
│   ├── components/
│   │   ├── csec/                 # Custom domain components (InactivityRadar, BatchAdjustment, ImportWizard)
│   │   ├── kokonutui/            # Polished UI widgets (lists, achievement cards, profile cards)
│   │   └── ui/                   # Radix primitive components (buttons, dialogs, tables, badges)
│   └── lib/
│       ├── api/                  # Typed API clients and endpoints
│       ├── csv-export.ts         # RFC 4180 CSV export engine with UTF-8 BOM
│       └── hooks/                # TanStack Query hooks with targeted cache invalidation
└── docs/
    ├── PROJECT_ANALYSIS_AND_ROADMAP.md # Comprehensive 98/100 engineering audit & roadmap
    ├── improvements/             # Detailed log of 14 shipped architectural improvements
    └── csec-astu-api-contract.md # REST API contracts and data schemas
```

---

## 📚 Documentation & Reference Links

- 📊 **[Comprehensive Audit & Roadmap (98/100)](docs/PROJECT_ANALYSIS_AND_ROADMAP.md)**: Executive assessment, architectural scorecards, and roadmap tracker.
- 💡 **[Architectural Improvements Log](docs/improvements/README.md)**: 14 dedicated technical logs covering session codes, normal warnings, duplicate prevention, and schema migrations.
- 📑 **[API Contract Specification](docs/csec-astu-api-contract.md)**: REST endpoints, query parameters, and JSON payloads.
- 📐 **[Original Platform PRD](docs/csec-astu-member-management-platform%20(3).md)**: Governing bylaws, score mechanics, and role permissions.

---

## 👥 Authors & Maintainers

Built with ❤️ for **CSEC-ASTU** (Computer Science and Engineering Club, Adama Science and Technology University).  
*Adama, Oromia, Ethiopia.*
