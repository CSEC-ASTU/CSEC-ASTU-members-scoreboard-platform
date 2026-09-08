# 04 — Server-side refresh token store

**Source:** Auth design refinement (not explicitly tabled in schema)  
**Decision:** Store hashed refresh tokens so logout can revoke them and rotation is real.

## Why

A pure JWT refresh token cannot be revoked server-side. Logout would only clear cookies on that browser; a stolen refresh cookie would still work until expiry.

## Schema

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  member_id UUID NOT NULL,
  token_hash VARCHAR(128) NOT NULL UNIQUE,  -- sha256 of opaque token
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Behavior

- `POST /auth/refresh` rotates: old row revoked, new raw token issued
- `POST /auth/logout` revokes the presented refresh token and all active tokens for that member
- Cookie still carries the opaque token; only the hash is stored
