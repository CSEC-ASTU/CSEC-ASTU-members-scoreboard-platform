# CSEC ASTU Platform — Architecture & Maintainability Blueprint

**Document Version:** 1.0.0  
**Target Audience:** Core Maintainers, System Architects, Full-Stack Engineers  
**Scope:** Backend (`FastAPI`), Frontend (`Next.js 16 App Router`), and Telegram Microservice (`FastAPI Port 8001`)  
**Status:** Active Architectural Reference & Migration Guide  

---

## Executive Summary & Purpose

The **CSEC ASTU Member Management Platform** has reached 100% operational feature completeness (financial ledger integrity, attendance verification with automated late detection, Notion-style tables, and Telegram push integration). 

However, rapid feature iteration has led to structural consolidation debt:
1. **"God Pages" in Frontend:** `frontend/app/attendance/page.tsx` (1,134 lines) and `frontend/app/admin/page.tsx` (~1,000 lines) mix network calls, local state, table layout, subcomponent widgets, and CSV export formatting in a single file.
2. **Centralized Query Monolith:** `frontend/lib/hooks/use-queries.ts` (406 lines) bundles queries and mutations for 10 unrelated domains into a single file.
3. **Template Component Naming:** `frontend/components/kokonutui/` contains generic template artifacts (`list-01.tsx`, `list-02.tsx`, `profile-01.tsx`) rather than domain-descriptive identifiers.
4. **Backend Schema Consolidation:** `backend/app/schemas/__init__.py` (427 lines) packs all Pydantic DTOs for the entire platform into a single file.
5. **Fat Routers:** `backend/app/api/v1/routers/members.py` and `attendance.py` mix SQL query construction, business calculation, and HTTP concerns.

This document serves as an authoritative reference manual for refactoring the folder structure, establishing strict Separation of Concerns (SoC), and ensuring seamless long-term maintenance.

---

