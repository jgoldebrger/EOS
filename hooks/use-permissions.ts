"use client";

import type { OrgRole } from "@/types/domain";

export interface PermissionsContext {
  orgRole: OrgRole;
  canManageOrg: boolean;
  canEdit: (resource: string) => boolean;
  canView: (resource: string) => boolean;
}

export function usePermissions(): PermissionsContext {
  throw new Error("usePermissions: not implemented (Wave 1b)");
}
