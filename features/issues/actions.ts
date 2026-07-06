"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  archiveIssueSchema,
  createIssueSchema,
  prioritizeIssueSchema,
  reorderIssuesSchema,
  setIssueParkingLotSchema,
  solveIssueSchema,
  updateIssueSchema,
} from "@/features/issues/schema";
import type {
  ConvertToTodoResult,
  CreateIssueResult,
  IssueActionResult,
} from "@/features/issues/types";
import { canEditResource } from "@/lib/permissions/checks";
import { AUDIT_ACTIONS } from "@/types/domain";
import type { OrgRole } from "@/types/domain";
import type { Json, TablesUpdate } from "@/types/database";
import { logAuditEvent } from "@/lib/audit";
import { createInboxItem } from "@/features/inbox/actions";
import { notifyAssignment } from "@/lib/notifications/send";

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
    entityType: "issues",
    entityId,
    metadata,
  });
}

async function revalidateIssues(orgSlug: string) {
  revalidatePath(`/org/${orgSlug}/issues`);
}

export async function createIssue(input: unknown): Promise<CreateIssueResult> {
  const parsed = createIssueSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid issue details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditResource(actor.orgRole, "issues")) {
    return {
      success: false,
      error: "You do not have permission to create issues",
    };
  }

  const { data: issue, error } = await actor.supabase
    .from("issues")
    .insert({
      organization_id: parsed.data.organizationId,
      team_id: parsed.data.teamId ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      owner_id: parsed.data.ownerId ?? actor.user.id,
      priority: parsed.data.priority ?? 0,
      status: parsed.data.status ?? "open",
      ids_notes: parsed.data.idsNotes ?? null,
      linked_metric_id: parsed.data.linkedMetricId ?? null,
      linked_rock_id: parsed.data.linkedRockId ?? null,
      linked_meeting_id: parsed.data.linkedMeetingId ?? null,
      created_by: actor.user.id,
    })
    .select("id")
    .single();

  if (error || !issue) {
    return {
      success: false,
      error: "Unable to create issue. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.CREATE,
    issue.id,
    { title: parsed.data.title } as Json,
  );

  const { data: orgRow } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (orgRow?.slug) {
    await revalidateIssues(orgRow.slug);
  }

  return { success: true, issueId: issue.id };
}

export async function updateIssue(input: unknown): Promise<IssueActionResult> {
  const parsed = updateIssueSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid issue details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditResource(actor.orgRole, "issues")) {
    return {
      success: false,
      error: "You do not have permission to update this issue",
    };
  }

  const { data: existing } = await actor.supabase
    .from("issues")
    .select("id, owner_id, title")
    .eq("id", parsed.data.issueId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Issue not found" };
  }

  const updates: TablesUpdate<"issues"> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.teamId !== undefined) updates.team_id = parsed.data.teamId;
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description;
  }
  if (parsed.data.ownerId !== undefined) updates.owner_id = parsed.data.ownerId;
  if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.idsNotes !== undefined) updates.ids_notes = parsed.data.idsNotes;
  if (parsed.data.linkedMetricId !== undefined) {
    updates.linked_metric_id = parsed.data.linkedMetricId;
  }
  if (parsed.data.linkedRockId !== undefined) {
    updates.linked_rock_id = parsed.data.linkedRockId;
  }
  if (parsed.data.linkedMeetingId !== undefined) {
    updates.linked_meeting_id = parsed.data.linkedMeetingId;
  }

  const { error } = await actor.supabase
    .from("issues")
    .update(updates)
    .eq("id", parsed.data.issueId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to update issue. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    parsed.data.issueId,
    updates as Json,
  );

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateIssues(org.slug);
  }

  if (
    parsed.data.ownerId !== undefined &&
    existing &&
    parsed.data.ownerId &&
    parsed.data.ownerId !== existing.owner_id &&
    parsed.data.ownerId !== actor.user.id
  ) {
    await createInboxItem({
      organizationId: parsed.data.organizationId,
      assigneeId: parsed.data.ownerId,
      title: `Issue assigned: ${existing.title}`,
      sourceType: "issue",
      sourceId: parsed.data.issueId,
      actionUrl: `/org/${org?.slug ?? ""}/issues`,
    });
    await notifyAssignment({
      userId: parsed.data.ownerId,
      title: `Issue assigned: ${existing.title}`,
      actionUrl: `/org/${org?.slug ?? ""}/issues`,
    });
  }

  return { success: true };
}

export async function solveIssue(input: unknown): Promise<IssueActionResult> {
  const parsed = solveIssueSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid solve request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditResource(actor.orgRole, "issues")) {
    return {
      success: false,
      error: "You do not have permission to solve this issue",
    };
  }

  const updates: TablesUpdate<"issues"> = { status: "solved" };
  if (parsed.data.idsNotes !== undefined) {
    updates.ids_notes = parsed.data.idsNotes;
  }

  const { error } = await actor.supabase
    .from("issues")
    .update(updates)
    .eq("id", parsed.data.issueId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to solve issue. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    parsed.data.issueId,
    { status: "solved" } as Json,
  );

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateIssues(org.slug);
  }

  return { success: true };
}

