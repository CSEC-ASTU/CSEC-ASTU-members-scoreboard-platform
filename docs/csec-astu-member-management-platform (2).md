# CSEC ASTU Member Management Platform — Architecture & Points System

## 1. Design goals

A proper backend + relational database is the foundation, chosen specifically to avoid the failure modes spreadsheet-style storage is prone to: overwritten rows, no schema enforcement, no unique IDs, and no audit history. The design keeps the parts of the original concept that worked (Google OAuth login, LinkedIn-shareable achievement card) and builds real data integrity underneath them from the start.

## 1a. Delivery phasing (tightened schedule)

Given the timeline, scope is split into two phases so the 3-dev team ships a working core first:

| Phase | Scope |
|---|---|
| **Phase 1 (MVP)** | Data model & ledger, points system (§5), score cap (§4a), warning ladder + escalation (§6–7), roles & permissions (§12), Next.js frontend, Google OAuth, profile picture upload |
| **Phase 2** | Telegram bot — warnings/motivation/admin-reporting (§11) |

Nothing in Phase 1 depends on Telegram existing — warnings and layoffs still get logged to `point_events`/`notifications` as usual, they just don't get pushed anywhere yet. This means §11 can be built later without touching the Phase 1 schema (the `notifications` table and `members` columns it adds are additive), and officers just check the web app directly for now instead of getting pinged.

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | FastAPI | Async, typed, easy to pair with Pydantic for strict request/response validation |
| Database | PostgreSQL (Aiven, free tier) — cloud-hosted, confirmed | Real transactions, constraints, and foreign keys for data integrity; of the standing free Postgres tiers (Aiven, Neon, Supabase) Aiven still gives the most storage/compute headroom for a club-scale dataset as of 2026, at the cost of the idle power-off noted in §8 |
| Image storage | Google Drive (via service account) — **profile pictures only** | Free tier, familiar to club officers, keeps binary blobs out of Postgres; scoping uploads to one field keeps storage footprint minimal |
| Frontend | Next.js | Matches current Linear.app-inspired UI direction, good with server components for the leaderboard |
| Auth | Google OAuth → backend-issued JWT in an httpOnly cookie | Keeps the existing login flow members already know; the JWT never touches JS, so it isn't readable/stealable via XSS |
| Migrations | Alembic | Standard for FastAPI/SQLAlchemy, keeps 3 devs' schema changes from clobbering each other |
| Config | `.env` (local), platform env vars (prod) | `.env.example` checked into the repo with dummy values; real secrets never committed |
| Backend host | Render | |
| Frontend host | Vercel | Matches Next.js natively (zero-config deploys, preview URLs per PR) |
| CI/CD | GitHub Actions | Lint + test on every PR; deploy triggers on merge to `main` |

**Auth flow, concretely:**
1. Member clicks "Sign in with Google" → standard OAuth redirect/callback.
2. Backend verifies the Google identity, upserts the `members` row, and issues a JWT (short-lived, e.g. 1 hour, plus a longer-lived refresh token).
3. Both are set as `httpOnly`, `Secure`, `SameSite=Lax` cookies — never exposed to frontend JS.
4. Every API request rides on the cookie automatically; the backend validates/refreshes as needed.
5. Logout clears both cookies server-side.

This keeps the frontend simple (no manual token handling in React state) and is the standard defense against XSS-based token theft.

**Image storage flow — profile pictures only:** the platform has exactly one image upload feature, the member's own profile picture. Frontend uploads → FastAPI validates (size/type) → backend pushes to a dedicated Drive folder via service account → Drive file ID + a resolved public/view URL stored on `members.profile_image_url` in Postgres (not the raw file). Task claims carry no evidence field at all — a member submits a claim for a task and an approving officer verifies it manually (attendance records, in-person knowledge of what happened) before approving or rejecting — so no other part of the app touches file storage at all.

## 3. Core data model (Postgres)

```
members
  id (uuid, pk), google_id (unique), full_name, email (unique),
  division_id (fk), role, department, joining_year, joined_at, is_active

divisions
  id (pk), name, description

tasks
  id (pk), title, description, division_id (fk, nullable),
  category, base_points, is_repeatable, active,
  is_penalty          -- bool, flags this task as a deduction type (feeds the escalation logic in §6)

point_events        -- append-only ledger — every change is attributable and timestamped
  id (pk), member_id (fk), task_id (fk, nullable), points_delta,
  reason, approved_by (fk), status (pending/approved/rejected),
  created_at

annual_summaries    -- one row per member per finished academic year (see §4a)
  id (pk), member_id (fk), academic_year, final_score, final_rank, badges_earned,
  created_at
```

