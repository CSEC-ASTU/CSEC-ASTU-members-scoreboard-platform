# CSEC ASTU Platform — API Contract (Phase 1)

Companion to the PRD and `csec-astu-database-schema.sql`. Base path: `/api/v1`. All request/response bodies are JSON unless noted. All endpoints except `/auth/google/*`, `/health`, and Phase 2's `/telegram/webhook` require the auth cookie (§2 of the PRD) — "Auth" below names the permission layered on top of "logged in."

**Conventions used throughout:**

- List endpoints support `?page=1&page_size=25` (defaults shown) and return `{ "items": [...], "total": N, "page": 1, "page_size": 25 }`.
- Every list endpoint that can be scoped by role is scoped server-side, not just filtered client-side — a division head calling `GET /point-events` never receives rows outside their division even without passing a filter.
- Timestamps are ISO 8601 UTC. IDs are UUIDs.
- `403` = authenticated but not permitted; `401` = not authenticated; `404` = not found or not permitted to know it exists (used interchangeably for scoped resources, to avoid leaking existence).
- "Officer" below means division_head, vice_president, or president, or anyone holding the relevant granted permission from `member_permissions` (§12) — the specific permission required is named per endpoint.

---

## 1. Auth

| Method & path               | Purpose                                                                                                                                                                                                                                                                                                                                                                                          | Auth                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `GET /auth/google/login`    | Redirects to Google's OAuth consent screen                                                                                                                                                                                                                                                                                                                                                       | none                   |
| `GET /auth/google/callback` | OAuth callback — looks up the Google account's email against `members.email` (never creates a new row). Unclaimed match (`google_id IS NULL`) → claims it: sets `google_id`, stamps `first_login_at`, issues cookies. Already-claimed match → normal login. No match at all → `403`, redirects to a "not registered" page instead of setting any cookie. See §13 for the full registration flow. | none                   |
| `POST /auth/refresh`        | Rotates the access-token cookie using the refresh-token cookie                                                                                                                                                                                                                                                                                                                                   | refresh cookie present |
| `POST /auth/logout`         | Clears both cookies server-side                                                                                                                                                                                                                                                                                                                                                                  | logged in              |
| `GET /auth/me`              | Returns the current member's profile, role, and effective permissions                                                                                                                                                                                                                                                                                                                            | logged in              |

**`GET /auth/me` response:**

```json
{
  "id": "uuid",
  "full_name": "string",
  "email": "string",
  "profile_image_url": "string|null",
  "division_id": "uuid|null",
  "role": "member|division_head|vice_president|president",
  "department": "string|null",
  "joining_year": 2024,
  "onboarded": true,
  "cycle_score": 340,
  "display_score": 340,
  "career_score": 890,
  "permissions": [
    "approve_task:division:<uuid>",
    "manage_tasks:division:<uuid>"
  ]
}
```

---

## 2. Members

