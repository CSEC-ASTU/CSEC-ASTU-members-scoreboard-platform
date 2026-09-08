# 02 — Permission grant history

**Source:** API contract §11 known limitation  
**Decision:** Add `permission_grant_history` in Phase 1 (cheap, high audit value).

## Why

`member_permissions` only stores current state (`is_enabled` + `updated_at`). The president audit log could not reconstruct who granted/revoked what over time.

## Schema

```sql
CREATE TABLE permission_grant_history (
  id UUID PRIMARY KEY,
  member_permission_id UUID,          -- may outlive a revoked row
  member_id UUID NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  scope_value VARCHAR(255),
  action VARCHAR(50) NOT NULL,         -- granted | enabled | disabled | revoked
  actor_id UUID NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Behavior

Every `POST` / `PATCH` / `DELETE` on `/member-permissions` appends a history row. History is never updated or deleted by the API.