**Score is derived, never stored/edited directly.** A member's score = sum of their `approved` `point_events.points_delta`. Nothing is ever silently overwritten; every change is traceable to who submitted it, who approved it, and why.

## 4. Baseline & chunk size

- **Initial buffer:** every member starts at **+50 points**, not 0. This is the "something to lose" — loss aversion (Kahneman/Tversky) means losing points already held is felt roughly 2x as strongly as gaining the same amount from nothing.
- **Chunk size:** the whole catalog is scaled up (~5x versus the first draft) so numbers feel weighty. Ratios between tasks stay the same — only the magnitude changes.

## 4a. Score cap, annual reset & career score

Three decisions here are linked, so they're specified together.

**Two score fields, not one:**

```
members
  ...
  cycle_score      -- derived: sum of approved point_events in the CURRENT academic year only. This is what's ranked and capped.
  career_score      -- derived: sum of all completed years' final cycle_scores + the current cycle_score. Never capped, never resets.
```

**Score cap — recommended starting value: 2,500 points/year**, applied to `cycle_score` only:

```
display_score = min(cycle_score, score_cap)   -- score_cap is a platform setting, tunable by the president, not hardcoded
```

Reasoning for 2,500: walking the point tables in §5 for a realistically very-active member across a full year (weekly attendance, a few lead-organizer slots, regular Game Nights, some bootcamp lectures) lands in the 2,000–3,500 range depending on how many categories they touch — so 2,500 sits high enough that only genuine all-around top contributors reach it, not just someone who shows up to everything. Treat it as a starting number to revisit after one real cycle of data (kept as an open item below).

`career_score` is never capped — it's what the LinkedIn achievement card and a member's personal profile show, so multi-year contribution keeps being something to be proud of even after a given year's leaderboard number tops out. Once `cycle_score` crosses `score_cap`, switch that member's card to a tier badge (Gold at 1x, Platinum at 1.5x, etc.) instead of just parking them at the top of the board — hitting the ceiling reads as "graduated a level," not "stopped mattering."

**Annual reset (also solves the DB-growth concern):**

At the start of each academic year:
1. For every active member, snapshot the outgoing cycle into `annual_summaries (member_id, academic_year, final_score, final_rank, badges_earned)` — this is the "lightweight annual export" already noted in §8, now given a concrete shape.
2. `point_events` older than the just-closed year are archived out of the live table (exported to cold storage/a flat file, then deleted from Postgres) — this is what actually keeps the Aiven free-tier storage cap from becoming a problem long-term, since the live ledger only ever holds the current + immediately-prior year.
3. Every active member's new-year `cycle_score` starts from the same **+50 buffer** as §4 — a fresh start each year, same loss-aversion logic.
4. `career_score` is unaffected by the archive — it's a running total that already folded each finished year's `final_score` into itself at step 1, so it doesn't need the raw old `point_events` to still be present.

Division-specific leaderboards: **in scope** — the same `cycle_score` query, filtered by `division_id`, gives each division head their own division's board alongside the club-wide one. No schema change needed beyond what's already in §3 (`members.division_id`).

## 5. Points system — by task category (rescaled)

### 5.1 Division session attendance
| Event | Points |
|---|---|
| Attend a scheduled session | +10 |
| Late (>15 min) | +5 |
| No-show, no notice | −15 |
| No-show, advance notice | 0 |

### 5.2 Weekly lab cleaning duty (10 people/week)
| Event | Points |
|---|---|
| Completed duty (confirmed) | +15 |
| Missed, no swap arranged | −25 |
| Swap arranged in advance | 0 original / +15 covering member |

### 5.3 Event organizing (seminars)
| Role | Points |
|---|---|
| Lead organizer, club-wide (VP-assigned) | +125 |
| Lead organizer, division-wide | +75 |
| Co-organizer / support role | +40–60 |
| Assigned, failed to deliver | −50 |

