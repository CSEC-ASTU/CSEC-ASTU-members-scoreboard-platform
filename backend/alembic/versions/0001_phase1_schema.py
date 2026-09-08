"""Phase 1 schema + backend improvements.

Revision ID: 0001_phase1
Revises:
Create Date: 2026-09-07
"""

from alembic import op

revision = "0001_phase1"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Full Phase 1 schema from docs, plus improvement tables/columns.
    op.execute(
        """
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE member_role AS ENUM ('member', 'division_head', 'vice_president', 'president');
CREATE TYPE point_event_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE point_event_type AS ENUM ('claim', 'manual_adjustment', 'yellow_warning', 'red_warning', 'layoff');
CREATE TYPE permission_scope_type AS ENUM ('club', 'division', 'task_category');
CREATE TYPE notification_type AS ENUM ('yellow_warning', 'red_warning', 'layoff', 'motivational', 'streak', 'admin_report');
CREATE TYPE notification_status AS ENUM ('sent', 'failed', 'skipped_no_chat_id');

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TABLE members (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id          VARCHAR(255),
  full_name          VARCHAR(255) NOT NULL,
  email              VARCHAR(255) NOT NULL UNIQUE,
  profile_image_url  TEXT,
  division_id        UUID REFERENCES divisions(id) ON DELETE SET NULL,
  role               member_role NOT NULL DEFAULT 'member',
  department         VARCHAR(150),
  joining_year       SMALLINT,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  onboarded_at       TIMESTAMPTZ,
  first_login_at     TIMESTAMPTZ,
  imported_by        UUID REFERENCES members(id) ON DELETE SET NULL,
  joined_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  telegram_username        VARCHAR(255),
  telegram_chat_id         VARCHAR(255),
  telegram_connect_token   VARCHAR(255),
  telegram_token_expires_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_members_google_id ON members(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_members_division_id ON members(division_id);
CREATE INDEX idx_members_role ON members(role);
CREATE INDEX idx_members_is_active ON members(is_active);
CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  division_id    UUID REFERENCES divisions(id) ON DELETE SET NULL,
  category       VARCHAR(100) NOT NULL,
  base_points    INTEGER NOT NULL,
  is_repeatable  BOOLEAN NOT NULL DEFAULT true,
  is_penalty     BOOLEAN NOT NULL DEFAULT false,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_division_id ON tasks(division_id);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_active ON tasks(active);
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE point_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  task_id        UUID REFERENCES tasks(id) ON DELETE SET NULL,
  event_type     point_event_type NOT NULL DEFAULT 'claim',
  points_delta   INTEGER NOT NULL,
  reason         TEXT NOT NULL,
  status         point_event_status NOT NULL DEFAULT 'pending',
  approved_by    UUID REFERENCES members(id) ON DELETE SET NULL,
  academic_year  SMALLINT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at     TIMESTAMPTZ,
  decision_reason TEXT
);
CREATE INDEX idx_point_events_member_year ON point_events(member_id, academic_year);
CREATE INDEX idx_point_events_status ON point_events(status);
CREATE INDEX idx_point_events_task_id ON point_events(task_id);
CREATE INDEX idx_point_events_event_type ON point_events(event_type);

CREATE TABLE annual_summaries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  academic_year  SMALLINT NOT NULL,
  final_score    INTEGER NOT NULL,
  final_rank     INTEGER NOT NULL,
  badges_earned  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, academic_year)
);
CREATE INDEX idx_annual_summaries_year ON annual_summaries(academic_year);

CREATE TABLE permissions (
  key          VARCHAR(100) PRIMARY KEY,
  description  TEXT NOT NULL,
  scope_type   permission_scope_type NOT NULL
);

CREATE TABLE member_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  permission_key  VARCHAR(100) NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  scope_value     VARCHAR(255),
  granted_by      UUID NOT NULL REFERENCES members(id) ON DELETE SET NULL,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_enabled      BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_no_self_grant CHECK (member_id <> granted_by),
  UNIQUE (member_id, permission_key, scope_value)
);
CREATE INDEX idx_member_permissions_member ON member_permissions(member_id, is_enabled);
CREATE INDEX idx_member_permissions_key ON member_permissions(permission_key);
CREATE TRIGGER trg_member_permissions_updated_at
  BEFORE UPDATE ON member_permissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE platform_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO platform_settings (key, value) VALUES
  ('score_cap', '2500'),
  ('initial_buffer', '50'),
  ('current_academic_year', to_jsonb(EXTRACT(YEAR FROM now())::int)),
  ('badge_tier_multipliers', '{"gold": 1.0, "platinum": 1.5}');

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

-- Improvement: unmatched login attempts (API contract §13)
CREATE TABLE login_attempt_failures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL,
  google_id   VARCHAR(255),
  reason      TEXT NOT NULL DEFAULT 'not_registered',
  user_agent  TEXT,
  ip_address  VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_failures_email ON login_attempt_failures(email);
CREATE INDEX idx_login_failures_created ON login_attempt_failures(created_at);

-- Improvement: permission grant/revoke history (API contract §11)
CREATE TABLE permission_grant_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_permission_id  UUID,
  member_id             UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  permission_key        VARCHAR(100) NOT NULL,
  scope_value           VARCHAR(255),
  action                VARCHAR(50) NOT NULL,
  actor_id              UUID NOT NULL REFERENCES members(id) ON DELETE SET NULL,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_perm_history_member ON permission_grant_history(member_id);

-- Improvement: rotatable refresh tokens stored hashed server-side
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token_hash  VARCHAR(128) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_member ON refresh_tokens(member_id);

CREATE VIEW member_scores AS
WITH current_year AS (
  SELECT (value #>> '{}')::int AS year FROM platform_settings WHERE key = 'current_academic_year'
),
cap AS (
  SELECT (value #>> '{}')::int AS score_cap FROM platform_settings WHERE key = 'score_cap'
),
buf AS (
  SELECT (value #>> '{}')::int AS initial_buffer FROM platform_settings WHERE key = 'initial_buffer'
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
  buf.initial_buffer + COALESCE(cy.cycle_score, 0) AS cycle_score,
  LEAST(buf.initial_buffer + COALESCE(cy.cycle_score, 0), cap.score_cap) AS display_score,
  COALESCE(cr.past_years_score, 0) + buf.initial_buffer + COALESCE(cy.cycle_score, 0) AS career_score
FROM members m
CROSS JOIN cap
CROSS JOIN buf
LEFT JOIN cycle cy ON cy.member_id = m.id
LEFT JOIN career cr ON cr.member_id = m.id
WHERE m.is_active = true AND m.google_id IS NOT NULL;

-- Seed permission catalog
INSERT INTO permissions (key, description, scope_type) VALUES
  ('approve_task', 'Approve or reject pending task claims', 'division'),
  ('manage_tasks', 'Create and update tasks in scope', 'division'),
  ('assign_permission', 'Grant permissions to other members (non-delegable via API for escalation keys)', 'division'),
  ('execute_layoff', 'Execute a layoff (president role-default only)', 'club'),
  ('override_approval', 'Override an approval decision', 'club'),
  ('import_members', 'Bulk-import members from CSV', 'club'),
  ('view_division_members', 'List members in a division', 'division'),
  ('cbd_head', 'CBD committee head capabilities', 'club'),
  ('social_media_manager', 'Social media division coordinator', 'task_category'),
  ('submit_claim', 'Submit a task claim', 'club'),
  ('view_own_score', 'View own scores and ledger', 'club'),
  ('update_own_profile', 'Update own profile fields', 'club'),
  ('manage_settings', 'Update platform settings', 'club'),
  ('manage_divisions', 'Create/update/delete divisions', 'club'),
  ('view_audit_log', 'View the president audit log', 'club'),
  ('run_annual_reset', 'Preview and execute the annual reset', 'club');
        """
    )


def downgrade() -> None:
    op.execute(
        """
DROP VIEW IF EXISTS member_scores;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS permission_grant_history;
DROP TABLE IF EXISTS login_attempt_failures;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS platform_settings;
DROP TABLE IF EXISTS member_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS annual_summaries;
DROP TABLE IF EXISTS point_events;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS divisions;
DROP TYPE IF EXISTS notification_status;
DROP TYPE IF EXISTS notification_type;
DROP TYPE IF EXISTS permission_scope_type;
DROP TYPE IF EXISTS point_event_type;
DROP TYPE IF EXISTS point_event_status;
DROP TYPE IF EXISTS member_role;
DROP FUNCTION IF EXISTS set_updated_at();
        """
    )