export async function archiveIssue(input: unknown): Promise<IssueActionResult> {
  const parsed = archiveIssueSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid archive request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditResource(actor.orgRole, "issues")) {
    return {
      success: false,
      error: "You do not have permission to archive this issue",
    };
  }

  const { error } = await actor.supabase
    .from("issues")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.issueId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to archive issue. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.ARCHIVE,
    parsed.data.issueId,
    {} as Json,
  );

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateIssues(org.slug);
  }

  return { success: true };
}

export async function updatePriority(input: unknown): Promise<IssueActionResult> {
  const parsed = prioritizeIssueSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid priority update",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditResource(actor.orgRole, "issues")) {
    return {
      success: false,
      error: "You do not have permission to reprioritize issues",
    };
  }

  const { error } = await actor.supabase
    .from("issues")
    .update({ priority: parsed.data.priority })
    .eq("id", parsed.data.issueId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to update priority. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    parsed.data.issueId,
    { priority: parsed.data.priority } as Json,
  );

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateIssues(org.slug);
  }

  return { success: true };
}

export async function reorderIssues(input: unknown): Promise<IssueActionResult> {
  const parsed = reorderIssuesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid reorder request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditResource(actor.orgRole, "issues")) {
    return {
      success: false,
      error: "You do not have permission to reorder issues",
    };
  }

  const count = parsed.data.issueIds.length;
  const updates = parsed.data.issueIds.map((issueId, index) => ({
    issueId,
    priority: (count - index) * 10,
  }));

  for (const update of updates) {
    const { error } = await actor.supabase
      .from("issues")
      .update({ priority: update.priority })
      .eq("id", update.issueId)
      .eq("organization_id", parsed.data.organizationId);

    if (error) {
      return {
        success: false,
        error: "Unable to reorder issues. Please try again.",
      };
    }
  }

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateIssues(org.slug);
  }

  return { success: true };
}

export async function setIssueParkingLot(input: unknown): Promise<IssueActionResult> {
  const parsed = setIssueParkingLotSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid parking lot update",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditResource(actor.orgRole, "issues")) {
    return {
      success: false,
      error: "You do not have permission to update issues",
    };
  }

  const { error } = await actor.supabase
    .from("issues")
    .update({ is_parking_lot: parsed.data.isParkingLot })
    .eq("id", parsed.data.issueId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to update parking lot. Please try again.",
    };
  }

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateIssues(org.slug);
  }

  return { success: true };
}

/**
 * Create a todo from an issue (Wave 3c).
 */
const convertToTodoSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  issueId: z.string().uuid("Invalid issue"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid due date")
    .nullable()
    .optional(),
  markDiscussing: z.boolean().optional(),
});

export async function convertToTodo(
  input: unknown,
): Promise<ConvertToTodoResult> {
  const parsed = convertToTodoSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid convert request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditResource(actor.orgRole, "issues")) {
    return {
      success: false,
      error: "You do not have permission to convert issues to todos",
    };
  }

  const { data: issue } = await actor.supabase
    .from("issues")
    .select("id, title, owner_id, team_id, status")
    .eq("id", parsed.data.issueId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!issue) {
    return { success: false, error: "Issue not found" };
  }

  const ownerId = issue.owner_id ?? actor.user.id;

  const { data: todo, error: todoError } = await actor.supabase
    .from("todos")
    .insert({
      organization_id: parsed.data.organizationId,
      team_id: issue.team_id,
      title: issue.title,
      owner_id: ownerId,
      due_date: parsed.data.dueDate ?? null,
      status: "open",
      source_type: "issue",
      source_id: issue.id,
      created_by: actor.user.id,
    })
    .select("id")
    .single();

  if (todoError || !todo) {
    return {
      success: false,
      error: "Unable to create todo from issue. Please try again.",
    };
  }

  await logAuditEvent(actor.supabase, {
    organizationId: parsed.data.organizationId,
    actorId: actor.user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "todos",
    entityId: todo.id,
    metadata: {
      source_type: "issue",
      source_id: issue.id,
      title: issue.title,
    } as Json,
  });

  if (parsed.data.markDiscussing && issue.status === "open") {
    await actor.supabase
      .from("issues")
      .update({ status: "discussing" })
      .eq("id", issue.id)
      .eq("organization_id", parsed.data.organizationId);

    await writeAudit(
      actor.supabase,
      parsed.data.organizationId,
      actor.user.id,
      AUDIT_ACTIONS.UPDATE,
      issue.id,
      { status: "discussing", converted_to_todo: todo.id } as Json,
    );
  }

  const { data: orgRow } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (orgRow?.slug) {
    revalidatePath(`/org/${orgRow.slug}/issues`);
    revalidatePath(`/org/${orgRow.slug}/todos`);
  }

  return { success: true, todoId: todo.id };
}
