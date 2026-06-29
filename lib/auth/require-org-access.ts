import type { OrgRole } from "@/types/domain";

export interface OrgAccessContext {
  orgId: string;
  orgSlug: string;
  role: OrgRole;
}

export async function requireOrgAccess(
  _orgSlug: string,
): Promise<OrgAccessContext> {
  throw new Error("requireOrgAccess: not implemented (Wave 1b)");
}
