# Improvement 17 — Modular Architecture, Separation of Concerns & Feature-Sliced Decomposition

## Status
Shipped (Phase 3.5 Refactoring)

## Motivation
As the platform grew to include Notion-style databases, real-time presence verification, and Telegram bot microservices, monolith files formed in both frontend and backend:
- `frontend/app/attendance/page.tsx` ballooned to **1,151 lines**, mixing matrix tables, personal timelines, live session dialogs, and stats cards.
- `frontend/app/members/page.tsx` reached **469 lines**, coupling the member directory, filters, pagination, and multi-step CSV import wizard.
- `backend/app/schemas.py` exceeded **530 lines** holding 40+ unrelated Pydantic models.
- `frontend/lib/hooks/use-queries.ts` had grown to **410 lines** combining every React Query hook into one single file.
- Direct database queries were scattered across route handlers, creating tight coupling to SQLAlchemy sessions.

## What Changed

### 1. Domain-Driven Backend Schema Modularization
- Split `backend/app/schemas.py` into a clean package `backend/app/schemas/` containing 11 domain modules:
  - `auth.py`, `member.py`, `division.py`, `task.py`, `claim.py`, `point_event.py`, `attendance.py`, `permission.py`, `dashboard.py`, `admin.py`, and `common.py`.
  - Maintained `backend/app/schemas/__init__.py` as a backward-compatible barrel export, ensuring zero breaking changes across all 12 routers and 53 unit tests.

### 2. Domain-Scoped React Query Hooks
- Decomposed the 410-line query file into `frontend/hooks/queries/`:
  - `use-auth-queries.ts`, `use-member-queries.ts`, `use-task-queries.ts`, `use-claim-queries.ts`, `use-point-queries.ts`, `use-attendance-queries.ts`, `use-dashboard-queries.ts`, and `use-admin-queries.ts`.
  - Re-exported via `frontend/hooks/queries/index.ts` and `frontend/lib/hooks/use-queries.ts` for 100% backward compatibility.

### 3. Feature-Sliced Frontend Architecture
- **Attendance Feature Slice (`frontend/features/attendance/`):**
  - Reduced `app/attendance/page.tsx` from **1,151 lines &rarr; 12 lines**.
  - Components: `attendance-matrix.tsx`, `attendance-timeline.tsx`, `active-sessions-card.tsx`, `create-session-dialog.tsx`, `attendance-stats-cards.tsx`, `attendance-skeleton.tsx`.
- **Members Feature Slice (`frontend/features/members/`):**
  - Reduced `app/members/page.tsx` from **469 lines &rarr; 12 lines**.
  - Components: `members-table.tsx`, `members-header.tsx`, `members-filters.tsx`, `members-skeleton.tsx`.

### 4. Backend Repository Pattern
- Introduced an abstraction layer in `backend/app/repositories/`:
  - `MemberRepository`: Member roster querying, ID lookup, email lookup, and Google ID claiming.
  - `PointEventRepository`: Immutable event logging, batch adjustment generation, and ledger stream retrieval.
  - `TaskRepository`: Task definitions, division-scoped queries, and repeatable task verification.

### 5. Semantic Component Grouping
- Created `frontend/components/dashboard/` to provide clean domain aliases for dashboard cards (`activity-card`, `stats-card`, `welcome-card`, etc.).
