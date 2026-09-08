-- ============================================================================
-- CSEC ASTU Member Management Platform — Database Schema (Phase 1)
-- PostgreSQL (Aiven free tier). Apply as the first Alembic migration.
-- Mirrors the PRD (csec-astu-member-management-platform.md) section by section.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

CREATE TYPE member_role AS ENUM ('member', 'division_head', 'vice_president', 'president');

CREATE TYPE point_event_status AS ENUM ('pending', 'approved', 'rejected');

-- 'claim' = a member-submitted task claim (routine points, §5)
-- 'manual_adjustment' = an officer logging a reward/penalty not tied to a claim flow
-- 'yellow_warning' / 'red_warning' / 'layoff' = the warning ladder (§6)
CREATE TYPE point_event_type AS ENUM ('claim', 'manual_adjustment', 'yellow_warning', 'red_warning', 'layoff');

CREATE TYPE permission_scope_type AS ENUM ('club', 'division', 'task_category');

-- Phase 2 (Telegram) — created now so the additive columns/table below are valid,
-- but nothing in Phase 1 writes to them. See PRD §11.
CREATE TYPE notification_type AS ENUM ('yellow_warning', 'red_warning', 'layoff', 'motivational', 'streak', 'admin_report');
CREATE TYPE notification_status AS ENUM ('sent', 'failed', 'skipped_no_chat_id');

-- ----------------------------------------------------------------------------
-- Trigger helper: keep `updated_at` current on every UPDATE
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- divisions
-- ----------------------------------------------------------------------------

CREATE TABLE divisions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_divisions_updated_at
  BEFORE UPDATE ON divisions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- members
-- cycle_score / career_score (§4a) are DERIVED — see the view at the bottom.
-- They are not stored columns; a member's true state is the point_events ledger.
-- ----------------------------------------------------------------------------

CREATE TABLE members (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id          VARCHAR(255),                   -- null until first login (see registration flow, §13)
  full_name          VARCHAR(255) NOT NULL,           -- from the CSV import; may be refreshed from Google's profile at claim time
  email              VARCHAR(255) NOT NULL UNIQUE,    -- the join key for claiming — always lowercased before insert/lookup
  profile_image_url  TEXT,                          -- Drive-resolved URL, §2
  division_id        UUID REFERENCES divisions(id) ON DELETE SET NULL,  -- from CSV import, or null if unmatched
  role               member_role NOT NULL DEFAULT 'member',
  department         VARCHAR(150),                  -- from CSV import
  joining_year       SMALLINT,                       -- from CSV import
  is_active          BOOLEAN NOT NULL DEFAULT true,  -- false = laid off (soft delete, §6) — NOT reused for claim status, see google_id
  onboarded_at       TIMESTAMPTZ,                    -- optional, only if a lightweight "confirm your info" step is added later
  first_login_at     TIMESTAMPTZ,                     -- null until the student's first OAuth login claims this row
  imported_by        UUID REFERENCES members(id) ON DELETE SET NULL,  -- the officer who ran the import that created this row
  joined_at          TIMESTAMPTZ NOT NULL DEFAULT now(),  -- when the row was created (import date), not when they first logged in
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Phase 2 (Telegram, §11) — additive, unused until Phase 2 ships
  telegram_username        VARCHAR(255),
  telegram_chat_id         VARCHAR(255),
  telegram_connect_token   VARCHAR(255),
  telegram_token_expires_at TIMESTAMPTZ
);

-- google_id must be unique once set, but many rows will have it NULL (imported, unclaimed) —
-- a plain UNIQUE constraint would only allow one NULL total, so this is a partial index instead.
CREATE UNIQUE INDEX idx_members_google_id ON members(google_id) WHERE google_id IS NOT NULL;

CREATE INDEX idx_members_division_id ON members(division_id);
CREATE INDEX idx_members_role ON members(role);
CREATE INDEX idx_members_is_active ON members(is_active);

CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- tasks
-- ----------------------------------------------------------------------------

CREATE TABLE tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  division_id    UUID REFERENCES divisions(id) ON DELETE SET NULL, -- null = club-wide task
  category       VARCHAR(100) NOT NULL,   -- e.g. attendance, cleaning_duty, event_organizing,
                                           -- bootcamp, external_activity, game_night,
                                           -- academic_lecture, social_media (§5)
  base_points    INTEGER NOT NULL,
  is_repeatable  BOOLEAN NOT NULL DEFAULT true,
  is_penalty     BOOLEAN NOT NULL DEFAULT false,  -- classification only — no longer feeds
                                                   -- an automatic escalation (§7 was dropped)
  active         BOOLEAN NOT NULL DEFAULT true,   -- deactivate instead of deleting; tasks are
                                                   -- referenced by historical point_events
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_division_id ON tasks(division_id);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_active ON tasks(active);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- point_events — the append-only ledger. Nothing is ever updated except
-- status/approved_by (the approve/reject transition) — points_delta, reason,
-- member_id, task_id are immutable once written.
-- ----------------------------------------------------------------------------

CREATE TABLE point_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  task_id        UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- null for warnings/layoffs/ad-hoc adjustments
  event_type     point_event_type NOT NULL DEFAULT 'claim',
  points_delta   INTEGER NOT NULL,
  reason         TEXT NOT NULL,
  status         point_event_status NOT NULL DEFAULT 'pending',
  approved_by    UUID REFERENCES members(id) ON DELETE SET NULL,
  academic_year  SMALLINT NOT NULL,   -- denormalized for fast cycle_score/leaderboard queries
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at     TIMESTAMPTZ          -- when it moved out of 'pending'
);

