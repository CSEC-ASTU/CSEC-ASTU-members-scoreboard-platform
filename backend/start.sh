#!/usr/bin/env sh
# Production entrypoint (Render "Start Command": ./start.sh).
# Applies any pending database migrations before serving, so the schema always
# matches the deployed code (a missed manual `alembic upgrade head` previously
# left production without the `events` table -> 500s on the Events page).
set -e
cd "$(dirname "$0")"
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
