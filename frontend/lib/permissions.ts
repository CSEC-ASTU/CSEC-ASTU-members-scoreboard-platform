import {
  type Member,
  type PointEvent,
  type Permission,
  type Role,
  OFFICER_ROLES,
  getMember,
} from "./csec-data"

// Role hierarchy rank for seniority checks
const ROLE_HIERARCHY: Record<string, number> = {
  member: 1,
  division_head: 2,
  vice_president: 3,
  president: 4,
}

const OFFICER_DELEGATED_PERMISSIONS = new Set([
  "approve_task",
  "manage_tasks",
  "assign_permission",
  "import_members",
  "view_division_members",
  "override_approval",
  "execute_layoff",
  "manage_settings",
  "manage_divisions",
  "view_audit_log",
  "run_annual_reset",
])

/**
 * Checks if the member has officer privileges (either via role or enabled delegated permissions).
 */
export function isOfficer(member: Member): boolean {
  if (!member) return false
  if (OFFICER_ROLES.includes(member.role)) return true
  return (member.permissions || []).some(
    (p) => p.isEnabled && OFFICER_DELEGATED_PERMISSIONS.has(p.permissionKey || p.label)
  )
}

/**
 * Does a delegated permission cover a given event?
 */
function permissionCovers(permission: Permission, event: PointEvent, target?: Member): boolean {
  if (!permission.isEnabled) return false
  if (permission.expiresAt && new Date(permission.expiresAt) < new Date()) return false
  if (permission.scopeCategory && permission.scopeCategory !== event.category) return false
  if (permission.scopeDivision && target && permission.scopeDivision !== target.division) return false
  return true
}

/**
 * Core governance rule:
 * - No self-approval.
 * - Approver must be strictly senior to submitter, except President and VP who approve each other.
 * - Division heads approve for their own division.
 * - Delegated permissions apply within their granted scope.
 */
export function canApprove(actor: Member, event: PointEvent): boolean {
  // Rule 1: No self-approval under any circumstance
  if (event.memberId === actor.id) return false

  const target = getMember(event.memberId)
  if (!target) return false

  // Rule 2: Top governance pair (President & VP approve each other)
  if (actor.role === "president" && target.role === "vice_president") return true
  if (actor.role === "vice_president" && target.role === "president") return true

  // Rule 3: President can approve anyone else club-wide
  if (actor.role === "president") return true

  // Rule 4: Vice president can approve division heads & members club-wide
  if (actor.role === "vice_president" && ROLE_HIERARCHY[target.role] < 3) return true

  // Rule 5: Division head can approve members within their own division
  if (
    actor.role === "division_head" &&
    target.role === "member" &&
    target.division === actor.division
  ) {
    return true
  }

  // Rule 6: Delegated active permissions
  return actor.permissions.some((p) => permissionCovers(p, event, target))
}

/**
 * Events eligible for this officer's pending approval queue.
 */
export function getApprovableEvents(actor: Member, events: PointEvent[]): PointEvent[] {
  return events.filter((e) => e.status === "pending" && canApprove(actor, e))
}

/**
 * Can this member manage delegated permissions within their scope?
 * Division heads can delegate within their division; VP & President club-wide.
 */
export function canManagePermissions(member: Member): boolean {
  if (!member || member.role === "member") return false
  return OFFICER_ROLES.includes(member.role)
}

/**
 * Layoff rule (PRD §6 & API §2): Executed solely by the President.
 */
export function canLayoff(member: { role: Role }): boolean {
  return member.role === "president"
}

/**
 * Platform settings management (PRD §4a & API §10): President only.
 */
export function canManageSettings(member: { role: Role }): boolean {
  return member.role === "president"
}

/**
 * Annual cycle reset & archive (PRD §4a & API §9): President only.
 */
export function canExecuteAnnualReset(member: { role: Role }): boolean {
  return member.role === "president"
}

/**
 * Executive administration access (global tasks, member CSV bulk import, platform audit).
 * President and Vice President only.
 */
export function canAccessAdmin(member: { role: Role }): boolean {
  return member.role === "president" || member.role === "vice_president"
}

/**
 * Check if officer can issue warning or manual adjustment to target member.
 */
export function canIssueWarning(actor: Member, target: Member): boolean {
  if (actor.id === target.id) return false
  if (actor.role === "president") return true
  if (actor.role === "vice_president" && target.role !== "president") return true
  if (actor.role === "division_head" && target.role === "member" && target.division === actor.division) return true
  return false
}

/**
 * Can this officer assign official base platform roles?
 * President and Vice President only.
 */
export function canAssignRoles(member: { role: Role }): boolean {
  return member.role === "president" || member.role === "vice_president"
}

/**
 * Returns the list of base roles that the current actor is permitted to assign.
 * - President: President (transfer), Vice President, Division Head, General Member
 * - Vice President: Division Head, General Member
 */
export function getAssignableRoles(
  actor: { role: Role },
): Array<{ value: Role; label: string; description: string }> {
  if (actor.role === "president") {
    return [
      {
        value: "president",
        label: "President (Transfer Leadership)",
        description: "Transfers club presidency to this member. You will step down to Vice President.",
      },
      {
        value: "vice_president",
        label: "Vice President",
        description: "Appoint club-wide executive officer with governance delegation powers.",
      },
      {
        value: "division_head",
        label: "Division Head",
        description: "Appoint operational leader for a specific division.",
      },
      {
        value: "member",
        label: "General Member",
        description: "Standard active club member.",
      },
    ]
  }
  if (actor.role === "vice_president") {
    return [
      {
        value: "division_head",
        label: "Division Head",
        description: "Appoint operational leader for a specific division.",
      },
      {
        value: "member",
        label: "General Member",
        description: "Standard active club member.",
      },
    ]
  }
  return []
}

/**
 * Check if actor can modify the role of target member.
 * - President can modify anyone.
 * - Vice President can modify Division Heads and General Members (not President or other VPs).
 */
export function canModifyMemberRole(actor: { role: Role }, target: { role: Role }): boolean {
  if (actor.role === "president") return true
  if (actor.role === "vice_president") {
    return target.role !== "president" && target.role !== "vice_president"
  }
  return false
}

