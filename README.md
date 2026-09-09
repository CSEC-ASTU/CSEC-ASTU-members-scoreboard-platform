# CSEC ASTU Member Management & Scoreboard Platform

A production-grade member accountability, point ledger, and governance platform for the **Computer Science and Engineering Club at Adama Science and Technology University (CSEC-ASTU)**.

---

## Architecture Overview

```
csec-astu-platform/
├── backend/          # FastAPI async backend (Python 3.13 / SQLAlchemy 2.0 / Alembic)
├── frontend/         # Next.js 16 (React 19 / TypeScript / Tailwind CSS / Radix / KokonutUI)
└── docs/             # PRD specifications, database schema, API contracts, and roadmap
```

### Core Tenets
- **Append-Only Points Ledger:** All scores are derived strictly from immutable point events (`point_events`), preventing direct database manipulation and providing a complete audit history.
- **Dual Score Architecture:**
  - `cycle_score`: Annual cycle score capped at a platform setting (default: 2,500 pts) to prevent runaway leaderboards. Resets annually into archived `annual_summaries`.
  - `career_score`: Uncapped lifetime historical tally that persists across academic years for resume and LinkedIn credentialing.
- **Dual-Division Membership:** Members can participate in up to two divisions (primary and secondary), with task claiming and officer reviews strictly division-scoped.
- **Delegated Duty Permissions:** Role-based access control (`member`, `division_head`, `vice_president`, `president`) augmented by granular delegated grants (`approve_task`, `manage_tasks`, etc.).
- **Psychological Loss Aversion:** Members receive an initial buffer of +50 points upon entry. Negative warning deductions feel tangible and deter inactivity.

---

## Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Configure your DATABASE_URL and Google OAuth credentials in .env

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
Interactive OpenAPI documentation will be available at `http://localhost:8000/docs`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The application will be live at `http://localhost:3000`.

---

## Documentation & Roadmap

- [Project Analysis, Audit & Roadmap](docs/PROJECT_ANALYSIS_AND_ROADMAP.md): Comprehensive evaluation, 85/100 scorecard, performance breakdown, and recommended roadmap.
- [API Contract](docs/csec-astu-api-contract.md): Detailed REST endpoints, schemas, and error definitions.
- [Platform Architecture (PRD)](docs/csec-astu-member-management-platform%20(3).md): Full system specification, score mechanics, and governance policies.
- [Backend README](backend/README.md): Backend specific configuration, auth cookies, and migrations.
