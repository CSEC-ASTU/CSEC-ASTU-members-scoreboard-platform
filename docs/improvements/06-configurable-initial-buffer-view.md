# 06 — Configurable initial buffer in `member_scores`

**Source:** Schema hardcodes `50` in the view; settings seed has `initial_buffer`  
**Decision:** View reads buffer from `platform_settings`.

## Why

The PRD says the initial buffer is a platform setting tunable by the president. The draft view hard-coded `50`, so changing the setting would not affect scores.

## Change

```sql
-- was: 50 + COALESCE(cy.cycle_score, 0)
buf.initial_buffer + COALESCE(cy.cycle_score, 0)
```

API score helpers (`fetch_member_scores`) use the same setting key.
