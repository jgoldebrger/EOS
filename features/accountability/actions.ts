"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  assignUserSchema,
  createSeatSchema,
  deleteSeatSchema,
  reorderSeatsSchema,
  updateSeatSchema,
} from "@/features/accountability/schema";
import type {
  CreateSeatResult,
  SeatActionResult,
} from "@/features/accountability/types";
import { isActionActorError, requireAdminActor } from "@/lib/auth/get-action-actor";
import { AUDIT_ACTIONS } from "@/types/domain";
import type { Json, TablesUpdate } from "@/types/database";
import { logAuditEvent } from "@/lib/audit";

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
    entityType: "accountability_charts",
    entityId,
    metadata,
  });
}

async function revalidateAccountability(orgSlug: string) {
  revalidatePath(`/org/${orgSlug}/accountability`);
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

async function validateParentSeat(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  parentId: string | null | undefined,
  seatId?: string,
): Promise<{ success: false; error: string } | null> {
  if (!parentId) {
    return null;
  }

  if (seatId && parentId === seatId) {
    return { success: false, error: "A seat cannot be its own parent" };
  }

  const { data: parent } = await supabase
    .from("accountability_seats")
    .select("id, parent_id")
    .eq("id", parentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!parent) {
    return { success: false, error: "Parent seat not found" };
  }

  if (seatId) {
    let cursor: string | null = parent.parent_id;
    while (cursor) {
      if (cursor === seatId) {
        return {
          success: false,
          error: "Cannot assign a descendant as the parent seat",
        };
      }
      const { data: ancestor } = await supabase
        .from("accountability_seats")
        .select("parent_id")
        .eq("id", cursor)
        .eq("organization_id", organizationId)
        .maybeSingle();
      cursor = ancestor?.parent_id ?? null;
    }
  }

  return null;
}

export async function createSeat(input: unknown): Promise<CreateSeatResult> {
  const parsed = createSeatSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid seat details",
    };
  }

  const actor = await requireAdminActor(parsed.data.organizationId);
  if (isActionActorError(actor)) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const parentError = await validateParentSeat(
    actor.supabase,
    parsed.data.organizationId,
    parsed.data.parentId ?? null,
  );
  if (parentError) {
    return parentError;
  }

  const { data: seat, error } = await actor.supabase
    .from("accountability_seats")
    .insert({
      organization_id: parsed.data.organizationId,
      title: parsed.data.title,
      parent_id: parsed.data.parentId ?? null,
      responsibilities: parsed.data.responsibilities ?? null,
      display_order: parsed.data.displayOrder ?? 0,
      created_by: actor.user.id,
    })
    .select("id")
    .single();

  if (error || !seat) {
    return {
      success: false,
      error: "Unable to create seat. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.CREATE,
    seat.id,
    { title: parsed.data.title } as Json,
  );

  const slug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (slug) {
    await revalidateAccountability(slug);
  }

  return { success: true, seatId: seat.id };
}

export async function updateSeat(input: unknown): Promise<SeatActionResult> {
  const parsed = updateSeatSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid seat details",
    };
  }

  const actor = await requireAdminActor(parsed.data.organizationId);
  if (isActionActorError(actor)) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: existing } = await actor.supabase
    .from("accountability_seats")
    .select("id")
    .eq("id", parsed.data.seatId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Seat not found" };
  }

  if (parsed.data.parentId !== undefined) {
    const parentError = await validateParentSeat(
      actor.supabase,
      parsed.data.organizationId,
      parsed.data.parentId,
      parsed.data.seatId,
    );
    if (parentError) {
      return parentError;
    }
  }

  const updates: TablesUpdate<"accountability_seats"> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.parentId !== undefined) updates.parent_id = parsed.data.parentId;
  if (parsed.data.responsibilities !== undefined) {
    updates.responsibilities = parsed.data.responsibilities;
  }
  if (parsed.data.displayOrder !== undefined) {
    updates.display_order = parsed.data.displayOrder;
  }

  const { error } = await actor.supabase
    .from("accountability_seats")
    .update(updates)
    .eq("id", parsed.data.seatId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to update seat. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    parsed.data.seatId,
    updates as Json,
  );

  const slug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (slug) {
    await revalidateAccountability(slug);
  }

  return { success: true };
}

export async function deleteSeat(input: unknown): Promise<SeatActionResult> {
  const parsed = deleteSeatSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid delete request",
    };
  }

  const actor = await requireAdminActor(parsed.data.organizationId);
  if (isActionActorError(actor)) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { count, error: countError } = await actor.supabase
    .from("accountability_seats")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", parsed.data.seatId)
    .eq("organization_id", parsed.data.organizationId);

  if (countError) {
    return {
      success: false,
      error: "Unable to verify seat children. Please try again.",
    };
  }

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: "Remove or reassign child seats before deleting this seat",
    };
  }

  const { error } = await actor.supabase
    .from("accountability_seats")
    .delete()
    .eq("id", parsed.data.seatId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to delete seat. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.DELETE,
    parsed.data.seatId,
    {} as Json,
  );

  const slug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (slug) {
    await revalidateAccountability(slug);
  }

  return { success: true };
}

export async function assignUser(input: unknown): Promise<SeatActionResult> {
  const parsed = assignUserSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid assignment",
    };
  }

  const actor = await requireAdminActor(parsed.data.organizationId);
  if (isActionActorError(actor)) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (parsed.data.userId) {
    const { data: member } = await actor.supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", parsed.data.organizationId)
      .eq("user_id", parsed.data.userId)
      .maybeSingle();

    if (!member) {
      return { success: false, error: "User is not a member of this organization" };
    }
  }

  const { error } = await actor.supabase
    .from("accountability_seats")
    .update({ assigned_user_id: parsed.data.userId })
    .eq("id", parsed.data.seatId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to assign user. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    parsed.data.seatId,
    { assigned_user_id: parsed.data.userId } as Json,
  );

  const slug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (slug) {
    await revalidateAccountability(slug);
  }

  return { success: true };
}

export async function reorderSeats(input: unknown): Promise<SeatActionResult> {
  const parsed = reorderSeatsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid reorder request",
    };
  }

  const actor = await requireAdminActor(parsed.data.organizationId);
  if (isActionActorError(actor)) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  for (const item of parsed.data.orders) {
    const { error } = await actor.supabase
      .from("accountability_seats")
      .update({ display_order: item.displayOrder })
      .eq("id", item.seatId)
      .eq("organization_id", parsed.data.organizationId);

    if (error) {
      return {
        success: false,
        error: "Unable to reorder seats. Please try again.",
      };
    }
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    parsed.data.organizationId,
    { orders: parsed.data.orders } as Json,
  );

  const slug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (slug) {
    await revalidateAccountability(slug);
  }

  return { success: true };
}
