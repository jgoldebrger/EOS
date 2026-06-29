import type { OrgRole } from "@/types/domain";
import type { Organization } from "@/types/database";

export interface OrganizationWithRole extends Organization {
  role: OrgRole;
}

export type CreateOrganizationResult =
  | { success: true; slug: string; orgId: string }
  | { success: false; error: string };
