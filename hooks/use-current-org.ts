"use client";

import type { OrgAccessContext } from "@/lib/auth/require-org-access";
import { useOrgContext } from "@/features/organizations/components/org-context";

export function useCurrentOrg(): OrgAccessContext | null {
  try {
    const ctx = useOrgContext();
    return {
      orgId: ctx.orgId,
      orgSlug: ctx.orgSlug,
      role: ctx.role,
    };
  } catch {
    return null;
  }
}
