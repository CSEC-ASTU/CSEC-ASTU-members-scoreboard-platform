# 🛠️ CSEC-ASTU Platform — Audit Remediation & Hardening Action Plan

> **Status:** Pending Execution (Prepared for immediate continuation)  
> **Target Execution Time:** ~20–25 minutes  
> **Origin:** Senior Engineering & Product Review (Scorecard: 68/100 &rarr; Target: 100/100)  
> **Key Focus Areas:** Security & Anti-Fraud, Public Sharing, Database Scale (N+1), Onboarding Resilience, and Officer Workflows.

---

## 📋 Executive Overview & Verified Findings

During deep forensic code inspection, all core criticisms from the external review were **confirmed verbatim** against the codebase:

1. **Security Vulnerability:** In `backend/app/services/point_events.py`, claims with points $\le 10$ auto-approve with `approved_by = member.id` without evidence or PIN verification, enabling self-awarding of points.
2. **Cross-Division Authorization Bug:** In `backend/app/api/v1/routers/member_permissions.py`, `_can_manage_grant` checks if a Division Head has `assign_permission` in their own division, but fails to check if the target grant belongs to a member in their division.
3. **Public Sharing Blocker:** `GET /members/{id}/achievement-card` is 401-locked behind authentication. External recruiters clicking LinkedIn links hit a login wall with closed registration.
4. **Severe Database N+1:** In `backend/app/api/v1/routers/members.py`, listing members runs 5 queries per member in a Python loop (126 queries per page of 25 members).
5. **Compounding Buffer Bug:** In `backend/app/services/settings.py`, `career_score` compounds the 50-pt starting buffer across academic years ($4 \times 50 = 200$ phantom points for seniors).
6. **Onboarding Blocker:** In `backend/app/services/import_members.py`, missing selfies or GitHub profiles fail the entire row import.
7. **Attendance No-Show Dead-End:** In `frontend/features/attendance/components/session-detail-dialog.tsx`, absent cells have zero actionable buttons for officers to issue warnings or excuse absences.

---

## 🚀 Step-by-Step Implementation Blueprint

### Phase 1: Security & Governance Hardening (~5 mins)

