# 05 — Decision reason on point events

**Source:** Implementation need for reject flow  
**Decision:** Add `point_events.decision_reason` instead of overwriting `reason`.

## Why

The contract requires a rejection `reason`, but `reason` on the ledger row is the original claim/officer note. Overwriting it would destroy audit history.

## Schema

```sql
ALTER TABLE point_events ADD COLUMN decision_reason TEXT;
```

(Included in the initial migration.)

## Behavior

- Approve → `decision_reason` cleared / left null
- Reject → `decision_reason` set from the request body
- Auto-approve → `decision_reason = "auto-approved (low-stakes claim)"`
- Original `reason` is never mutated after insert