### 5.4 Internal bootcamps
| Activity | Points |
|---|---|
| Delivering a lecture | +75 |
| Preparing material (no delivery) | +40 |
| Attending a session | +10 |
| Completing an assigned task/exercise | +20 |
| Missed submission deadline | −20 |
| Registered, no-show | −15 |

### 5.5 External member activity
| Activity | Points |
|---|---|
| Organizing/representing at an external bootcamp | +75–100 (tier by scale) |
| Member-acceptance / recruitment task | +40 |
| Assigned external task not completed | −40 |

### 5.6 Game Night (every 2 weeks)
| Activity | Points |
|---|---|
| Attendance | +25 |
| 3 consecutive Game Nights (streak bonus) | +25 bonus |
| Organizing | +60 |
| Signed up, no-show | −25 |

### 5.7 External academic lecture support (CBD-assigned)
| Activity | Points |
|---|---|
| Delivering the lecture | +75 |
| Preparing/recording a lecture video | +60 |
| Assigned, not delivered | −50 |

### 5.8 Social media division
| Activity | Points |
|---|---|
| Content piece (post/caption/copy) | +20 |
| Graphic/design asset | +25 |
| Video edit | +40 |
| Weekly management duty, confirmed | +15 |
| Missed scheduled post/deadline | −20 |

## 6. Warning ladder (loss-aversion track)

Separate from routine task points — this applies when a member's *pattern* of behavior (not a single task) becomes a concern.

| Stage | Trigger | Points | Effect |
|---|---|---|---|
| Yellow warning | First serious lapse, or an accumulated pattern (e.g. 2+ missed duties) | −25 | Buffer drops to 25 (half gone). Logged with required reason + approver. |
| Red warning | Continued lapse after yellow, or one severe violation | −50 | Buffer hits 0 or negative. Framed as "last chance." |
| Layoff | Continued failure after red | Member removed from the club's active roster (`members.is_active = false`, soft delete) + symbolic −100 ledger entry | **Executed solely by the president.** The decision itself is made in an in-person officer meeting (outside the system), but only the president's account can carry it out — a single point of accountability instead of a second in-app confirmation step. Logged with a mandatory reason and timestamp for the audit trail. Never auto-triggered purely by a number crossing a threshold. |

## 7. Penalty severity — officer discretion, not automated escalation

No computed strike count, no multiplier table. The officer logging a penalty already knows the member's recent history from having approved/rejected their past claims — so they simply choose how severe a given penalty should be, informed by the task's suggested points in §5 but not locked to that exact number. A repeat offender's 3rd penalty can be entered heavier than their 1st because the officer decided it should be, not because a formula computed it.

This drops the need to walk a member's entire ledger history on every new penalty, and removes a mechanism (decay windows, reward-offset math, a capped multiplier) that was solving a fairness problem manual judgment already handles fine at this scale. `is_penalty` on `tasks` stays — it's still useful for classification and reporting — it just doesn't feed an automatic multiplier anymore.

## 8. Data-integrity principles baked into the design

- **Append-only ledger, real transactions** — no last-write-wins overwrites; a failed batch rolls back fully instead of partially applying.
- **Schema validation** — Pydantic models on the API layer plus Postgres column types/constraints.
- **No direct DB access for members** — all writes go through the API and, where relevant, an approval step.
- **Full audit trail** — every point change is a timestamped, attributed row.
- **Unique identity constraints** — `google_id`/`email` uniqueness prevents duplicate/mismatched member records.
- **Scheduled backups** — Aiven's managed Postgres includes automated backups on its free tier.
- **Idle-power-off awareness** — Aiven's free tier auto-powers-off after a period of inactivity (with an email warning first) and needs a manual restart from the console. Worth a lightweight keep-alive ping (e.g. a scheduled health-check hitting the DB every few days) or just building the habit of checking for that email, so the platform isn't unexpectedly down when someone opens it.

## 9. Note on regular vs. rotating task assignment

Recommended hybrid: a rotating pool per skill area (lecturers, organizers, editors) rather than either fully random assignment or one fixed person — qualify members into a pool using their own scoreboard history (e.g. "2+ lectures delivered, no missed deadlines"), cap consecutive assignments per person, and keep a trial slot on lower-stakes tasks for members outside the pool to grow into it.

## 10. Open items

- Confirm/adjust point values once run past division heads.
- Revisit the `score_cap` starting value (§4a: 2,500) after one real annual cycle of data.

