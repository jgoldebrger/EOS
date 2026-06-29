"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  bootstrapVtoSchema,
  createSnapshotSchema,
  restoreSnapshotSchema,
  toggleSectionVisibilitySchema,
  updateSectionSchema,
} from "@/features/vto/schema";
import type {
  BootstrapVtoResult,
  CreateSnapshotResult,
  VtoActionResult,
  VtoSnapshotSection,
} from "@/features/vto/types";
import { buildSnapshotPayload, DEFAULT_VTO_SECTIONS } from "@/features/vto/utils";
import { canManageOrg } from "@/lib/permissions/checks";
import { AUDIT_ACTIONS } from "@/types/domain";
import type { OrgRole } from "@/types/domain";
import type { Json, TablesUpdate } from "@/types/database";
import { logAuditEvent } from "@/lib/audit";

async function getActorContext(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in" } as const;
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You do not have access to this organization" } as const;
  }

  return {
    supabase,
    user,
    orgRole: membership.org_role as OrgRole,
  } as const;
}

function requireAdmin(orgRole: OrgRole): { success: false; error: string } | null {
  if (!canManageOrg(orgRole)) {
    return {
      success: false,
      error: "Only organization admins can edit the Vision/Traction Organizer",
    };
  }
  return null;
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  actorId: string,
  action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS],
  entityId: string,
  metadata: Json,
) {
  await logAuditEvent(supabase, {
    organizationId,
    actorId,
    action,
    entityType: "vto_sections",
    entityId,
    metadata,
  });
}

async function revalidateVto(orgSlug: string) {
  revalidatePath(`/org/${orgSlug}/vto`);
}

async function getOrgSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", organizationId)
    .single();
  return data?.slug ?? null;
}

export async function bootstrapVtoSections(
  input: unknown,
): Promise<BootstrapVtoResult> {
  const parsed = bootstrapVtoSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid organization",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { count, error: countError } = await actor.supabase
    .from("vto_sections")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", parsed.data.organizationId);

  if (countError) {
    return {
      success: false,
      error: "Unable to load V/TO sections. Please try again.",
    };
  }

  if ((count ?? 0) > 0) {
    return { success: true, seeded: false };
  }

  const denied = requireAdmin(actor.orgRole);
  if (denied) {
    return denied;
  }

  const rows = DEFAULT_VTO_SECTIONS.map((section) => ({
    organization_id: parsed.data.organizationId,
    section_key: section.section_key,
    title: section.title,
    content: "",
    display_order: section.display_order,
    visible: true,
    created_by: actor.user.id,
  }));

  const { error } = await actor.supabase.from("vto_sections").insert(rows);

  if (error) {
    return {
      success: false,
      error: "Unable to initialize V/TO sections. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.CREATE,
    parsed.data.organizationId,
    { seeded: true, sectionCount: rows.length } as Json,
  );

  const slug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (slug) {
    await revalidateVto(slug);
  }

  return { success: true, seeded: true };
}

export async function updateSection(input: unknown): Promise<VtoActionResult> {
  const parsed = updateSectionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid section details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const denied = requireAdmin(actor.orgRole);
  if (denied) {
    return denied;
  }

  const { data: existing } = await actor.supabase
    .from("vto_sections")
    .select("id")
    .eq("id", parsed.data.sectionId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Section not found" };
  }

  const updates: TablesUpdate<"vto_sections"> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.content !== undefined) updates.content = parsed.data.content;
  if (parsed.data.visible !== undefined) updates.visible = parsed.data.visible;

  const { error } = await actor.supabase
    .from("vto_sections")
    .update(updates)
    .eq("id", parsed.data.sectionId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to update section. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    parsed.data.sectionId,
    updates as Json,
  );

  const slug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (slug) {
    await revalidateVto(slug);
  }

  return { success: true };
}

export async function toggleSectionVisibility(
  input: unknown,
): Promise<VtoActionResult> {
  const parsed = toggleSectionVisibilitySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid visibility request",
    };
  }

  return updateSection({
    organizationId: parsed.data.organizationId,
    sectionId: parsed.data.sectionId,
    visible: parsed.data.visible,
  });
}

export async function createSnapshot(
  input: unknown,
): Promise<CreateSnapshotResult> {
  const parsed = createSnapshotSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid snapshot request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const denied = requireAdmin(actor.orgRole);
  if (denied) {
    return denied;
  }

  const { data: sections, error: sectionsError } = await actor.supabase
    .from("vto_sections")
    .select("*")
    .eq("organization_id", parsed.data.organizationId)
    .order("display_order", { ascending: true });

  if (sectionsError || !sections || sections.length === 0) {
    return {
      success: false,
      error: "No V/TO sections available to snapshot",
    };
  }

  const snapshotData = buildSnapshotPayload(sections);

  const { data: snapshot, error } = await actor.supabase
    .from("vto_snapshots")
    .insert({
      organization_id: parsed.data.organizationId,
      snapshot_data: snapshotData as unknown as Json,
      created_by: actor.user.id,
    })
    .select("id")
    .single();

  if (error || !snapshot) {
    return {
      success: false,
      error: "Unable to save snapshot. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.CREATE,
    snapshot.id,
    { sectionCount: sections.length } as Json,
  );

  const slug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (slug) {
    await revalidateVto(slug);
  }

  return { success: true, snapshotId: snapshot.id };
}

export async function restoreSnapshot(input: unknown): Promise<VtoActionResult> {
  const parsed = restoreSnapshotSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid restore request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const denied = requireAdmin(actor.orgRole);
  if (denied) {
    return denied;
  }

  const { data: snapshot, error: snapshotError } = await actor.supabase
    .from("vto_snapshots")
    .select("snapshot_data")
    .eq("id", parsed.data.snapshotId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (snapshotError || !snapshot) {
    return { success: false, error: "Snapshot not found" };
  }

  const snapshotSections = snapshot.snapshot_data as unknown as VtoSnapshotSection[];
  if (!Array.isArray(snapshotSections) || snapshotSections.length === 0) {
    return { success: false, error: "Snapshot data is invalid" };
  }

  const { data: currentSections, error: currentError } = await actor.supabase
    .from("vto_sections")
    .select("id, section_key")
    .eq("organization_id", parsed.data.organizationId);

  if (currentError || !currentSections) {
    return {
      success: false,
      error: "Unable to load current sections for restore",
    };
  }

  const sectionByKey = new Map(
    currentSections.map((section) => [section.section_key, section.id]),
  );

  for (const item of snapshotSections) {
    const sectionId = sectionByKey.get(item.section_key);
    if (!sectionId) {
      continue;
    }

    const { error } = await actor.supabase
      .from("vto_sections")
      .update({
        title: item.title,
        content: item.content,
        display_order: item.display_order,
        visible: item.visible,
      })
      .eq("id", sectionId)
      .eq("organization_id", parsed.data.organizationId);

    if (error) {
      return {
        success: false,
        error: "Unable to restore snapshot. Please try again.",
      };
    }
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.RESTORE,
    parsed.data.snapshotId,
    { restoredSections: snapshotSections.length } as Json,
  );

  const slug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (slug) {
    await revalidateVto(slug);
  }

  return { success: true };
}
