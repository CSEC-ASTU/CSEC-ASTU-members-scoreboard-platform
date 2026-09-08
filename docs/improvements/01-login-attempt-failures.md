# 01 — Login attempt failures

**Source:** API contract §13 open question  
**Decision:** Add the lightweight log (docs leaned toward yes).

## Why

When a Google account's email is not in `members`, the callback rejects the login. Without a record, officers cannot tell whether a failed login was a missed CSV import or a typo'd Form email.

## Schema

```sql
CREATE TABLE login_attempt_failures (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  google_id VARCHAR(255),
  reason TEXT NOT NULL DEFAULT 'not_registered',
  user_agent TEXT,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Behavior

On `GET /auth/google/callback`, if no `members` row matches the email:

1. Insert a `login_attempt_failures` row
2. Redirect to `{FRONTEND_URL}/not-registered?email=...`
3. Do **not** create a member row

## Related

- Admin listing: [08-login-failures-admin-endpoint.md](08-login-failures-admin-endpoint.md)
