# CSEC ASTU Platform — Required Pages

Companion to the main PRD. Lists every screen the app needs, organized by who sees it, so the existing "Financial Dashboard" template (v0.dev) can be adapted page-by-page instead of guessed at.

**Assumption to verify against the actual template:** a Financial Dashboard template typically ships a sidebar-nav + topbar shell, a main dashboard with stat cards + a chart, a data table page (transactions), and a detail/settings page. The mapping notes below assume that shape — swap in the real component names once you're looking at the template directly.

---

## 1. Public / Auth (no login required)

| Page | Route | Purpose | Template mapping |
|---|---|---|---|
| Login | `/login` | "Sign in with Google" button, club branding | Template's own auth/login screen, re-skinned |
| Onboarding | `/onboarding` | One-time, shown right after first login: capture `department` and `joining_year` (not provided by Google) | New — likely a simple form page, no direct template equivalent |

## 2. Member pages (every logged-in member)

| Page | Route | Purpose | Key data | Template mapping |
|---|---|---|---|---|
| Dashboard | `/dashboard` | Home screen: current `cycle_score`, rank, badge tier, recent activity | `cycle_score`, `career_score`, last 5 `point_events` | Template's main dashboard — stat cards → score/rank/tier, chart → score-over-time |
| My Profile | `/profile` | Edit name/department/profile picture; view `career_score` and badge history | `members` row, `annual_summaries` history | Template's account/settings page |
| Achievement Card | `/profile/achievement` | Shareable LinkedIn card | `career_score`, badges, joining year | New — a single styled card + "copy/share" action, not a template page |
| Leaderboard | `/leaderboard` | Club-wide ranking by `cycle_score`, with a division filter/tab | Sorted `cycle_score` (capped at `score_cap`) per division and club-wide | Template's data table page, reworked as a ranked list with tabs |
| Submit a Claim | `/claims/new` | Form to claim a task: pick task/category, submit — no evidence/proof field, since officers verify manually | `tasks` list scoped to member's division + club-wide tasks | New form page — template's "add transaction" form is the closest structural match |
| My History | `/claims` | List of the member's own `point_events` (claims + warnings), with status | All `point_events` for `member_id` | Template's transactions table, filtered to the logged-in member |

## 3. Officer pages (division_head / vice_president, permission-gated)

Same nav as member pages, plus:

| Page | Route | Purpose | Key data | Template mapping |
|---|---|---|---|---|
| Approvals Queue | `/officer/approvals` | Pending `point_events` in the officer's scope; bulk approve/reject | `point_events` where `status = pending`, scoped by division or club-wide per §12 | Template's transactions table + a bulk-action toolbar |
| Division Roster | `/officer/members` | List of members in-scope, each member's `cycle_score`/`career_score` | `members` filtered by `division_id` (or all, for VP) | Template's customer/account list page |
| Member Detail | `/officer/members/[id]` | One member's full ledger, warning history, and the manual-warning action | `point_events`, `annual_summaries` for that member | Template's transaction/account detail page |
| Task Management | `/officer/tasks` | CRUD on tasks/categories the officer can manage | `tasks` scoped by division/category | Template's item/catalog management page |
| Delegate Permissions | `/officer/delegate` | Grant/toggle `member_permissions` on or off within scope | `permissions`, `member_permissions` | New — a grant form + a list of grants with an on/off toggle per row |

## 4. President-only pages

| Page | Route | Purpose | Key data | Template mapping |
|---|---|---|---|---|
| Platform Settings | `/admin/settings` | `score_cap`, badge thresholds, initial buffer value | Platform config table | Template's app-settings page |
| Club-Wide Directory | `/admin/members` | All members, any division, filter by role/status; club-wide Layoff | `members` (unfiltered) | Same as Division Roster, unscoped |
| Audit Log | `/admin/audit` | Searchable feed of every `point_event`, permission grant, and layoff club-wide | `point_events`, `member_permissions`, layoff-tagged events | Template's transactions table with heavier filtering |
| Annual Reset | `/admin/annual-reset` | Preview + trigger the year-end archive (§4a); browse past `annual_summaries` | `annual_summaries` by year | New — no strong template equivalent, keep it simple (a confirm-and-run action + a history table) |

---

## Shared components (not full pages)

- **Pending-approvals badge** in the topbar/sidebar for officers — count of items in their Approvals Queue.
- **Bulk action bar** — "approve all" / "reject all with reason," used on both the Approvals Queue and any list view.
- **Tier badge** — small visual (Gold/Platinum/etc.) shown next to a member's name once `cycle_score` crosses `score_cap` (§4a); reused on Dashboard, Leaderboard, Profile, and Member Detail.

## Notes

- Telegram-related UI (connect button, username field) is Phase 2 (§1a of the PRD) — leave it out of the Phase 1 build, or show a disabled "Coming soon" state on the Profile page if that's less work than conditionally hiding it.
- Nothing here assumes new template pages beyond Onboarding, Achievement Card, Submit a Claim, Delegate Permissions, and Annual Reset — everything else is a re-skin of a page shape the Financial Dashboard template should already have.
