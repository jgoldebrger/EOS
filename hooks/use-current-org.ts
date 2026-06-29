"use client";

import type { OrgAccessContext } from "@/lib/auth/require-org-access";

export function useCurrentOrg(): OrgAccessContext | null {
  throw new Error("useCurrentOrg: not implemented (Wave 1b)");
}