**Tracked as separate documents (not in this PRD):**
- API contract (endpoints, request/response shapes)
- Repo ownership split across the 3 devs
- Required-pages spec for adapting the existing UI template (see companion doc)

## 11. Telegram bot — warnings, motivation, and admin reporting *(Phase 2 — deferred, see §1a)*

### Why a raw "telegram_username" field isn't enough

Telegram's Bot API can't push a message to someone just because you know their `@username` — for privacy reasons, a bot can only message a user after that user has started a conversation with it (this gives the bot a `chat_id`). So the design needs a short handshake, not just a text field.

### Data model additions

```
members  (add columns)
  telegram_username        -- what the member types into the web app, editable anytime
  telegram_chat_id         -- nullable; only filled once the handshake below completes
  telegram_connect_token   -- one-time token, nullable, cleared once used
  telegram_token_expires_at

notifications            -- audit log for sent messages, same append-only philosophy as point_events
  id (pk)
  member_id (fk)
  related_event_id (fk -> point_events, nullable)   -- links a warning/reward message to the ledger entry that triggered it
  type          -- yellow_warning / red_warning / layoff / motivational / streak / admin_report
  message_text
  status        -- sent / failed / skipped_no_chat_id
  sent_at
```

### Connection flow (the handshake)

1. Member enters/updates their `@username` on the web app (FastAPI endpoint, editable anytime, as you asked).
2. Web app generates a one-time `telegram_connect_token` and shows a **"Connect Telegram"** button linking to `https://t.me/<your_bot>?start=<token>`.
3. Member taps it, which opens a chat with the bot and auto-sends `/start <token>`.
4. Bot's webhook receives the `/start` command, looks up the token, resolves the member, and stores the resulting `chat_id` against their record. Token is cleared.
5. From this point, the backend can push messages to that member reliably via `chat_id` — the `username` field becomes mostly a display/lookup convenience, not what's actually used to send.

### What triggers a message

Hook into the same `point_events` writes you already have — no separate trigger system needed:

| Event | Message type | Example tone |
|---|---|---|
| Yellow warning logged | Warning | Direct, factual, states the reason and what's next if it continues |
| Red warning logged | Warning | Firmer, explicit "last chance before role reassignment" |
| Layoff confirmed | Warning | Neutral, clear, avoids shaming language |
| Reward event above a threshold (e.g. lecture delivered, event led) | Motivational | Congratulatory, specific about what they did |
| Streak bonus (e.g. 3 Game Nights) | Motivational | Reinforces the streak, encourages continuing it |
| Strike count resets (from §7's recovery path) | Motivational | "Clean slate" framing — this one matters for morale, don't skip it |

Keep warning messages factual rather than harsh — the goal is course-correction, not shame; overly punitive bot messages tend to make people disengage from the *system*, not just the missed task.

### Admin reporting when a username is missing or unverified

A scheduled job (daily, or on-demand from an admin dashboard button) checks for members who:
- Have no `telegram_username` set at all, **or**
- Have a `telegram_username` but never completed the handshake (`telegram_chat_id` is still null), **or**
- Had a message attempt fail (e.g. bot blocked by user, chat not found)

...and sends a single digest message to the **admin's** `chat_id` (admin goes through the same handshake once, stored separately — e.g. an `is_admin` flag on `members`, or a dedicated `admin_chat_ids` config) listing affected members by name/division, so officers can follow up manually rather than a warning silently going nowhere.

## 12. Roles & permissions

### RBAC vs. permission-based: use both, not one or the other

Pure role-based (4 fixed roles) breaks down the moment a new committee position shows up — CBD head, social media manager, bootcamp lecturer, cleaning-duty coordinator are all things you've already mentioned, and none of them map cleanly onto member/division-head/VP/president. Making each of those a new "role" leads to role sprawl and messy overlap (a division head who's *also* the social media manager needs two roles at once).

Pure permission-based (no roles at all) is more flexible but means every new member has to be manually granted a pile of individual permissions from scratch — too much setup overhead for a club with regular member turnover.

**Recommended hybrid:** 4 hierarchy **roles** give a sensible default permission set out of the box; fine-grained **permissions** layer on top for specific jobs, and can be granted to *any* member regardless of role. This is the same pattern most real systems use (GitHub org roles + repo-level permissions, Discord roles + channel overrides) for exactly this reason.

