"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canEditResource } from "@/lib/permissions/checks";
import { logAuditEvent } from "@/lib/audit";
import { AUDIT_ACTIONS, type OrgRole } from "@/types/domain";
import type { Json, TablesUpdate } from "@/types/database";
import {
  archiveProjectSchema,
  archiveWorkItemSchema,
  createCycleSchema,
  createModuleSchema,
  createProjectLabelSchema,
  createProjectPageSchema,
  createProjectSchema,
  createProjectViewSchema,
  createWorkItemSchema,
  linkEntitySchema,
  moveWorkItemStateSchema,
  projectSlugFromTitle,
  restoreProjectSchema,
  setWorkItemLabelsSchema,
  updateCycleSchema,
  updateProjectPageSchema,
  updateProjectSchema,
  updateWorkItemSchema,
} from "@/features/projects/schema";
import type {
  CreateProjectResult,
  CreateWorkItemResult,
  ProjectActionResult,
} from "@/features/projects/types";

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

function revalidateProjectPaths(orgSlug: string, projectSlug?: string) {
  after(() => {
    revalidatePath(`/org/${orgSlug}/projects`);
    if (projectSlug) {
      revalidatePath(`/org/${orgSlug}/projects/${projectSlug}`);
    }
  });
}

async function nextWorkItemSequence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<number> {
  const { data } = await supabase
    .from("project_work_items")
    .select("sequence_number")
    .eq("project_id", projectId)
    .order("sequence_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.sequence_number ?? 0) + 1;
}

async function uniqueProjectSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const { data } = await supabase
      .from("projects")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
}

export async function createProject(input: unknown): Promise<CreateProjectResult> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid project details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to create projects" };
  }

  const baseSlug = parsed.data.slug ?? projectSlugFromTitle(parsed.data.title);
  const slug = await uniqueProjectSlug(
    actor.supabase,
    parsed.data.organizationId,
    baseSlug,
  );

  const { data: project, error } = await actor.supabase
    .from("projects")
    .insert({
      organization_id: parsed.data.organizationId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      slug,
      identifier_prefix: parsed.data.identifierPrefix ?? "PROJ",
      team_id: parsed.data.teamId ?? null,
      lead_id: parsed.data.leadId ?? parsed.data.ownerId ?? actor.user.id,
      owner_id: parsed.data.ownerId ?? actor.user.id,
      start_date: parsed.data.startDate ?? null,
      target_date: parsed.data.targetDate ?? null,
      due_date: parsed.data.dueDate ?? null,
      color: parsed.data.color ?? null,
      created_by: actor.user.id,
    })
    .select("id, slug")
    .single();

  if (error || !project) {
    return { success: false, error: "Unable to create project. Please try again." };
  }

  await logAuditEvent(actor.supabase, {
    organizationId: parsed.data.organizationId,
    actorId: actor.user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "projects",
    entityId: project.id,
    metadata: { title: parsed.data.title, slug } as Json,
  });

  revalidateProjectPaths(parsed.data.orgSlug, project.slug);
  return { success: true, projectId: project.id, slug: project.slug };
}

export async function updateProject(input: unknown): Promise<ProjectActionResult> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid project details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to update projects" };
  }

  const patch: TablesUpdate<"projects"> = {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    team_id: parsed.data.teamId ?? null,
    lead_id: parsed.data.leadId ?? null,
    owner_id: parsed.data.ownerId ?? null,
    start_date: parsed.data.startDate ?? null,
    target_date: parsed.data.targetDate ?? null,
    due_date: parsed.data.dueDate ?? null,
    color: parsed.data.color ?? null,
    status: parsed.data.status,
  };

  const { data: project, error } = await actor.supabase
    .from("projects")
    .update(patch)
    .eq("id", parsed.data.projectId)
    .eq("organization_id", parsed.data.organizationId)
    .select("slug")
    .single();

  if (error || !project) {
    return { success: false, error: "Unable to update project." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, project.slug);
  return { success: true };
}

