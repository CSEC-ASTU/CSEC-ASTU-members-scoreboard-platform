# 12 — Member contact fields & personal email OAuth authentication

**Source:** Google Form import requirements & Google OAuth login alignment  
**Decision:** Add `student_id`, `phone_number`, and `github_url` to `Member` table; assign Personal Email as the primary authentication email.

## Why

1. **OAuth Login Failure Prevention:** Google Form collects both student institutional emails (`@astu.edu.et`) and personal emails (`@gmail.com`). When members authenticate via Google OAuth, Google returns their personal Google account email. If the database stored the university email, authentication would fail with an account mismatch. Storing the personal email as `Member.email` guarantees seamless OAuth login.
2. **Institutional & Contact Completeness:** Officers and university faculty need access to official ASTU Student IDs (e.g. `UGR/12345/14`), phone numbers (`+251...`), and GitHub URLs for technical credentialing and division activities.

## Schema & Migration

Migration: `0005_add_member_contact_fields.py`

```sql
ALTER TABLE members ADD COLUMN student_id VARCHAR(50);
ALTER TABLE members ADD COLUMN phone_number VARCHAR(50);
ALTER TABLE members ADD COLUMN github_url VARCHAR(255);
```

## Behavior & API

- `Member` model and Pydantic schemas (`MeOut`, `MemberListItem`, `MemberDetail`, `MemberSelfUpdate`, `MemberAdminUpdate`) include `student_id`, `phone_number`, `github_url`, and `telegram_username`.
- `GET /api/v1/auth/me` returns contact fields to the frontend session context.
- `PATCH /api/v1/members/me` allows members to update phone number, github URL, and telegram handle.
- Roster exports and administrative audit trails include student IDs, phone numbers, and GitHub profile URLs.
