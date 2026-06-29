import type { OrgRole, TeamRole } from "@/types/domain";

export function canManageOrg(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageTeam(orgRole: OrgRole, teamRole: TeamRole): boolean {
  return canManageOrg(orgRole) || teamRole === "leader";
}

export function canViewResource(orgRole: OrgRole, resource: string): boolean {
  void resource;
  return orgRole === "owner" || orgRole === "admin" || orgRole === "member" || orgRole === "viewer";
}

export function canEditResource(orgRole: OrgRole, resource: string): boolean {
  void resource;
  return orgRole === "owner" || orgRole === "admin" || orgRole === "member";
}