export async function archiveProject(input: unknown): Promise<ProjectActionResult> {
  const parsed = archiveProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to archive projects" };
  }

  const { data: project, error } = await actor.supabase
    .from("projects")
    .update({ archived_at: new Date().toISOString(), status: "cancelled" })
    .eq("id", parsed.data.projectId)
    .eq("organization_id", parsed.data.organizationId)
    .select("slug")
    .single();

  if (error || !project) {
    return { success: false, error: "Unable to archive project." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, project.slug);
  return { success: true };
}

export async function restoreProject(input: unknown): Promise<ProjectActionResult> {
  const parsed = restoreProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to restore projects" };
  }

  const { data: project, error } = await actor.supabase
    .from("projects")
    .update({ archived_at: null, status: "active" })
    .eq("id", parsed.data.projectId)
    .eq("organization_id", parsed.data.organizationId)
    .select("slug")
    .single();

  if (error || !project) {
    return { success: false, error: "Unable to restore project." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, project.slug);
  return { success: true };
}

export async function createWorkItem(input: unknown): Promise<CreateWorkItemResult> {
  const parsed = createWorkItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid work item",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to create work items" };
  }

  const sequenceNumber = await nextWorkItemSequence(
    actor.supabase,
    parsed.data.projectId,
  );

  const defaultState = parsed.data.state ?? "backlog";
  const assigneeId =
    parsed.data.assigneeId !== undefined
      ? parsed.data.assigneeId
      : defaultState === "triage"
        ? null
        : actor.user.id;

  let parentState = defaultState;
  let parentModuleId = parsed.data.moduleId ?? null;
  let parentCycleId = parsed.data.cycleId ?? null;

  if (parsed.data.parentId) {
    const { data: parent } = await actor.supabase
      .from("project_work_items")
      .select("id, state, module_id, cycle_id")
      .eq("id", parsed.data.parentId)
      .eq("project_id", parsed.data.projectId)
      .maybeSingle();

    if (!parent) {
      return { success: false, error: "Parent task not found." };
    }

    parentState = parsed.data.state ?? parent.state;
    parentModuleId = parsed.data.moduleId ?? parent.module_id;
    parentCycleId = parsed.data.cycleId ?? parent.cycle_id;
  }

  const { data: item, error } = await actor.supabase
    .from("project_work_items")
    .insert({
      organization_id: parsed.data.organizationId,
      project_id: parsed.data.projectId,
      parent_id: parsed.data.parentId ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      state: parentState,
      priority: parsed.data.priority ?? "none",
      assignee_id: assigneeId,
      module_id: parentModuleId,
      cycle_id: parentCycleId,
      due_date: parsed.data.dueDate ?? null,
      estimate_points: parsed.data.estimatePoints ?? null,
      sequence_number: sequenceNumber,
      created_by: actor.user.id,
    })
    .select("id")
    .single();

  if (error || !item) {
    return {
      success: false,
      error: error?.message ?? "Unable to create work item.",
    };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true, workItemId: item.id };
}

