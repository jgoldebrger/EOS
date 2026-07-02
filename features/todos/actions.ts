"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  cancelTodoSchema,
  completeTodoSchema,
  createTodoSchema,
  updateTodoSchema,
} from "@/features/todos/schema";
import type { CreateTodoResult, TodoActionResult } from "@/features/todos/types";
import { canEditResource, canManageOrg, canManageTeam } from "@/lib/permissions/checks";
import { AUDIT_ACTIONS } from "@/types/domain";
import type { OrgRole, TeamRole } from "@/types/domain";
import { logAuditEvent } from "@/lib/audit";
import { createInboxItem } from "@/features/inbox/actions";
import { notifyAssignment } from "@/lib/notifications/send";
import type { Json, TablesUpdate } from "@/types/database";

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

async function canManageTodo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgRole: OrgRole,
  userId: string,
  ownerId: string,
  teamId: string | null | undefined,
): Promise<boolean> {
  if (!canEditResource(orgRole, "todos")) {
    return false;
  }

  if (ownerId === userId) {
    return true;
  }

  if (canManageOrg(orgRole)) {
    return true;
  }

  if (!teamId) {
    return false;
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return false;
  }

  return canManageTeam(orgRole, membership.team_role as TeamRole);
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
    entityType: "todos",
    entityId,
    metadata,
  });
}

async function revalidateTodos(orgSlug: string) {
  revalidatePath(`/org/${orgSlug}/todos`);
}

export async function createTodo(input: unknown): Promise<CreateTodoResult> {
  const parsed = createTodoSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid todo details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const allowed = await canManageTodo(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    parsed.data.ownerId,
    parsed.data.teamId ?? null,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to create this todo",
    };
  }

  const { data: todo, error } = await actor.supabase
    .from("todos")
    .insert({
      organization_id: parsed.data.organizationId,
      team_id: parsed.data.teamId ?? null,
      title: parsed.data.title,
      owner_id: parsed.data.ownerId,
      due_date: parsed.data.dueDate ?? null,
      status: parsed.data.status ?? "open",
      source_type: parsed.data.sourceType ?? "manual",
      source_id: parsed.data.sourceId ?? null,
      created_by: actor.user.id,
    })
    .select("id")
    .single();

  if (error || !todo) {
    return {
      success: false,
      error: "Unable to create todo. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.CREATE,
    todo.id,
    { title: parsed.data.title } as Json,
  );

  const { data: orgRow } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (orgRow?.slug) {
    await revalidateTodos(orgRow.slug);
  }

  return { success: true, todoId: todo.id };
}

export async function updateTodo(input: unknown): Promise<TodoActionResult> {
  const parsed = updateTodoSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid todo details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: existing } = await actor.supabase
    .from("todos")
    .select("owner_id, team_id, status, title")
    .eq("id", parsed.data.todoId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Todo not found" };
  }

  const ownerId = parsed.data.ownerId ?? existing.owner_id;
  const teamId = parsed.data.teamId ?? existing.team_id;

  const allowed = await canManageTodo(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    ownerId,
    teamId,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to update this todo",
    };
  }

  const updates: TablesUpdate<"todos"> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.teamId !== undefined) updates.team_id = parsed.data.teamId;
  if (parsed.data.ownerId !== undefined) updates.owner_id = parsed.data.ownerId;
  if (parsed.data.dueDate !== undefined) updates.due_date = parsed.data.dueDate;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.sourceType !== undefined) {
    updates.source_type = parsed.data.sourceType;
  }
  if (parsed.data.sourceId !== undefined) updates.source_id = parsed.data.sourceId;

  if (parsed.data.status === "done" && updates.completed_at === undefined) {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await actor.supabase
    .from("todos")
    .update(updates)
    .eq("id", parsed.data.todoId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to update todo. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    parsed.data.todoId,
    updates as Json,
  );

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateTodos(org.slug);
  }

  if (
    parsed.data.ownerId !== undefined &&
    parsed.data.ownerId !== existing.owner_id &&
    parsed.data.ownerId !== actor.user.id
  ) {
    await createInboxItem({
      organizationId: parsed.data.organizationId,
      assigneeId: parsed.data.ownerId,
      title: `To-do assigned: ${existing.title}`,
      sourceType: "todo",
      sourceId: parsed.data.todoId,
      actionUrl: `/org/${org?.slug ?? ""}/todos`,
    });
    await notifyAssignment({
      userId: parsed.data.ownerId,
      title: `To-do assigned: ${existing.title}`,
      actionUrl: `/org/${org?.slug ?? ""}/todos`,
    });
  }

  return { success: true };
}

export async function completeTodo(input: unknown): Promise<TodoActionResult> {
  const parsed = completeTodoSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid complete request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: existing } = await actor.supabase
    .from("todos")
    .select("owner_id, team_id, status")
    .eq("id", parsed.data.todoId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Todo not found" };
  }

  if (existing.status === "done") {
    return { success: true };
  }

  const allowed = await canManageTodo(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    existing.owner_id,
    existing.team_id,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to complete this todo",
    };
  }

  const completedAt = new Date().toISOString();
  const { error } = await actor.supabase
    .from("todos")
    .update({
      status: "done",
      completed_at: completedAt,
    })
    .eq("id", parsed.data.todoId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to complete todo. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    parsed.data.todoId,
    { status: "done", completed_at: completedAt } as Json,
  );

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateTodos(org.slug);
  }

  return { success: true };
}

export async function cancelTodo(input: unknown): Promise<TodoActionResult> {
  const parsed = cancelTodoSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid cancel request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: existing } = await actor.supabase
    .from("todos")
    .select("owner_id, team_id, status")
    .eq("id", parsed.data.todoId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Todo not found" };
  }

  if (existing.status === "cancelled") {
    return { success: true };
  }

  const allowed = await canManageTodo(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    existing.owner_id,
    existing.team_id,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to cancel this todo",
    };
  }

  const { error } = await actor.supabase
    .from("todos")
    .update({ status: "cancelled" })
    .eq("id", parsed.data.todoId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to cancel todo. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    parsed.data.todoId,
    { status: "cancelled" } as Json,
  );

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateTodos(org.slug);
  }

  return { success: true };
}
