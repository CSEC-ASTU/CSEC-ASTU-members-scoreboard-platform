# CSEC ASTU Member Management — Backend

FastAPI backend for Phase 1 of the CSEC ASTU member management platform.
Implements the API contract under `/api/v1` with Google OAuth cookie auth,
append-only points ledger, RBAC + delegated permissions, and annual reset.

## Quick start

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env with your DATABASE_URL and Google OAuth credentials

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for interactive OpenAPI (when `DEBUG=true`).

## Layout

```
app/
  api/v1/routers/   # endpoint handlers matching the API contract
  core/             # JWT, permission engine
  models/           # SQLAlchemy models
  schemas/          # Pydantic request/response models
  services/         # business logic (import, Drive, scores, reset)
alembic/            # migrations (Phase 1 schema + improvements)
```

## Auth cookies

| Cookie | Purpose |
|---|---|
| `csec_access` | Short-lived JWT (default 15m) |
| `csec_refresh` | Rotating opaque refresh token (hashed server-side) |

Both are `httpOnly`, `SameSite=Lax`. Set `COOKIE_SECURE=true` in production.

## Registration flow

1. Officer imports Form CSV → `POST /api/v1/admin/members/import`
2. Student signs in via `GET /api/v1/auth/google/login`
3. Callback claims the row (sets `google_id`) or rejects unmatched emails

## Improvements

See `../docs/improvements/` for additions beyond the original Phase 1 docs.

## Deploying (Render)

Database migrations run automatically when the app starts (`app/db_migrations.py`):
`alembic upgrade head`, then a check that every model table/column exists, with an
automatic repair for missing tables and nullable columns. No shell or database access
is needed. Check the result at `GET /api/v1/health` (`schema_ok`, `schema_revision`).
Set `RUN_MIGRATIONS_ON_STARTUP=false` to disable. `./start.sh` remains as an alternative
start command.