export async function updateWorkItem(input: unknown): Promise<ProjectActionResult> {
  const parsed = updateWorkItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid work item",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to update work items" };
  }

  const patch: TablesUpdate<"project_work_items"> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.description !== undefined) {
    patch.description = parsed.data.description ?? null;
  }
  if (parsed.data.state !== undefined) patch.state = parsed.data.state;
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;
  if (parsed.data.assigneeId !== undefined) {
    patch.assignee_id = parsed.data.assigneeId;
  }
  if (parsed.data.moduleId !== undefined) patch.module_id = parsed.data.moduleId;
  if (parsed.data.cycleId !== undefined) patch.cycle_id = parsed.data.cycleId;
  if (parsed.data.dueDate !== undefined) patch.due_date = parsed.data.dueDate ?? null;
  if (parsed.data.estimatePoints !== undefined) {
    patch.estimate_points = parsed.data.estimatePoints ?? null;
  }
  if (parsed.data.displayOrder !== undefined) {
    patch.display_order = parsed.data.displayOrder;
  }

  const { error } = await actor.supabase
    .from("project_work_items")
    .update(patch)
    .eq("id", parsed.data.workItemId)
    .eq("project_id", parsed.data.projectId);

  if (error) {
    return { success: false, error: "Unable to update work item." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

export async function moveWorkItemState(input: unknown): Promise<ProjectActionResult> {
  const parsed = moveWorkItemStateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to move work items" };
  }

  const patch: TablesUpdate<"project_work_items"> = {
    state: parsed.data.state,
    display_order: parsed.data.displayOrder,
  };

  const { error } = await actor.supabase
    .from("project_work_items")
    .update(patch)
    .eq("id", parsed.data.workItemId)
    .eq("project_id", parsed.data.projectId);

  if (error) {
    return { success: false, error: "Unable to move work item." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

export async function createModule(input: unknown): Promise<ProjectActionResult> {
  const parsed = createModuleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid module" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to create modules" };
  }

  const { error } = await actor.supabase.from("project_modules").insert({
    organization_id: parsed.data.organizationId,
    project_id: parsed.data.projectId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    created_by: actor.user.id,
  });

  if (error) {
    return { success: false, error: "Unable to create module." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

export async function createCycle(input: unknown): Promise<ProjectActionResult> {
  const parsed = createCycleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid cycle" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to create cycles" };
  }

  if (parsed.data.status === "current") {
    await actor.supabase
      .from("project_cycles")
      .update({ status: "upcoming" })
      .eq("project_id", parsed.data.projectId)
      .eq("status", "current");
  }

  const { error } = await actor.supabase.from("project_cycles").insert({
    organization_id: parsed.data.organizationId,
    project_id: parsed.data.projectId,
    name: parsed.data.name,
    start_date: parsed.data.startDate ?? null,
    end_date: parsed.data.endDate ?? null,
    status: parsed.data.status ?? "draft",
    created_by: actor.user.id,
  });

  if (error) {
    return { success: false, error: "Unable to create cycle." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

export async function updateCycle(input: unknown): Promise<ProjectActionResult> {
  const parsed = updateCycleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid cycle" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to update cycles" };
  }

  if (parsed.data.status === "current") {
    await actor.supabase
      .from("project_cycles")
      .update({ status: "upcoming" })
      .eq("project_id", parsed.data.projectId)
      .eq("status", "current");
  }

  const { error } = await actor.supabase
    .from("project_cycles")
    .update({
      name: parsed.data.name,
      start_date: parsed.data.startDate ?? null,
      end_date: parsed.data.endDate ?? null,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.cycleId)
    .eq("project_id", parsed.data.projectId);

  if (error) {
    return { success: false, error: "Unable to update cycle." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

export async function createProjectView(input: unknown): Promise<ProjectActionResult> {
  const parsed = createProjectViewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid view" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to create views" };
  }

  if (parsed.data.isDefault) {
    await actor.supabase
      .from("project_views")
      .update({ is_default: false })
      .eq("project_id", parsed.data.projectId);
  }

  const { error } = await actor.supabase.from("project_views").insert({
    organization_id: parsed.data.organizationId,
    project_id: parsed.data.projectId,
    name: parsed.data.name,
    display_type: parsed.data.displayType,
    filters: (parsed.data.filters ?? {}) as Json,
    is_default: parsed.data.isDefault ?? false,
    created_by: actor.user.id,
  });

  if (error) {
    return { success: false, error: "Unable to create view." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

export async function createProjectPage(input: unknown): Promise<ProjectActionResult> {
  const parsed = createProjectPageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid page" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to create pages" };
  }

  const { error } = await actor.supabase.from("project_pages").insert({
    organization_id: parsed.data.organizationId,
    project_id: parsed.data.projectId,
    title: parsed.data.title,
    content: parsed.data.content ?? "",
    content_format: parsed.data.contentFormat ?? "markdown",
    parent_id: parsed.data.parentId ?? null,
    created_by: actor.user.id,
  });

  if (error) {
    return { success: false, error: "Unable to create page." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

export async function updateProjectPage(input: unknown): Promise<ProjectActionResult> {
  const parsed = updateProjectPageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid page" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to update pages" };
  }

  const { error } = await actor.supabase
    .from("project_pages")
    .update({
      title: parsed.data.title,
      content: parsed.data.content ?? "",
      content_format: parsed.data.contentFormat ?? "markdown",
    })
    .eq("id", parsed.data.pageId)
    .eq("project_id", parsed.data.projectId);

  if (error) {
    return { success: false, error: "Unable to update page." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

export async function linkIssueToProject(input: unknown): Promise<ProjectActionResult> {
  const parsed = linkEntitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to link issues" };
  }

  const { error } = await actor.supabase.from("project_issue_links").insert({
    project_id: parsed.data.projectId,
    issue_id: parsed.data.entityId,
    created_by: actor.user.id,
  });

  if (error) {
    return { success: false, error: "Unable to link issue." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

export async function linkRockToProject(input: unknown): Promise<ProjectActionResult> {
  const parsed = linkEntitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to link rocks" };
  }

  const { error } = await actor.supabase.from("project_rock_links").insert({
    project_id: parsed.data.projectId,
    rock_id: parsed.data.entityId,
    created_by: actor.user.id,
  });

  if (error) {
    return { success: false, error: "Unable to link rock." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

export async function linkTodoToProject(input: unknown): Promise<ProjectActionResult> {
  const parsed = linkEntitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to link todos" };
  }

  const { error } = await actor.supabase.from("project_todo_links").insert({
    project_id: parsed.data.projectId,
    todo_id: parsed.data.entityId,
    created_by: actor.user.id,
  });

  if (error) {
    return { success: false, error: "Unable to link todo." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

export async function searchProjectsForNav(
  organizationId: string,
  query: string,
) {
  const { searchProjectsAndWorkItems } = await import(
    "@/features/projects/queries"
  );
  return searchProjectsAndWorkItems(organizationId, query);
}

export async function archiveWorkItem(input: unknown): Promise<ProjectActionResult> {
  const parsed = archiveWorkItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to archive work items" };
  }

  const { error } = await actor.supabase
    .from("project_work_items")
    .update({ archived_at: new Date().toISOString(), state: "cancelled" })
    .eq("id", parsed.data.workItemId)
    .eq("project_id", parsed.data.projectId);

  if (error) {
    return { success: false, error: "Unable to archive work item." };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

export async function createProjectLabel(input: unknown): Promise<ProjectActionResult> {
  const parsed = createProjectLabelSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid label" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to create labels" };
  }

  const { error } = await actor.supabase.from("project_labels").insert({
    organization_id: parsed.data.organizationId,
    project_id: parsed.data.projectId,
    name: parsed.data.name,
    color: parsed.data.color ?? null,
  });

  if (error) {
    return {
      success: false,
      error: error.code === "23505" ? "Label already exists" : "Unable to create label.",
    };
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

export async function setWorkItemLabels(input: unknown): Promise<ProjectActionResult> {
  const parsed = setWorkItemLabelsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }
  if (!canEditResource(actor.orgRole, "projects")) {
    return { success: false, error: "You do not have permission to update labels" };
  }

  await actor.supabase
    .from("project_work_item_labels")
    .delete()
    .eq("work_item_id", parsed.data.workItemId);

  if (parsed.data.labelIds.length > 0) {
    const { error } = await actor.supabase.from("project_work_item_labels").insert(
      parsed.data.labelIds.map((labelId) => ({
        work_item_id: parsed.data.workItemId,
        label_id: labelId,
      })),
    );
    if (error) {
      return { success: false, error: "Unable to update labels." };
    }
  }

  revalidateProjectPaths(parsed.data.orgSlug, parsed.data.projectSlug);
  return { success: true };
}

