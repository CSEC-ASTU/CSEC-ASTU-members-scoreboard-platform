# 09 — Physical presence verification with rotating whiteboard session codes

**Source:** Addressing dorm attendance farming and proxy claiming  
**Decision:** Add `AttendanceSession` model, 6-digit rotating PIN generator, and database-level session locks.

## Why

Static task codes could be leaked to campus Telegram groups, enabling absentee members to claim session points from dorms. The system required short-lived, rotating codes written on physical club lab whiteboards that expire automatically and can be terminated on-demand by officers.

## Schema & Migration

Migration: `0003_attendance_sessions.py`

```sql
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE point_events ADD COLUMN attendance_session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX uq_point_events_member_session ON point_events(member_id, attendance_session_id) WHERE attendance_session_id IS NOT NULL;
```

## Behavior & API

- `POST /api/v1/attendance-sessions`: Officers generate a cryptographically random 6-digit numeric PIN (`secrets.randbelow`) with custom expiration (30m to 3h).
- `GET /api/v1/attendance-sessions/active`: Division Heads check active sessions for their division tasks.
- `POST /api/v1/attendance-sessions/{id}/end`: Immediate officer kill switch to stop code redemptions.
- `POST /api/v1/point-events/claim`: Validates code against active non-expired session, enforces `uq_point_events_member_session` (strict 1 claim per member per session), and auto-awards points immediately.
