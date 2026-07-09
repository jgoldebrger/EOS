/** Frozen contract types — do not modify without orchestrator approval. */

export type OrgRole = "owner" | "admin" | "member" | "viewer";

export type TeamRole = "leader" | "member" | "viewer";

export type AuditEntityType =
  | "organizations"
  | "teams"
  | "team_members"
  | "org_members"
  | "scorecard_metrics"
  | "scorecard_entries"
  | "rocks"
  | "issues"
  | "headlines"
  | "inbox"
  | "todos"
  | "meetings"
  | "meeting_notes"
  | "meeting_schedules"
  | "accountability_charts"
  | "vto_sections"
  | "vto_snapshots"
  | "people_reviews"
  | "ai_suggestions"
  | "sso_connections"
  | "users"
  | "projects"
  | "transport";

export const AUDIT_ACTIONS = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  ARCHIVE: "archive",
  RESTORE: "restore",
  INVITE: "invite",
  REMOVE: "remove",
  ROLE_CHANGE: "role_change",
  LOGIN: "login",
  LOGOUT: "logout",
  /** AI suggestion approved or applied */
  APPROVE: "approve",
  /** AI suggestion dismissed */
  DISMISS: "dismiss",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
