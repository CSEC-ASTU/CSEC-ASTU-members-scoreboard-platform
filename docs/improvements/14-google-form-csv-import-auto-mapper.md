# 14 — Google Form CSV import auto-mapper & pre-flight wizard

**Source:** Google Form 14-question member recruitment exports  
**Decision:** Fuzzy header auto-mapper in backend import service + 11-card pre-flight wizard in frontend.

## Why

Club officers import new member rosters directly from Google Forms and Google Sheets exports. Headers often contain full question sentences, punctuation, and parentheses (e.g. `Upload a clear, front-facing selfie`, `Club Division (Secondary, if you have one)`). Without fuzzy normalization and pre-flight validation, slight header discrepancies led to import failures and missing critical data.

## Field Mapping Matrix

| Form Question | Database Field | Status | Normalization / Behavior |
|---|---|---|---|
| `Personal Email (use one you check regularly)` | `email` | **Required** | Canonicalized to lowercase; used for Google OAuth |
| `Full Name` | `full_name` | **Required** | Cleaned and validated non-empty |
| `Student ID` | `student_id` | **Required** | Preserves institutional IDs (`UGR/12345/14`) |
| `Phone Number (+251)` | `phone_number` | **Required** | Preserves contact digits |
| `Club Division (Primary)` | `division_id` | **Required** | Matched against active club divisions (case-insensitive) |
| `Department` | `department` | **Required** | Academic department / program |
| `Club Joining Year` | `joining_year` | **Required** | Validated integer year (e.g. 2024, 2025, 2026) |
| `Telegram Profile URL` | `telegram_username` | **Required** | Auto-strips `https://t.me/`, `@`, and query parameters |
| `Github Profile URL` | `github_url` | **Required** | Normalizes to `https://github.com/username` |
| `Upload a clear, front-facing selfie` | `profile_image_url` | **Required** | Stores Google Drive/cloud photo link |
| `Club Division (Secondary, if you have one)` | `secondary_division_id` | **Optional** | Validated division; blocked if identical to Primary |
| `University/Student Email` | *Excluded* | *Excluded* | Discarded to prevent OAuth account conflict |
| `Year of Study (in 2019)` | *Ignored* | *Ignored* | Safely skipped |

## Pre-Flight Wizard (`csv-import-wizard.tsx`)

- **11-Card Format Grid:** 10 emerald badges for mandatory columns, 1 purple badge for optional secondary division.
- **Client-Side Pre-Flight Table:** Parses and renders the first 10 rows before submission with live validation pills.
- **Dry-Run Mode:** Validates all mappings and foreign keys without writing records to the database.
- **Detailed Execution Breakdown:** Displays created count, updated existing count, unmatched divisions list, and row-by-row error reasons.
