# Backend improvements log

This folder tracks changes made while implementing the Phase 1 FastAPI backend that go **beyond** (or refine) the original PRD / API contract / schema docs in `docs/`.

Each file describes one improvement: why it was added, what changed (schema / API / behavior), and how to use it.

| ID | Title | Status |
|---|---|---|
| [01](01-login-attempt-failures.md) | Log unmatched Google login attempts | shipped |
| [02](02-permission-grant-history.md) | Append-only permission grant history | shipped |
| [03](03-auto-approve-low-stakes-claims.md) | Auto-approve low-stakes claims | shipped |
| [04](04-refresh-token-store.md) | Server-side refresh token store + rotation | shipped |
| [05](05-decision-reason-column.md) | Separate rejection / decision reason on ledger | shipped |
| [06](06-configurable-initial-buffer-view.md) | `member_scores` view reads `initial_buffer` from settings | shipped |
| [07](07-request-id-middleware.md) | `X-Request-ID` tracing middleware | shipped |
| [08](08-login-failures-admin-endpoint.md) | Admin endpoint for login failures | shipped |

Phase 2 items (Telegram, public achievement cards) were **not** implemented, per the contract.
