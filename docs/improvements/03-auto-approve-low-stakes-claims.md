# 03 — Auto-approve low-stakes claims

**Source:** PRD §12 "Keeping the officer workload light" item 2  
**Decision:** Implement with a configurable point threshold.

## Why

Routine attendance claims (+10) should not clog officer queues. The PRD explicitly calls this the biggest lever for reducing officer load.

## Config

```env
AUTO_APPROVE_CLAIM_MAX_POINTS=10
```

## Behavior

When a member submits a claim (`POST /point-events` claim shape):

- If `abs(task.base_points) <= AUTO_APPROVE_CLAIM_MAX_POINTS` **and** `task.is_penalty` is false → status starts as `approved`, `decided_at` is stamped, `decision_reason = "auto-approved (low-stakes claim)"`
- Otherwise → `pending` as specified in the contract

Penalty tasks and higher-point claims still require human approval.
