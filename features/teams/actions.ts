"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createTeamSchema, teamSlugFromName } from "@/features/teams/schema";
import type { CreateTeamResult } from "@/features/teams/types";
import { AUDIT_ACTIONS } from "@/types/domain";
import { logAuditEvent } from "@/lib/audit";

export async function createTeam(input: unknown): Promise<CreateTeamResult> {
  const parsed = createTeamSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid team details",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to create a team" };
  }

  const { organizationId, name } = parsed.data;
  const slug = parsed.data.slug ?? teamSlugFromName(name);

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      organization_id: organizationId,
      name,
      slug,
      created_by: user.id,
    })
    .select("id, slug, organization_id")
    .single();

  if (teamError) {
    if (teamError.code === "23505") {
      return {
        success: false,
        error: "A team with this slug already exists in your organization.",
      };
    }
    return {
      success: false,
      error: "Unable to create team. Please try again.",
    };
  }

  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: user.id,
    team_role: "leader",
    created_by: user.id,
  });

  if (memberError) {
    return {
      success: false,
      error: "Unable to add you as team leader. Please try again.",
    };
  }

  await logAuditEvent(supabase, {
    organizationId: team.organization_id,
    actorId: user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "teams",
    entityId: team.id,
    metadata: { name, slug },
  });

  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", team.organization_id)
    .single();

  if (org?.slug) {
    revalidatePath(`/org/${org.slug}/dashboard`);
  }

  return { success: true, slug: team.slug };
}