| Method & path                        | Purpose                                                                                              | Auth                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `GET /members`                       | List members directory — filters: `division_id`, `role`, `is_active`, `search` (name/email). Non-officers receive masked sensitive fields (`phone_number`, `telegram_username`, `student_id` = `null`). Officers view full details. | logged in (HttpOnly cookie)                                     |
| `GET /members/{id}`                  | Get one member's full profile + scores. Sensitive contact info masked for non-officers unless viewing own profile.                                                                          | logged in (HttpOnly cookie)                                     |
| `PATCH /members/me`                  | Update own editable fields (e.g. fix a typo'd `department`)                                          | logged in                                                       |
| `POST /members/me/profile-picture`   | Upload profile picture (`multipart/form-data`) → stored on Drive, URL saved                          | logged in                                                       |
| `DELETE /members/me/profile-picture` | Remove profile picture                                                                               | logged in                                                       |
| `PATCH /members/{id}`                | Officer/president edits another member's `role`, `division_id`, or `department`                      | division head (own division) or president                       |
| `POST /admin/members/import`         | Bulk-import/upsert members from a CSV export of the registration Google Form — see §13               | officer with `import_members`, or president                     |
| `POST /members/{id}/layoff`          | Execute a layoff: sets `is_active = false`, logs a `-100` `layoff` point_event with the given reason | **president only** (§6)                                         |
| `GET /members/{id}/point-events`     | That member's full ledger                                                                            | self, an officer with visibility, or president                  |
| `GET /members/{id}/achievement-card` | Data to render the shareable card: `career_score`, badges, joining year, name, division              | self, or anyone if the member has made it public (see note)     |

**`POST /admin/members/import` — multipart, `file` = CSV; optional `?dry_run=true` to validate without writing:**

```json
{
  "created": 12,
  "updated": 3,
  "errors": [
    { "row": 9, "email": "", "issue": "missing required field: email" }
  ],
  "unmatched_divisions": [
    { "row": 7, "email": "someone@astu.edu.et", "division_name": "Robotics" }
  ]
}
```

Expected CSV columns: `full_name, email, department, joining_year, division`. Upsert is keyed on `email` (lowercased) — safe to re-run against a growing Form response sheet; existing rows get their `department`/`joining_year`/`division_id` refreshed, but `google_id`, `role`, `is_active`, and any score history are never touched by an import.

**`POST /members/{id}/layoff` request:**

```json
{ "reason": "string, required" }
```

**Note on achievement cards:** Phase 1 serves this only to the logged-in owner. A fully public, unauthenticated share link (e.g. `/public/achievement-card/{token}`) is a reasonable Phase 2 add-on but isn't specified yet — flag it if you want it in Phase 1 instead.

---

## 3. Divisions

| Method & path            | Purpose                                                     | Auth      |
| ------------------------ | ----------------------------------------------------------- | --------- |
| `GET /divisions`         | List all divisions                                          | logged in |
| `POST /divisions`        | Create a division                                           | president |
| `GET /divisions/{id}`    | Get one division                                            | logged in |
| `PATCH /divisions/{id}`  | Update name/description                                     | president |
| `DELETE /divisions/{id}` | Delete a division — `409` if any member still references it | president |

---

## 4. Leaderboard

| Method & path              | Purpose                                                                                       | Auth      |
| -------------------------- | --------------------------------------------------------------------------------------------- | --------- |
| `GET /leaderboard`         | Current-year ranking by `display_score`. Filters: `division_id` (omit for club-wide)          | logged in |
| `GET /leaderboard/history` | Past-year ranking from `annual_summaries`. Required: `academic_year`. Optional: `division_id` | logged in |

**`GET /leaderboard` response:**

```json
{
  "academic_year": 2026,
  "score_cap": 2500,
  "items": [
    {
      "rank": 1,
      "member_id": "uuid",
      "full_name": "string",
      "division_id": "uuid",
      "display_score": 2500,
      "career_score": 4200,
      "badge": "platinum"
    },
    {
      "rank": 2,
      "member_id": "uuid",
      "full_name": "string",
      "division_id": "uuid",
      "display_score": 1870,
      "career_score": 1870,
      "badge": null
    }
  ]
}
```

---

## 5. Tasks

| Method & path       | Purpose                                                                                                                                             | Auth                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `GET /tasks`        | List tasks — filters: `division_id`, `category`, `active`, `is_penalty`                                                                             | logged in                            |
| `POST /tasks`       | Create a task                                                                                                                                       | officer with `manage_tasks` in scope |
| `GET /tasks/{id}`   | Get one task                                                                                                                                        | logged in                            |
| `PATCH /tasks/{id}` | Update a task, including `active` (used instead of delete — tasks are referenced by historical point_events, so they're deactivated, never removed) | officer with `manage_tasks` in scope |

There is intentionally no `DELETE /tasks/{id}` — see above.

---

## 6. Point events (claims, rewards, warnings, ledger)

This is the one resource that covers four things from the PRD: a member's task claim (§5), an officer's manual reward/penalty (§7), a warning (§6), and — via its own dedicated endpoint above — a layoff. All but the layoff share this resource because they're all just rows in the same append-only ledger.

| Method & path                      | Purpose                                                                                            | Auth                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET /point-events`                | List ledger entries — filters: `member_id`, `status`, `event_type`, `division_id`, `academic_year` | scoped: member sees own; officer sees their scope; president sees all                                   |
| `POST /point-events`               | Create an entry — see the two shapes below                                                         | member (for `event_type: claim`) or officer with `approve_task`/warning authority (for everything else) |
| `GET /point-events/{id}`           | Get one entry                                                                                      | scoped as above                                                                                         |
| `PATCH /point-events/{id}/approve` | Approve a pending entry                                                                            | officer senior to the submitter, per §12's no-self/no-lateral rule                                      |
| `PATCH /point-events/{id}/reject`  | Reject a pending entry (`reason` required)                                                         | same as approve                                                                                         |
| `POST /point-events/bulk-approve`  | Approve many at once: `{ "event_ids": ["uuid", ...] }`                                             | same as approve                                                                                         |
| `POST /point-events/bulk-reject`   | Reject many at once: `{ "event_ids": ["uuid", ...], "reason": "string" }`                          | same as approve                                                                                         |

**`POST /point-events` — member submitting a claim:**

```json
{
  "task_id": "uuid",
  "reason": "string, optional — free text, e.g. which session"
}
```

`points_delta` is not sent by the member — it's copied from `tasks.base_points` server-side. `event_type` defaults to `claim`, `status` starts `pending`, `academic_year` is stamped from `platform_settings.current_academic_year`.

**`POST /point-events` — officer logging a warning or manual adjustment:**

```json
{
  "member_id": "uuid",
  "event_type": "yellow_warning | red_warning | manual_adjustment",
  "points_delta": -25,
  "reason": "string, required",
  "task_id": "uuid, optional"
}
```

Since §7's automatic multiplier was dropped, the officer sets `points_delta` directly — informed by, not locked to, the task's `base_points`. These are auto-approved on write (`status: approved`, `approved_by` = the officer), since an officer logging their own judgment call doesn't need a second approval step the way a member's claim does.

---

## 7. Permissions catalog

| Method & path            | Purpose                                  | Auth                 |
| ------------------------ | ---------------------------------------- | -------------------- |
| `GET /permissions`       | List every permission key in the catalog | officer or president |
| `GET /permissions/{key}` | Get one catalog entry                    | officer or president |

No `POST`/`PATCH`/`DELETE` — the catalog is seed data (see the schema file), not runtime-editable. Adding a genuinely new permission type is a migration, not an API call.

---

## 8. Member permission grants

| Method & path                     | Purpose                                                            | Auth                                                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /member-permissions`         | List grants — filters: `member_id`, `permission_key`, `is_enabled` | scoped to what the requester can grant/see; president sees all                                                                                                                                     |
| `POST /member-permissions`        | Grant a permission                                                 | officer, bound by §12's escalation safeguards (can't grant beyond own scope, can't grant `assign_permission` or `execute_layoff`, can't self-grant — all enforced server-side and at the DB level) |
| `PATCH /member-permissions/{id}`  | Toggle `is_enabled` on/off                                         | the original granter or anyone senior enough in that scope                                                                                                                                         |
| `DELETE /member-permissions/{id}` | Permanently remove a grant (vs. just toggling it off)              | same as above                                                                                                                                                                                      |

**`POST /member-permissions` request:**

```json
{
  "member_id": "uuid",
  "permission_key": "approve_task",
  "scope_value": "uuid-of-a-division, or a task_category string, or null for club-wide"
}
```

---

## 9. Annual summaries & reset

| Method & path                     | Purpose                                                                                                                                                  | Auth                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `GET /annual-summaries`           | List past-year results — filters: `member_id`, `academic_year`                                                                                           | logged in (own) or officer/president (any) |
| `GET /annual-summaries/{id}`      | Get one row                                                                                                                                              | same                                       |
| `GET /admin/annual-reset/preview` | Dry run: shows what the reset would produce without writing anything                                                                                     | president                                  |
| `POST /admin/annual-reset`        | Executes the reset: snapshots every active member's `cycle_score` into `annual_summaries`, then advances `platform_settings.current_academic_year` (§4a) | president                                  |

---

## 10. Platform settings

| Method & path     | Purpose                                                                                                  | Auth                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `GET /settings`   | Read current settings (`score_cap`, `initial_buffer`, `current_academic_year`, `badge_tier_multipliers`) | logged in — members can see the cap that applies to them |
| `PATCH /settings` | Update one or more settings                                                                              | president                                                |

---

## 11. Admin audit log

| Method & path          | Purpose                                                                                                                         | Auth      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `GET /admin/audit-log` | Combined, unscoped feed of `point_events` (all types, all members) — filters: `member_id`, `event_type`, `date_from`, `date_to` | president |

**Known limitation, flagged rather than hidden:** this surfaces the ledger and layoffs in full, but `member_permissions` only stores current state (`is_enabled` + `updated_at`), not a history of every toggle. If you want a true audit trail of every grant/revoke, that needs a separate `permission_grant_history` table — not in Phase 1 unless you want it added.

---

## 12. Misc

| Method & path | Purpose                                                                                 | Auth |
| ------------- | --------------------------------------------------------------------------------------- | ---- |
| `GET /health` | Basic liveness + DB connectivity check — also doubles as the Aiven keep-alive ping (§8) | none |

---

## 13. Registration flow — CSV import + login-only access

Since real registration happens through the club's Google Form, students never self-register on the platform. This is the full flow, in order:

1. An officer exports the Form's response sheet as CSV and calls `POST /admin/members/import` (§2). This creates `members` rows with `full_name`, `email`, `department`, `joining_year`, and `division_id` filled in, but `google_id` left `NULL` — the row exists, but nobody can log into it yet.
2. A student clicks "Sign in with Google" and goes through the normal OAuth flow (§1).
3. `GET /auth/google/callback` looks up the returned email against `members.email`:
   - **Match, `google_id IS NULL`** → this is the student's first login. Their account is _claimed_: `google_id` is set, `first_login_at` is stamped, cookies are issued, they land on the dashboard.
   - **Match, `google_id` already set** → ordinary login.
   - **No match** → rejected with `403`, redirected to a "you're not registered yet" page. Nothing is written to the database — no ghost accounts pile up from typos or people who aren't actually registered.
4. There's no self-serve onboarding step (no `POST /members/me/onboarding`) — the CSV already supplied everything that step used to collect. `PATCH /members/me` still exists for fixing a typo after the fact.

**Open question, worth deciding before you build it rather than after:** what should happen when a login is rejected in step 3 — should it just show an error, or should the platform quietly log the attempted email somewhere so an officer can see "these people tried to log in and weren't found" (usually a missed import or an email typo on the Form)? A rejection screen alone is simpler; a lightweight `login_attempt_failures` log adds real operational value at the cost of one more table. Your call — I'd lean toward adding it since it's cheap, but it's not load-bearing for Phase 1 either way.

## 14. Phase 2 — Telegram (do not build yet, see PRD §1a/§11)

Listed here only so the eventual contract is already anticipated and doesn't collide with Phase 1 routes.

| Method & path                | Purpose                                                                                                  | Auth                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `POST /members/me/telegram`  | Set/update `telegram_username`, generates a `telegram_connect_token`, returns the `t.me` deep link       | logged in                                          |
| `POST /telegram/webhook`     | Bot webhook receiver — verifies Telegram's secret token, completes the handshake, or routes bot commands | Telegram secret token (not the member auth cookie) |
| `GET /admin/telegram/report` | On-demand version of the missing-handshake digest job                                                    | president                                          |
