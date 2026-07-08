"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createOrgSchema } from "@/features/organizations/schema";
import type { CreateOrganizationResult } from "@/features/organizations/types";
import { AUDIT_ACTIONS } from "@/types/domain";
import { logAuditEvent } from "@/lib/audit";
import { isSelfServiceOrgCreationEnabled } from "@/lib/auth/platform-access";

export async function createOrganization(
  input: unknown,
): Promise<CreateOrganizationResult> {
  const parsed = createOrgSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid organization details",
    };
  }

  if (!isSelfServiceOrgCreationEnabled()) {
    return {
      success: false,
      error: "Organization creation requires an invitation. Contact your administrator.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to create an organization" };
  }

  const { name, slug } = parsed.data;

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (orgError) {
    if (orgError.code === "23505") {
      return {
        success: false,
        error: "This URL slug is already taken. Please choose another.",
      };
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[createOrganization]", orgError);
    }
    return {
      success: false,
      error:
        process.env.NODE_ENV === "development"
          ? `Unable to create organization: ${orgError.message}`
          : "Unable to create organization. Please try again.",
    };
  }

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: org.id,
    user_id: user.id,
    org_role: "owner",
    created_by: user.id,
  });

  if (memberError) {
    return {
      success: false,
      error: "Unable to set up organization membership. Please try again.",
    };
  }

  await logAuditEvent(supabase, {
    organizationId: org.id,
    actorId: user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "organizations",
    entityId: org.id,
    metadata: { name, slug },
  });

  revalidatePath("/onboarding");
  revalidatePath(`/org/${org.slug}`);

  return { success: true, slug: org.slug, orgId: org.id };
}