CREATE INDEX idx_point_events_member_year ON point_events(member_id, academic_year);
CREATE INDEX idx_point_events_status ON point_events(status);
CREATE INDEX idx_point_events_task_id ON point_events(task_id);
CREATE INDEX idx_point_events_event_type ON point_events(event_type);

-- ----------------------------------------------------------------------------
-- annual_summaries — one row per member per finished academic year (§4a)
-- ----------------------------------------------------------------------------

CREATE TABLE annual_summaries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  academic_year  SMALLINT NOT NULL,
  final_score    INTEGER NOT NULL,      -- pre-cap cycle_score at year-end, for the record
  final_rank     INTEGER NOT NULL,
  badges_earned  JSONB NOT NULL DEFAULT '[]'::jsonb,  -- e.g. ["gold"], ["platinum"]
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, academic_year)
);

CREATE INDEX idx_annual_summaries_year ON annual_summaries(academic_year);

-- ----------------------------------------------------------------------------
-- permissions — static catalog, managed via seed migration, not runtime API
-- ----------------------------------------------------------------------------

CREATE TABLE permissions (
  key          VARCHAR(100) PRIMARY KEY,   -- e.g. approve_task, manage_tasks, assign_permission,
                                            -- execute_layoff, override_approval, cbd_head,
                                            -- social_media_manager
  description  TEXT NOT NULL,
  scope_type   permission_scope_type NOT NULL
);

-- ----------------------------------------------------------------------------
-- member_permissions — delegated grants on top of role defaults (§12)
-- ----------------------------------------------------------------------------

CREATE TABLE member_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  permission_key  VARCHAR(100) NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  scope_value     VARCHAR(255),           -- a division_id or a task_category string; null = club-wide
  granted_by      UUID NOT NULL REFERENCES members(id) ON DELETE SET NULL,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_enabled      BOOLEAN NOT NULL DEFAULT true,  -- the on/off toggle (§12) — no expiry logic
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- No self-grants (§12 safeguard) — enforced at the DB level, not just in the API
  CONSTRAINT chk_no_self_grant CHECK (member_id <> granted_by),
  UNIQUE (member_id, permission_key, scope_value)
);

CREATE INDEX idx_member_permissions_member ON member_permissions(member_id, is_enabled);
CREATE INDEX idx_member_permissions_key ON member_permissions(permission_key);

CREATE TRIGGER trg_member_permissions_updated_at
  BEFORE UPDATE ON member_permissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- platform_settings — single-row-per-key config (§4a's score_cap, initial buffer, etc.)
-- ----------------------------------------------------------------------------

CREATE TABLE platform_settings (
  key         VARCHAR(100) PRIMARY KEY,   -- e.g. 'score_cap', 'initial_buffer', 'current_academic_year',
                                           -- 'badge_tier_multipliers'
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed the settings this PRD already made decisions on (§4, §4a):
INSERT INTO platform_settings (key, value) VALUES
  ('score_cap', '2500'),
  ('initial_buffer', '50'),
  ('current_academic_year', to_jsonb(EXTRACT(YEAR FROM now())::int)),
  ('badge_tier_multipliers', '{"gold": 1.0, "platinum": 1.5}');

-- ----------------------------------------------------------------------------
-- notifications — Phase 2 (Telegram, §11). Table created now so the schema
-- doesn't need a migration later, but nothing writes to it until Phase 2.
-- ----------------------------------------------------------------------------

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id         UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  related_event_id  UUID REFERENCES point_events(id) ON DELETE SET NULL,
  type              notification_type NOT NULL,
  message_text      TEXT NOT NULL,
  status            notification_status NOT NULL DEFAULT 'skipped_no_chat_id',
  sent_at           TIMESTAMPTZ
);

CREATE INDEX idx_notifications_member ON notifications(member_id);

-- ----------------------------------------------------------------------------
-- Derived scores — a VIEW, not stored columns. This is the single source of
-- truth for cycle_score / career_score / display_score (§4a) so the API
-- layer never has to keep a running total in sync by hand.
-- ----------------------------------------------------------------------------

CREATE VIEW member_scores AS
WITH current_year AS (
  SELECT (value #>> '{}')::int AS year FROM platform_settings WHERE key = 'current_academic_year'
),
cap AS (
  SELECT (value #>> '{}')::int AS score_cap FROM platform_settings WHERE key = 'score_cap'
),
cycle AS (
  SELECT member_id, COALESCE(SUM(points_delta), 0) AS cycle_score
  FROM point_events, current_year
  WHERE status = 'approved' AND academic_year = current_year.year
  GROUP BY member_id
),
career AS (
  SELECT member_id, COALESCE(SUM(final_score), 0) AS past_years_score
  FROM annual_summaries
  GROUP BY member_id
)
SELECT
  m.id AS member_id,
  m.division_id,
  50 + COALESCE(cy.cycle_score, 0) AS cycle_score,               -- +50 initial buffer, §4
  LEAST(50 + COALESCE(cy.cycle_score, 0), cap.score_cap) AS display_score,
  COALESCE(cr.past_years_score, 0) + 50 + COALESCE(cy.cycle_score, 0) AS career_score
FROM members m
CROSS JOIN cap
LEFT JOIN cycle cy ON cy.member_id = m.id
LEFT JOIN career cr ON cr.member_id = m.id
WHERE m.is_active = true AND m.google_id IS NOT NULL;  -- exclude laid-off members and not-yet-claimed imports

-- ============================================================================
-- End of Phase 1 schema. Phase 2 adds no new tables beyond `notifications`
-- and the `members.telegram_*` columns already present above (see PRD §11).
-- ============================================================================