```
members
  ...
  role              -- enum: member / division_head / vice_president / president (4, as you proposed)

permissions               -- catalog of fine-grained capabilities
  key                       -- e.g. approve_task, manage_tasks, cbd_head, social_media_manager, assign_permission
  description
  scope_type                -- club / division / task_category — defines what a grant can be limited to

member_permissions         -- delegated grants, on top of role defaults
  member_id (fk)
  permission_key (fk)
  scope_value                -- e.g. a specific division_id or task_category, null = club-wide
  granted_by (fk -> members)
  granted_at
  is_enabled (boolean, default true)   -- simple on/off toggle; the granter (or anyone senior enough) flips this off when the job ends, no date logic involved
  updated_at                            -- when is_enabled was last flipped, for the audit trail
```

**Default permission set per role** (baseline, before any delegation):
- **member** — submit task claims, view own score/history, update own profile (incl. Telegram username)
- **division_head** — + approve/reject task claims *for their division*, manage their division's task list, grant a limited set of permissions *within their division* (e.g. make someone the cleaning-duty coordinator)
- **vice_president** — + approve club-wide event tasks, grant club-wide permissions for event-related jobs, approve the president's own task claims
- **president** — + everything, plus the two things that should stay human-gated no matter what: **executing a layoff** (decided in-person with other officers first, but carried out solely by the president — see §6) and overriding an approval

A "promotion" like CBD head or social media manager, then, is just a `member_permissions` grant — not a new role, not a code change, and it can be scoped (e.g. `social_media_manager` scoped to `task_category = social_media`) so someone gets exactly the access their job needs and nothing more.

### Safeguards against self-dealing

A few rules close specific loopholes this design would otherwise leave open (full detail and schema in the PRD's §4a):

- **No self-approval, and no lateral rubber-stamping.** An approver must be strictly senior to the submitter in the governance chain, never a peer, and never the submitter themselves — enforced at the database level, not just hidden in the UI. At the very top, where there's no one senior left, the president and vice president approve *each other's* claims.
- **Delegation can't escalate past its granter.** A division head can only grant permissions scoped to their own division, never club-wide. The permission to grant permissions in the first place (`assign_permission`) and the permission to confirm a layoff stay role-default only — they're never delegable, so a chain of grants can never hand out grant-making power itself.
- **No self-grants.** Nobody can grant themselves a permission — blocked at the database level.
- **Layoffs are president-only.** The decision is made in person, in an officer meeting — the system doesn't model that discussion — but only the president's account can execute it. This gives a single point of accountability rather than a second in-app confirmation, which fits how the club actually makes this call. The mandatory reason field on every layoff is what keeps it traceable after the fact.

### Keeping the officer workload light

This is the part most systems get wrong — they hand someone a title and then bury them in approval requests. A few things to build in deliberately:

1. **Delegate the queue, not just the credit.** A division head doesn't have to personally approve every cleaning-duty photo — they grant `approve_task` scoped to `task_category = cleaning_duty` to whoever's coordinating that rotation. The division head's queue shrinks to only what they've chosen to keep.
2. **Auto-approve low-stakes, low-point claims.** Routine attendance (e.g. a check-in, no file involved) doesn't need a human in the loop — reserve manual approval for higher-point or flagged claims. This is the single biggest lever for reducing officer load.
3. **Push, don't make them pull.** Use the Telegram bot (§11) to send officers a daily/weekly digest of *pending approvals in their scope* — so they act from a notification instead of remembering to check the web app.
4. **Bulk actions in the UI.** "Approve all" / "reject all with reason" for a batch (e.g. this week's cleaning duty submissions) instead of one-by-one.
5. **Grants are a toggle, not a form to fill out again later.** `is_enabled` on `member_permissions` (§12) means covering someone's job, or handing off a rotation, is one flip on and one flip off — no expiry dates to configure, no background job to run. If someone's out for two weeks, whoever holds the relevant permission just enables it for a stand-in and disables it when they're back; the same mechanism handles both a semester-long coordinator role and a short-term cover, so there's no separate "temporary delegation" feature to build.

The president/VP/division-head layer should mostly be doing three things: occasional bulk approvals in their own scope, delegating jobs out via permission grants, and the handful of decisions that should always stay human (layoffs, disputes, overrides) — not routine day-to-day point approval.