## Table of Contents
1. [Architectural Principles & Separation of Concerns (SoC)](#1-architectural-principles--separation-of-concerns-soc)
2. [Current vs. Target Architecture Map](#2-current-vs-target-architecture-map)
3. [Backend Architecture & Restructuring Guide](#3-backend-architecture--restructuring-guide)
   - [3.1 Target Directory Layout](#31-target-directory-layout)
   - [3.2 Modularizing Schemas](#32-modularizing-schemas)
   - [3.3 Introducing the Repository & Service Layer](#33-introducing-the-repository--service-layer)
   - [3.4 Fat Router Decomposition](#34-fat-router-decomposition)
4. [Frontend Architecture & Restructuring Guide](#4-frontend-architecture--restructuring-guide)
   - [4.1 Target Directory Layout (Domain / Feature Slices)](#41-target-directory-layout-domain--feature-slices)
   - [4.2 Decomposing God Pages](#42-decomposing-god-pages)
   - [4.3 Modularizing React Query Hooks](#43-modularizing-react-query-hooks)
   - [4.4 KokonutUI Template Renaming](#44-kokonutui-template-renaming)
   - [4.5 Retiring & Deprecating Mock Data (`csec-data.ts`)](#45-retiring--deprecating-mock-data-csec-datats)
5. [Telegram Bot & Microservice Contract Boundary](#5-telegram-bot--microservice-contract-boundary)
6. [Step-by-Step Low-Risk Migration Roadmap](#6-step-by-step-low-risk-migration-roadmap)
7. [Code Conventions & Maintainability Checklist](#7-code-conventions--maintainability-checklist)

---

## 1. Architectural Principles & Separation of Concerns (SoC)

Every component, file, and function must have a single, unambiguous reason to change:

```
+---------------------------------------------------------------------------------------+
|                               SEPARATION OF CONCERNS                                  |
+---------------------------------------------------------------------------------------+
| LAYER             | RESPONSIBILITY                          | FORBIDDEN CONCERNS      |
+-------------------+-----------------------------------------+-------------------------+
| Presentation (UI) | HTML/JSX, CSS styling, local view state | Direct SQL/DB calls,    |
|                   | (modals open, tab switches), accessible | direct fetch/axios      |
|                   | UI primitives, keyboard events.         | formatting without DTOs.|
+-------------------+-----------------------------------------+-------------------------+
| Application State | React Query caching, stale-time, cache  | UI layout, DOM          |
| / Hooks (Client)  | invalidation, optimistic rollbacks.     | manipulation, CSS.      |
+-------------------+-----------------------------------------+-------------------------+
| API Client (DTO)  | HTTP transport, bearer token injection, | Business state, UI      |
|                   | serialization & deserialization.        | components.             |
+-------------------+-----------------------------------------+-------------------------+
| Router/Controller | Route registration, query param         | Complex DB joins,       |
| (Backend API)     | validation, status codes, auth guard.   | direct domain math.     |
+-------------------+-----------------------------------------+-------------------------+
| Domain Service    | Business workflows (points calculations,| HTTP request/response,  |
| (Backend Service) | warnings, late rules, transaction flow).| HTML/DOM rendering.     |
+-------------------+-----------------------------------------+-------------------------+
| Data Access Layer | Raw SQL queries, database connections,  | HTTP status codes,      |
| (ORM / Repo)      | index-optimized joins, paging.          | request cookies/headers.|
+---------------------------------------------------------------------------------------+
```

---

## 2. Current vs. Target Architecture Map

```
CURRENT REPOSITORY STRUCTURE                   PROPOSED TARGET ARCHITECTURE
----------------------------                   -----------------------------
backend/                                       backend/
  app/                                           app/
    api/v1/routers/ [Fat Routers]                  api/v1/routers/ [Thin HTTP Endpoints]
    core/                                          core/
    models/ [15 isolated files]                    models/ [Models & ORM Mappings]
    schemas/                                       schemas/
      __init__.py [427 lines, ALL DTOs]              common.py
    services/                                        auth.py, members.py, attendance.py
      [mix of utilities & partial logic]             point_events.py, tasks.py, etc.
                                                   repositories/ [NEW: Data Access Layer]
                                                     member_repo.py, attendance_repo.py
                                                   services/ [Full Domain Business Logic]
                                                     attendance_service.py, etc.

frontend/                                      frontend/
  app/                                           app/ [Next.js Routing Only: Thin Pages]
    attendance/page.tsx [1,134 lines!]             attendance/page.tsx [<80 lines!]
    admin/page.tsx [~1,000 lines!]                 admin/page.tsx [<100 lines!]
  components/                                    features/ [NEW: Domain-Driven Modules]
    csec/ [12 flat components, 40KB dialogs]       attendance/
    kokonutui/ [list-01.tsx, profile-01.tsx]         components/, hooks/, types.ts
    ui/ [Radix Primitives]                         members/, admin/, leaderboard/
  hooks/ [use-toast.ts]                          components/
  lib/                                             ui/ [Shadcn / Radix primitives]
    api/services/ [11 flat files]                  layout/ [Navbar, Sidebar, Theme]
    hooks/use-queries.ts [406 lines monolith]    hooks/ [Consolidated generic hooks]
    csec-data.ts [930 lines legacy mock data]    lib/api/ [Shared API clients & core DTOs]
```

---

## 3. Backend Architecture & Restructuring Guide

### 3.1 Target Directory Layout

```text
backend/app/
├── api/
│   ├── dependencies.py          # FastAPI dependencies (DbSession, RequireUser, etc.)
│   └── v1/
│       ├── api.py               # Main router aggregating v1 modules
│       └── routers/             # Thin HTTP Controllers
│           ├── admin.py
│           ├── attendance.py
│           ├── auth.py
│           ├── divisions.py
│           ├── leaderboard.py
│           ├── members.py
│           ├── point_events.py
│           └── tasks.py
├── core/
│   ├── config.py                # Pydantic Settings & Environment Variables
│   ├── database.py              # Async SQLAlchemy Engine & SessionLocal
│   ├── permissions.py           # Institutional RBAC rules & evaluators
│   ├── rate_limit.py            # Rate limiting engine
│   └── security.py              # Password hashing & JWT token creation
├── models/                      # SQLAlchemy ORM Models (Preserve existing)
│   ├── enums.py
│   ├── member.py
│   ├── attendance_session.py
│   └── ...
├── schemas/                     # Modularized Pydantic Schemas
│   ├── __init__.py              # Barrel file exporting all schemas for backwards-compatibility
│   ├── common.py                # Paginated[T], MessageOut, UUID helpers
│   ├── auth.py                  # LoginRequest, TokenResponse, MeOut
│   ├── members.py               # MemberListItem, MemberDetail, MemberSelfUpdate
│   ├── attendance.py            # AttendanceSessionCreate, AttendanceMatrixOut
│   ├── point_events.py          # PointEventOut, ClaimCreate, OfficerAdjustment
│   ├── tasks.py                 # TaskCreate, TaskUpdate, TaskOut
│   └── permissions.py           # PermissionGrantHistoryOut, MemberPermissionIn
├── repositories/                # NEW: Clean Database Access Layer
│   ├── base.py                  # Base repository with generic CRUD helpers
│   ├── member_repo.py           # SQL queries for members with scores/joins
│   ├── attendance_repo.py       # SQL matrix aggregation queries
│   └── point_event_repo.py      # Ledger queries & streak calculations
└── services/                    # Pure Domain Logic & Business Rules
    ├── attendance_service.py    # Late check-in logic, QR/PIN validation
    ├── ledger_service.py        # Point event approval, caps, streak tracking
    ├── member_service.py        # Onboarding, profile updates, score recalculation
    ├── import_service.py        # Google Forms CSV auto-mapping
    ├── telegram_notifier.py     # Microservice webhook / dispatch calls
    └── annual_reset_service.py  # Annual snapshotting & 50-pt buffer logic
```

### 3.2 Modularizing Schemas

#### Current Problem
`backend/app/schemas/__init__.py` has grown into a 427-line file containing over 35 distinct Pydantic models across all functional domains. Modifying an attendance schema requires touching the same file as auth and permissions.

#### Target Solution
Split `app/schemas/` into domain modules while maintaining `app/schemas/__init__.py` as a re-exporting barrel:

```python
# backend/app/schemas/common.py
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class Paginated(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int

class MessageOut(BaseModel):
    detail: str
```

```python
# backend/app/schemas/attendance.py
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

class AttendanceSessionCreateIn(BaseModel):
    task_id: UUID
    duration_minutes: int = Field(default=45, ge=5, le=360)
    title: str | None = Field(default=None, max_length=200)
    division_id: UUID | None = None
    is_club_wide: bool = False

class AttendanceMatrixKPI(BaseModel):
    total_sessions: int
    total_members: int
    average_turnout_rate: float
    on_time_rate: float
    total_checkins: int
    total_late_checkins: int
```

```python
# backend/app/schemas/__init__.py (Backwards-Compatible Barrel)
from app.schemas.common import MessageOut, Paginated
from app.schemas.attendance import AttendanceSessionCreateIn, AttendanceMatrixKPI, AttendanceMatrixOut
from app.schemas.auth import MeOut, TokenResponse
from app.schemas.members import MemberListItem, MemberDetail
# ... Re-export all schemas
```
*Result: Zero breaking changes in existing router imports.*

### 3.3 Introducing the Repository & Service Layer

#### Current Problem (Fat Routers)
In `backend/app/api/v1/routers/attendance.py`, the endpoint `get_attendance_matrix` contains:
- Role inspection logic (President vs. Division Head vs. Member)
- Privacy scoping rules (`WHERE Member.id == current_user.member.id`)
- Complex multi-table joins (`Member`, `AttendanceSession`, `PointEvent`)
- Matrix building in Python dictionaries
- Math for turnout and punctuality rates

#### Target Solution (Repository + Service + Router)

1. **`repositories/attendance_repo.py`**: Handles SQLAlchemy queries:
   ```python
   class AttendanceRepository:
       def __init__(self, db: AsyncSession):
           self.db = db

       async def get_sessions(self, division_id: UUID | None, is_club_wide: bool, start_date: datetime):
           ...
       async def get_checkin_events(self, session_ids: list[UUID], member_id: UUID | None = None):
           ...
   ```

2. **`services/attendance_service.py`**: Executes business rules:
   ```python
   class AttendanceService:
       def __init__(self, repo: AttendanceRepository):
           self.repo = repo

       async def build_attendance_matrix(self, user: UserContext, division_id: UUID | None, days: int) -> AttendanceMatrixOut:
           # 1. Enforce privacy & RBAC rules
           # 2. Query sessions & checkins from repo
           # 3. Compute 15-minute late arrival flags
           # 4. Return formatted AttendanceMatrixOut DTO
   ```

3. **`routers/attendance.py`**: Remains a clean, 15-line HTTP handler:
   ```python
   @router.get("/matrix", response_model=AttendanceMatrixOut)
   async def get_matrix(
       db: DbSession,
       user: RequireUser,
       division_id: UUID | None = None,
       days: int = 30,
   ):
       service = AttendanceService(AttendanceRepository(db))
       return await service.build_attendance_matrix(user, division_id, days)
   ```

---

## 4. Frontend Architecture & Restructuring Guide

### 4.1 Target Directory Layout (Domain / Feature Slices)

Adopt a **Feature-Colocated Architecture**. Group code by **business capability** rather than generic file type:

```text
frontend/
├── app/                         # Next.js App Router (Routing ONLY)
│   ├── layout.tsx               # Root layout & providers
│   ├── page.tsx                 # Landing redirect
│   ├── attendance/
│   │   └── page.tsx             # Thin page: imports <AttendanceFeature />
│   ├── admin/
│   │   └── page.tsx             # Thin page: imports <AdminDashboardFeature />
│   ├── leaderboard/
│   │   └── page.tsx             # Thin page: imports <LeaderboardFeature />
│   └── members/
│       ├── page.tsx             # Thin page: imports <MembersDirectoryFeature />
│       └── [id]/page.tsx        # Thin page: imports <MemberProfileFeature />
├── features/                    # NEW: Domain-Driven Feature Slices
│   ├── attendance/
│   │   ├── components/
│   │   │   ├── attendance-matrix-table.tsx
│   │   │   ├── attendance-kpis.tsx
│   │   │   ├── personal-timeline.tsx
│   │   │   ├── division-comparison-view.tsx
│   │   │   └── session-create-dialog.tsx
│   │   ├── hooks/
│   │   │   ├── use-attendance-matrix-query.ts
│   │   │   └── use-session-mutations.ts
│   │   ├── utils/
│   │   │   └── attendance-csv-export.ts
│   │   ├── types.ts             # Attendance specific UI interfaces
│   │   └── index.ts             # Public feature export
│   ├── members/
│   │   ├── components/
│   │   │   ├── members-table.tsx
│   │   │   ├── member-filters.tsx
│   │   │   └── laptop-sticker-dialog.tsx
│   │   ├── hooks/
│   │   │   └── use-members-query.ts
│   │   └── index.ts
│   ├── admin/
│   │   ├── components/
│   │   │   ├── task-catalog-manager.tsx
│   │   │   ├── inactivity-radar.tsx
│   │   │   ├── csv-import-wizard.tsx
│   │   │   └── platform-settings-tab.tsx
│   │   └── hooks/
│   │       └── use-admin-queries.ts
│   └── claims/
│       ├── components/
│       │   ├── claim-dialog.tsx
│       │   └── batch-adjustment-dialog.tsx
│       └── hooks/
│           └── use-claims-mutations.ts
├── components/                  # Shared & Primitives
│   ├── ui/                      # Shadcn / Radix Primitives (Button, Dialog, etc.)
│   ├── layout/                  # Shell components (Sidebar, TopNav, PageHeader)
│   ├── feedback/                # Skeletons, ErrorBanners, ToastProviders
│   └── data-display/            # Notion-style table primitives (NotionHeader, StatusChip)
├── hooks/                       # Shared utility hooks
│   ├── use-mobile.ts
│   ├── use-toast.ts
│   └── use-debounce.ts
└── lib/
    ├── api/                     # Base HTTP client & domain services
    │   ├── client.ts            # Fetch wrapper with interceptors
    │   └── types.ts             # Generated backend DTO types
    ├── utils.ts                 # cn() and string utilities
    └── permissions.ts           # Client-side permission helpers
```

### 4.2 Decomposing God Pages

#### Example: `frontend/app/attendance/page.tsx` (1,134 lines &rarr; 60 lines)
The page file should only manage route parameters and mount the feature:

```tsx
// frontend/app/attendance/page.tsx (Target)
"use client"

import Layout from "@/components/layout/layout"
import { PageHeader } from "@/components/layout/page-header"
import { CalendarCheck } from "lucide-react"
import { AttendanceFeature } from "@/features/attendance"

export default function AttendancePage() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Attendance Ledger"
          description="Track physical session check-ins, punctuality metrics, and member turnout."
          icon={CalendarCheck}
        />
        <AttendanceFeature />
      </div>
    </Layout>
  )
}
```

The internal subcomponents are cleanly separated within `features/attendance/`:
- `AttendanceKPIs`: Renders Total Sessions, Turnout %, On-Time %, Late Check-ins.
- `AttendanceMatrixTable`: Renders Notion-style sticky header, member rows, and badges.
- `DivisionComparisonView`: Renders side-by-side turnout comparison for executives.
- `PersonalTimeline`: Renders individual streak and verification log for regular members.

### 4.3 Modularizing React Query Hooks

#### Current Problem
`frontend/lib/hooks/use-queries.ts` (406 lines) contains hooks for `useDivisions`, `useApprovals`, `useApproveClaimsMutation`, `useLeaderboard`, `useMembers`, `useAttendanceMatrix`, `useAdminSettings`, etc. Any change invalidates cached imports and triggers broad recompilations.

#### Target Solution
Co-locate hooks with their features, or organize them by domain under `hooks/queries/`:

```
frontend/hooks/queries/
├── use-divisions-query.ts
├── use-members-query.ts
├── use-leaderboard-query.ts
├── use-attendance-query.ts
├── use-claims-query.ts
└── index.ts # Re-exports all hooks for backwards-compatibility
```

*Example: Modularized Attendance Query Hook:*
```typescript
// frontend/features/attendance/hooks/use-attendance-matrix-query.ts
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { attendanceService } from "@/lib/api/services/attendance"

export function useAttendanceMatrix(divisionId: string | null, days = 30) {
  return useQuery({
    queryKey: ["attendance-matrix", divisionId, days],
    queryFn: () => attendanceService.getMatrix({ division_id: divisionId ?? undefined, days }),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000, // 1 minute
  })
}
```

### 4.4 KokonutUI Template Renaming

The template files in `frontend/components/kokonutui/` should be renamed to represent their actual business context:

| Current File Name | Domain Purpose | Proposed Semantic Name |
|---|---|---|
| `components/kokonutui/list-01.tsx` | Top Performers Leaderboard Card | `components/dashboard/top-performers-card.tsx` |
| `components/kokonutui/list-02.tsx` | Recent Claim Activity Feed | `components/dashboard/recent-activity-feed.tsx` |
| `components/kokonutui/list-03.tsx` | Division Turnout / Health Radar | `components/dashboard/division-health-radar.tsx` |
| `components/kokonutui/profile-01.tsx` | Logged-in User Profile Summary Widget | `components/dashboard/user-profile-widget.tsx` |
| `components/kokonutui/content.tsx` | Dashboard Grid Layout Container | `components/dashboard/dashboard-content-grid.tsx` |
| `components/kokonutui/sidebar.tsx` | Platform Navigation Sidebar | `components/layout/sidebar.tsx` |
| `components/kokonutui/top-nav.tsx` | Platform Header & Search Bar | `components/layout/top-nav.tsx` |

### 4.5 Retiring & Deprecating Mock Data (`csec-data.ts`)

#### Current Problem
`frontend/lib/csec-data.ts` is a 930-line file with hardcoded mock members, tasks, and point events originally written before backend APIs existed. In some components, types are imported from `csec-data.ts` rather than `lib/api/types.ts`, creating type drift.

#### Target Solution
1. **Move Constants to Canonical Locations:**
   - Division names & roles &rarr; `lib/constants/divisions.ts` and `lib/constants/roles.ts`.
2. **Standardize on API DTOs:**
   - Replace all `import { Member } from "@/lib/csec-data"` with `import type { MemberDetail, MemberListItem } from "@/lib/api/types"`.
3. **Move Mock Data to Test Fixtures:**
   - Relocate remaining sample data to `frontend/__tests__/fixtures/mock-csec-data.ts`.
4. **Delete or Deprecate `csec-data.ts`:**
   - Add a `@deprecated` docstring or remove once all type references point to `lib/api/types.ts`.

---

## 5. Telegram Bot & Microservice Contract Boundary

The Telegram bot runs as an independent microservice (`telegram_bot/` on port 8001).

### Current State
`telegram_bot/app/models.py` duplicates database models (`Member`, `PointEvent`, `Task`, `Division`) from `backend/app/models/`. If backend migrations alter foreign keys or column types, bot models can drift.

### Recommended Architectural Alignment
1. **Microservice Isolation:**
   The Bot service should interact with the platform primarily via internal HTTP APIs rather than directly reading raw Postgres tables where possible:
   - `POST /api/v1/internal/telegram/verify-token`
   - `GET /api/v1/internal/members/{id}/telegram-summary`
2. **Shared Package or Pydantic Contracts:**
   If direct database access is preserved for performance:
   - Create a single shared schemas package or ensure bot models import definitions from shared Alembic-managed tables.
   - Maintain synchronized test suites verifying bot-to-database schema parity.

---

## 6. Step-by-Step Low-Risk Migration Roadmap

To maintain zero downtime and avoid breaking ongoing development, refactor incrementally in 4 non-breaking stages:

```
+---------------------------------------------------------------------------------------+
|                            PHASED REFACTORING ROADMAP                                 |
+---------------------------------------------------------------------------------------+
| STAGE 1: SCHEMA MODULARIZATION (Zero Frontend Impact)                                 |
| - Split backend/app/schemas/__init__.py into domain files.                            |
| - Re-export all schemas in backend/app/schemas/__init__.py.                           |
| - Run pytest test suite to confirm 100% test passing without router changes.          |
+---------------------------------------------------------------------------------------+
| STAGE 2: FRONTEND HOOK MODULARIZATION                                                 |
| - Create features/ or hooks/queries/ domain hooks.                                    |
| - Re-export all query hooks in frontend/lib/hooks/use-queries.ts (backwards compat).  |
| - Run tsc --noEmit to verify zero TypeScript errors.                                  |
+---------------------------------------------------------------------------------------+
| STAGE 3: FRONTEND FEATURE DECOMPOSITION ("God Pages")                                 |
| - Create features/attendance/components/ and extract subcomponents from page.tsx.    |
| - Create features/admin/components/ and extract CSV import & task managers.          |
| - Reduce app/attendance/page.tsx and app/admin/page.tsx to clean wrapper shells.     |
+---------------------------------------------------------------------------------------+
| STAGE 4: BACKEND SERVICE & REPOSITORY EXTRACTION                                      |
| - Extract attendance matrix query into repositories/attendance_repo.py.              |
| - Move late-arrival math and privacy scoping into services/attendance_service.py.     |
| - Simplify routers/attendance.py to delegate directly to AttendanceService.          |
+---------------------------------------------------------------------------------------+
```

---

## 7. Code Conventions & Maintainability Checklist

Before submitting PRs or finalizing refactoring tasks, verify adherence to the following standards:

### Frontend Checklist
- [ ] **Thin Page Rule:** `app/**/page.tsx` must not exceed **100 lines**. Business logic and tables belong in `features/` or `components/`.
- [ ] **Type Import Rule:** Always use `import type { ... } from "@/lib/api/types"` for network DTOs.
- [ ] **Zero Inline Mock Data:** Never hardcode fake records inside production components.
- [ ] **Descriptive Naming:** No files named `list-01.tsx` or `temp.tsx`. Every component must describe its business domain.
- [ ] **Co-located Utilities:** Helpers specific to a feature (e.g. attendance CSV exporter) should live in `features/<domain>/utils/`.

### Backend Checklist
- [ ] **Thin Router Rule:** Endpoints should not contain direct raw mathematical derivations or multi-step SQL queries. Delegate to `services/` or `repositories/`.
- [ ] **Domain Schemas:** New schemas must be placed in `schemas/<domain>.py` and re-exported in `schemas/__init__.py`.
- [ ] **Greenlet Safety:** Any mutation (`db.add()`, `db.flush()`) must explicitly await `db.refresh(model)` before returning or accessing relationship attributes.
- [ ] **Server-Side Privacy Scoping:** Endpoints returning sensitive records (attendance, contacts) must enforce SQL-level filtering (`WHERE Member.id == user.member.id` for members).
- [ ] **Test Parity:** Any refactored endpoint must have a corresponding Pytest test in `backend/tests/` passing with 100% success.
