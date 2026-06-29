import type { OrgRole, TeamRole } from "@/types/domain";

export function canManageOrg(_role: OrgRole): boolean {
  throw new Error("canManageOrg: not implemented (Wave 1b)");
}

export function canManageTeam(_orgRole: OrgRole, _teamRole: TeamRole): boolean {
  throw new Error("canManageTeam: not implemented (Wave 1b)");
}

export function canViewResource(
  _orgRole: OrgRole,
  _resource: string,
): boolean {
  throw new Error("canViewResource: not implemented (Wave 1b)");
}

export function canEditResource(
  _orgRole: OrgRole,
  _resource: string,
): boolean {
  throw new Error("canEditResource: not implemented (Wave 1b)");
}
