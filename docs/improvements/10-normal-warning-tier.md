# 10 — Normal warning disciplinary tier (-15 points)

**Source:** Officer feedback on warning escalation  
**Decision:** Add `normal_warning` to `PointEventType` and `NotificationType` enums.

## Why

Under the original bylaws design, only Yellow Warnings (-25 pts) and Red Warnings (-50 pts) existed. These warnings govern the loss-aversion ladder, buffer depletion, and termination triggers (when to counsel or discharge a member). Officers needed a standard, logged penalty for routine infractions (e.g. minor tardiness, missed equipment return) without prematurely degrading a member's buffer status to Yellow or Red.

## Schema & Migration

Migration: `0004_add_normal_warning.py`

```sql
ALTER TYPE point_event_type ADD VALUE IF NOT EXISTS 'normal_warning';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'normal_warning';
```

## Behavior & API

- `POST /api/v1/point-events/warning`: Officers can issue `warning_level: "normal"`, deducting standard `-15 pts` while logging the incident immutably to the ledger.
- `POST /api/v1/point-events/batch-officer`: Supports bulk issuance of normal warnings across filtered members.
- UI displays distinct orange warning badges (`WarningPill`, `EventTypePill`) while preserving the strict 3-stage critical ladder (Yellow/Red/Layoff) on member profile views.
