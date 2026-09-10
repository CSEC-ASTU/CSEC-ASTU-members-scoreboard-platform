# 11 — Backend duplicate claim prevention engine

**Source:** Addressing spam submissions and concurrent claiming  
**Decision:** Enforce multi-layer claim validation directly in `create_claim` backend service.

## Why

Officers previously had to manually identify and reject duplicate submissions during queue review. If a member repeatedly clicked "Submit Claim" or submitted the same task across different tabs, redundant pending claims entered the queue, bloating officer workloads and risking duplicate point awards.

## Behavior & Enforcement

Implemented in `backend/app/services/point_events.py`:

1. **Pending Review Guard:**
   - If a member already has a pending claim (`status = PENDING`) for the same task, subsequent submissions are immediately rejected with `400 Bad Request: You already have a pending claim for this task`.
2. **Non-Repeatable Task Guard:**
   - For tasks configured with `is_repeatable = False`, if the member has an existing approved claim, subsequent submissions are rejected with `400 Bad Request: You have already completed this task`.
3. **Cooldown Window for Repeatable Tasks:**
   - For non-session repeatable tasks, duplicate claims submitted within a 24-hour window are blocked with `400 Bad Request: This task has a 24-hour cooldown period`.
4. **Session Attendance Lock:**
   - Tasks tied to `attendance_session_id` strictly verify that the member has not already claimed or been approved for that specific session code.
