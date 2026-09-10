# 13 — Officer productivity suite: batch actions, inactivity radar & CSV export

**Source:** Reducing officer operational load & faculty reporting bottlenecks  
**Decision:** Implement batch operations endpoint, visual Inactivity Radar triage, and RFC 4180 CSV export engine with UTF-8 BOM.

## Why

1. **Mass Actions:** Officers frequently needed to grant attendance points to 30+ students or issue warnings to an entire cohort. Performing one-by-one adjustments was unsustainable.
2. **Loss-Aversion Monitoring:** Officers needed to identify students at risk of dismissal (`cycle_score <= 0`) before the end of the academic quarter.
3. **Faculty Compliance:** University faculty and club advisors require physical CSV and Excel rosters for formal university record keeping.

## Implementation Details

### 1. Batch Adjustments API & Dialog
- `POST /api/v1/point-events/batch-officer`: Accepts `member_ids: list[UUID]`, uniform `points` delta, `event_type`, and `reason`. Executes safely within a database transaction and returns per-member statuses.
- `batch-adjustment-dialog.tsx`: Features live text search, division filtering, "Select All Filtered", and custom point or warning presets (-15 pts, -25 pts, -50 pts).

### 2. Inactivity Radar & Warning Ladder Triage
- `inactivity-radar.tsx`: Real-time triage classifying members into risk zones:
  - **Critical (Red Zone):** `cycle_score <= 0` (dismissal trigger).
  - **Warning (Yellow Zone):** `1 - 25 pts` (probationary / at-risk threshold).
  - **In Good Standing:** `> 25 pts` (compliant).
- Direct 1-click action buttons on member cards to issue warnings or grant points.

### 3. One-Click RFC 4180 CSV Export with UTF-8 BOM
- `csv-export.ts`: Encodes data in RFC 4180 standard with prepended UTF-8 BOM (`\uFEFF`) so Microsoft Excel and Google Sheets open files without garbled Amharic or accented characters.
- Available on: Members Directory, Leaderboard, Approvals Queue, and Admin Audit Log.
