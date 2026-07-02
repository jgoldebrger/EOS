import type { OrgRole, TeamRole } from "@/types/domain";

export function canManageOrg(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageTeam(orgRole: OrgRole, teamRole: TeamRole): boolean {
  return canManageOrg(orgRole) || teamRole === "leader";
}

/** Org members who can contribute (not read-only viewers). */
export function isOrgContributor(orgRole: OrgRole): boolean {
  return orgRole === "owner" || orgRole === "admin" || orgRole === "member";
}

/**
 * Create/reassign measurables on a team scorecard (e.g. during L10).
 * Org admins always; any team member when org role is member+.
 */
export function canManageTeamScorecard(
  orgRole: OrgRole,
  teamRole: TeamRole | null,
): boolean {
  if (!isOrgContributor(orgRole)) {
    return false;
  }
  if (canManageOrg(orgRole)) {
    return true;
  }
  return teamRole === "leader" || teamRole === "member";
}

export function canViewResource(orgRole: OrgRole, resource: string): boolean {
  void resource;
  return orgRole === "owner" || orgRole === "admin" || orgRole === "member" || orgRole === "viewer";
}

export function canEditResource(orgRole: OrgRole, resource: string): boolean {
  void resource;
  return orgRole === "owner" || orgRole === "admin" || orgRole === "member";
}
