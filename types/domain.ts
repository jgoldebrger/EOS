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
  | "todos"
  | "meetings"
  | "meeting_notes"
  | "accountability_charts"
  | "vto_sections"
  | "vto_snapshots"
  | "sso_connections"
  | "users";

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
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
