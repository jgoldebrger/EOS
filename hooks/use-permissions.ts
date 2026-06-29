"use client";

import type { OrgRole } from "@/types/domain";
import {
  canEditResource,
  canManageOrg,
  canViewResource,
} from "@/lib/permissions/checks";
import { useCurrentOrg } from "@/hooks/use-current-org";

export interface PermissionsContext {
  orgRole: OrgRole;
  canManageOrg: boolean;
  canEdit: (resource: string) => boolean;
  canView: (resource: string) => boolean;
}

export function usePermissions(): PermissionsContext {
  const org = useCurrentOrg();
  const orgRole: OrgRole = org?.role ?? "viewer";

  return {
    orgRole,
    canManageOrg: canManageOrg(orgRole),
    canEdit: (resource: string) => canEditResource(orgRole, resource),
    canView: (resource: string) => canViewResource(orgRole, resource),
  };
}
