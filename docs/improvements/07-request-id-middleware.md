# 07 — Request ID middleware

**Source:** Operational hygiene  
**Decision:** Echo / assign `X-Request-ID` on every response.

## Why

Makes it easier to correlate frontend errors, Render logs, and Aiven logs during incidents.

## Behavior

- If the client sends `X-Request-ID`, it is echoed back
- Otherwise a new UUID hex is generated and returned
