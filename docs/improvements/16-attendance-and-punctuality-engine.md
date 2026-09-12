# Improvement 16 — Attendance & Punctuality Engine with Automated 15-Minute Late Detection

## Status
Shipped (Phase 3)

## Motivation
Previously, attendance tracking only recorded binary presence (`present` vs. `absent`). In a high-tempo university technical club, punctuality is critical for labs, workshops, and project standups. Furthermore, club-wide assemblies (orientation, general elections, hackathons) were difficult to run under the division-restricted attendance model, and members had no view into their individual attendance consistency or streaks.

## What Changed

### 1. Automated 15-Minute Late Arrival Detection
- When an attendance session code is verified by a member, the system compares the claim submission timestamp against the session's creation time (`AttendanceSession.created_at`).
- If `claim_time - created_at > 15 minutes`, the check-in is automatically flagged as **Late** (`is_late = True`).
- Submissions within the 15-minute threshold are recorded as **On-Time** (`is_late = False`).

### 2. Club-Wide General Meeting Sessions
- Added support for `division_id = null` on `AttendanceSession` to represent club-wide events open to all active members across all 7 divisions.
- Division Heads are restricted to their own division, whereas Executive Officers (President and Vice President) can create both division-specific and club-wide sessions.

### 3. Custom Session Titles
- Added `title` field to `AttendanceSession` (e.g. *"Week 4: Reverse Engineering ELF Binaries"* or *"General Assembly: Semester Kickoff"*).
- Displays prominently in member claim dialogs, attendance matrices, and timeline logs.

### 4. Smart Access Control & Member Privacy Scoping
- **Executive View:** Cross-division turnout comparison and full matrix oversight.
- **Division Head View:** Scoped to their division's members with selector locks preventing unauthorized queries.
- **Member Personal Timeline:** Regular members are strictly isolated to their own attendance timeline (`/attendance` renders streak stats, on-time percentage, and chronological meeting history). Backend queries are scoped at the database level (`WHERE Member.id == current_user.member.id`).

### 5. Punctuality & Streak Analytics
- The attendance matrix API (`GET /api/v1/attendance-sessions/matrix`) returns:
  - `overall_attendance_rate`: Percentage of total sessions attended.
  - `on_time_rate`: Percentage of attended sessions where the member arrived on time.
  - `total_late`: Exact count of tardy check-ins.
  - `current_streak`: Consecutive sessions attended without absence.
