"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createHeadlineSchema } from "@/features/headlines/schema";
import { logAuditEvent } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/types/domain";

export async function createHeadline(input: unknown) {
  const parsed = createHeadlineSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid headline" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false as const, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("headlines" as never)
    .insert({
      organization_id: parsed.data.organizationId,
      team_id: parsed.data.teamId ?? null,
      title: parsed.data.title,
      body: parsed.data.body ?? "",
      headline_type: parsed.data.headlineType,
      created_by: user.id,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    return { success: false as const, error: "Could not create headline" };
  }

  await logAuditEvent(supabase, {
    organizationId: parsed.data.organizationId,
    actorId: user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "issues",
    entityId: (data as { id: string }).id,
    metadata: { type: "headline" },
  });

  revalidatePath("/");
  return { success: true as const };
}

export async function getHeadlinesForTeam(organizationId: string, teamId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("headlines" as never)
    .select("*")
    .eq("organization_id", organizationId)
    .eq("team_id", teamId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []) as Array<{
    id: string;
    title: string;
    body: string;
    headline_type: string;
    created_at: string;
  }>;
}
