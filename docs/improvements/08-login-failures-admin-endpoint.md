# 08 — Login failures admin endpoint

**Source:** Follow-on to improvement 01  
**Decision:** Expose a president/VP-readable listing.

## Endpoint

```
GET /api/v1/admin/login-failures?page=1&page_size=25
```

**Auth:** president or vice_president

## Response

Standard paginated shape with `email`, `google_id`, `reason`, `created_at`.

This was not in the original contract; it exists so improvement 01 is usable from the UI without raw SQL.