#### 1.1 Plug the Self-Approval Loophole in `create_claim`
- **File:** [`backend/app/services/point_events.py`](file:///d:/Full-Stack_Projects/csec-astu-platform/backend/app/services/point_events.py#L168-L185)
- **Problem:**
  ```python
  # CURRENT BUG: Any task <= 10 pts auto-approves with approved_by = member.id!
  auto = is_session_verified or (abs(task.base_points) <= settings.auto_approve_claim_max_points and not task.is_penalty)
  ```
- **Remediation:**
  Only physical whiteboard sessions with verified 6-digit PINs should ever auto-approve:
  ```python
  # FIXED: Auto-approval is STRICTLY restricted to verified physical session PINs
  auto = is_session_verified
  ```

#### 1.2 Enable Division Head Lateral Approvals for Routine Tasks
- **File:** [`backend/app/core/permissions.py`](file:///d:/Full-Stack_Projects/csec-astu-platform/backend/app/core/permissions.py#L124-L134)
- **Problem:** `ROLE_RANK[DIVISION_HEAD] > ROLE_RANK[DIVISION_HEAD]` evaluates to `1 > 1 == False`. One DH can never approve another DH for cross-division workshops.
- **Remediation:**
  Add a routine approval exception allowing Division Heads to cross-approve other Division Heads for non-penalty, routine claims:
  ```python
  def can_approve_submitter(approver: Member, submitter: Member, task: Task | None = None) -> bool:
      if approver.id == submitter.id:
          return False
      if {approver.role, submitter.role} == {MemberRole.PRESIDENT, MemberRole.VICE_PRESIDENT}:
          return True
      # Lateral exception: Division Heads can cross-approve each other for routine non-penalty tasks
      if (
          approver.role == MemberRole.DIVISION_HEAD
          and submitter.role == MemberRole.DIVISION_HEAD
          and task is not None
          and not task.is_penalty
          and abs(task.base_points) <= 15
      ):
          return True
      return ROLE_RANK[approver.role] > ROLE_RANK[submitter.role]
  ```

#### 1.3 Fix Cross-Division Permission Grant Scoping
- **File:** [`backend/app/api/v1/routers/member_permissions.py`](file:///d:/Full-Stack_Projects/csec-astu-platform/backend/app/api/v1/routers/member_permissions.py#L22-L34)
- **Problem:** `_can_manage_grant` does not verify that the target grant belongs to a member in the Division Head's division.
- **Remediation:**
  ```python
  async def _can_manage_grant(db: AsyncSession, actor: Member, grant: MemberPermission, perms: list[str]) -> bool:
      if actor.role == MemberRole.PRESIDENT:
          return True
      if grant.granted_by == actor.id:
          return True
      if is_club_wide_officer(actor):
          return True
      if actor.role == MemberRole.DIVISION_HEAD and has_permission(perms, "assign_permission", division_id=actor.division_id):
          target_member = await db.get(Member, grant.member_id)
          if target_member and target_member.division_id == actor.division_id:
              return True
      return False
  ```

---

### Phase 2: Public LinkedIn & Recruiter Achievement Card (~5 mins)

#### 2.1 Create Public Unauthenticated API Endpoint
- **File:** [`backend/app/api/v1/routers/members.py`](file:///d:/Full-Stack_Projects/csec-astu-platform/backend/app/api/v1/routers/members.py#L334)
- **Remediation:**
  Remove `RequireUser` requirement from the achievement card endpoint or expose `GET /api/v1/public/members/{id}/achievement-card` so external viewers without cookies can fetch card data:
  ```python
  @router.get("/{member_id}/achievement-card", response_model=AchievementCardOut)
  async def achievement_card(member_id: UUID, db: DbSession) -> AchievementCardOut:
      m = await db.get(Member, member_id)
      if m is None or not m.is_active:
          raise HTTPException(status_code=404, detail="Member not found")
      # Compute scores and return public card DTO
  ```

#### 2.2 Create Public Next.js Share Route
- **File:** `frontend/app/share/achievement/[id]/page.tsx`
- **Remediation:**
  - Standalone page rendered **outside** the authenticated `<Layout>` navigation shell.
  - Generates OpenGraph metadata (`og:title`, `og:description`, `og:image`) for LinkedIn and Twitter card scrapers.
  - Renders the high-res `<AchievementCard />` with a public "Verify Membership" watermark and copy link action.

---

### Phase 3: Database & Scale Optimization (Eliminate N+1) (~5 mins)

#### 3.1 Batch Score Aggregation on `GET /members`
- **File:** [`backend/app/api/v1/routers/members.py`](file:///d:/Full-Stack_Projects/csec-astu-platform/backend/app/api/v1/routers/members.py#L80-L104)
- **Problem:** Loop runs 5 queries per member &rarr; 126 queries per page.
- **Remediation:**
  Fetch `year`, `cap`, and `buffer` once outside the loop. Run a single batch aggregation query using `WHERE member_id IN (:member_ids)` for both `point_events` and `annual_summaries`:
  ```python
  # 1 Query for all members on the page instead of 125!
  member_ids = [m.id for m in rows if m.google_id]
  # Batch query points and summaries, map in memory
  ```

#### 3.2 Eliminate Client-Side Memory Joins in Approvals Queue
- **File:** [`frontend/app/approvals/page.tsx`](file:///d:/Full-Stack_Projects/csec-astu-platform/frontend/app/approvals/page.tsx#L36-L59)
- **Problem:** Requests `useMembers({ page_size: 100 })` and `useTasks({ page_size: 100 })` and manually joins them in memory.
- **Remediation:**
  Delete `useMembers` and `useTasks` calls. Use `event.member_name`, `event.task_title`, and `event.approver_name` which are already eagerly returned on `PointEventOut`.

#### 3.3 Set Connection Pool Bounds & Enable Strict TS Checking
- **File:** [`backend/app/database.py`](file:///d:/Full-Stack_Projects/csec-astu-platform/backend/app/database.py#L14-L18)
  ```python
  engine = create_async_engine(
      settings.database_url,
      echo=settings.debug,
      pool_size=5,
      max_overflow=5,
      pool_recycle=300,
      pool_pre_ping=True,
  )
  ```
- **File:** [`frontend/next.config.mjs`](file:///d:/Full-Stack_Projects/csec-astu-platform/frontend/next.config.mjs#L3-L5)
  Remove `typescript: { ignoreBuildErrors: true }` to enforce strict compilation.

---

### Phase 4: Data Integrity & Student Form Resilience (~4 mins)

#### 4.1 Fix Compounding Initial Buffer in `career_score`
- **File:** [`backend/app/services/settings.py`](file:///d:/Full-Stack_Projects/csec-astu-platform/backend/app/services/settings.py#L100-L108)
- **Problem:** Past annual summaries already have the buffer added. Adding current `cycle_score` (which also has the buffer) multiplies the buffer every year.
- **Remediation:**
  ```python
  # career_score = total earned points + SINGLE initial buffer
  past_points = past - (past_years_count * buffer)  # or derive directly from raw earned events
  career = buffer + total_lifetime_earned_points
  ```

#### 4.2 Make Missing Social/Photo Fields Optional in CSV Import
- **File:** [`backend/app/services/import_members.py`](file:///d:/Full-Stack_Projects/csec-astu-platform/backend/app/services/import_members.py#L17-L28)
- **Remediation:**
  Remove `github_url`, `telegram_username`, and `profile_image_url` from `REQUIRED_COLUMNS`.
  If a student does not supply a selfie or GitHub link, import the row with `null` instead of throwing an error.

---

### Phase 5: Actionable Attendance Matrix No-Show Flow (~3 mins)

#### 5.1 Add Direct Resolution Actions to Attendance Dialog
- **File:** [`frontend/features/attendance/components/session-detail-dialog.tsx`](file:///d:/Full-Stack_Projects/csec-astu-platform/frontend/features/attendance/components/session-detail-dialog.tsx#L59-L75)
- **Remediation:**
  When `selectedCell.status === "absent"`, render two action buttons for officers:
  - 🔴 **"Issue Absence Penalty (-25 pts)"**: Triggers `useBatchOfficerEventsMutation` with reason `"Unexcused absence: {session_title}"`.
  - ⚪ **"Mark Excused"**: Logs note/exemption without penalty.

---

### Phase 6: Automated Verification (~2 mins)

Run full test suite and type check:
```bash
# Backend Pytest Suite
cd backend
.venv\Scripts\pytest tests/ -v

# Frontend TypeScript Verification
cd frontend
npx tsc --noEmit
```

---

## 📌 Summary for Tomorrow

When you are ready to resume, you can simply tell me:
> **"Execute the audit remediation plan"**

I will execute all 5 phases systematically, update the test suite, verify everything locally, and present the final results.
