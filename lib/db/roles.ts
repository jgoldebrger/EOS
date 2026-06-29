import type { OrgRole, TeamRole } from "@/types/domain";

/** Matches PostgreSQL check constraints on organization_members.org_role. */
export const ORG_ROLES: readonly OrgRole[] = [
  "owner",
  "admin",
  "member",
  "viewer",
] as const;

/** Matches PostgreSQL check constraints on team_members.team_role. */
export const TEAM_ROLES: readonly TeamRole[] = [
  "leader",
  "member",
  "viewer",
] as const;

/** Org roles that may insert ai_runs (members+, excludes viewer). */
export const AI_RUN_CONTRIBUTOR_ROLES: readonly OrgRole[] = [
  "owner",
  "admin",
  "member",
] as const;

export function isOrgRole(value: string): value is OrgRole {
  return (ORG_ROLES as readonly string[]).includes(value);
}

export function isTeamRole(value: string): value is TeamRole {
  return (TEAM_ROLES as readonly string[]).includes(value);
}

export function isAiRunContributorRole(role: OrgRole): boolean {
  return (AI_RUN_CONTRIBUTOR_ROLES as readonly OrgRole[]).includes(role);
}

export function parseOrgRole(value: string): OrgRole | null {
  return isOrgRole(value) ? value : null;
}

export function parseTeamRole(value: string): TeamRole | null {
  return isTeamRole(value) ? value : null;
}
