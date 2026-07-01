import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getOrgMemberOptions } from "@/lib/users/org-member-options";
import {
  ownerLabelFromProfiles,
  resolveOwnerProfiles,
} from "@/lib/users/owner-labels";
import { formatWorkItemIdentifier, isOpenWorkItemState } from "@/features/projects/utils";
import type {
  ProjectAnalytics,
  ProjectDetail,
  ProjectFilters,
  ProjectMemberOption,
  ProjectTeamOption,
  ProjectWithStats,
  WorkItemWithMeta,
} from "@/features/projects/types";
import type { ProjectWorkItem } from "@/features/projects/types";

export async function getProjectsForOrg(
  organizationId: string,
  filters: ProjectFilters = {},
): Promise<ProjectWithStats[]> {
  const supabase = await createClient();

  let query = supabase
    .from("projects")
    .select("*")
    .eq("organization_id", organizationId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!filters.includeArchived) {
    query = query.is("archived_at", null);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }

  const { data: projects, error } = await query;
  if (error || !projects) {
    return [];
  }

  const leadIds = projects.map((p) => p.lead_id).filter(Boolean) as string[];
  const leadProfiles = await resolveOwnerProfiles(leadIds);

  const projectIds = projects.map((p) => p.id);
  const { data: workItems } = await supabase
    .from("project_work_items")
    .select("project_id, state")
    .in("project_id", projectIds)
    .is("archived_at", null);

  const counts = new Map<string, { total: number; open: number }>();
  for (const id of projectIds) {
    counts.set(id, { total: 0, open: 0 });
  }
  for (const item of workItems ?? []) {
    const bucket = counts.get(item.project_id);
    if (!bucket) continue;
    bucket.total += 1;
    if (isOpenWorkItemState(item.state)) {
      bucket.open += 1;
    }
  }

  return projects.map((project) => {
    const stats = counts.get(project.id) ?? { total: 0, open: 0 };
    return {
      ...project,
      workItemCount: stats.total,
      openWorkItemCount: stats.open,
      leadLabel: project.lead_id
        ? ownerLabelFromProfiles(leadProfiles, project.lead_id)
        : null,
    };
  });
}

export async function searchProjectsAndWorkItems(
  organizationId: string,
  query: string,
  limit = 20,
) {
  const supabase = await createClient();
  const q = query.trim();
  if (!q) {
    return { projects: [], workItems: [] };
  }

  const [{ data: projects }, { data: workItemsRaw }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, slug")
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .ilike("title", `%${q}%`)
      .limit(limit),
    supabase
      .from("project_work_items")
      .select("id, title, sequence_number, project_id")
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .ilike("title", `%${q}%`)
      .limit(limit),
  ]);

  const projectMap = new Map(
    (projects ?? []).map((p) => [p.id, p]),
  );
  const missingProjectIds = [
    ...new Set(
      (workItemsRaw ?? [])
        .map((w) => w.project_id)
        .filter((id) => !projectMap.has(id)),
    ),
  ];
  if (missingProjectIds.length > 0) {
    const { data: extraProjects } = await supabase
      .from("projects")
      .select("id, title, slug, identifier_prefix")
      .in("id", missingProjectIds);
    for (const p of extraProjects ?? []) {
      projectMap.set(p.id, p);
    }
  }

  return {
    projects: projects ?? [],
    workItems: (workItemsRaw ?? []).map((row) => {
      const project = projectMap.get(row.project_id) as
        | { identifier_prefix?: string; slug: string }
        | undefined;
      return {
        id: row.id,
        title: row.title,
        projectSlug: project?.slug ?? "",
        identifier: project?.identifier_prefix
          ? formatWorkItemIdentifier(project.identifier_prefix, row.sequence_number)
          : row.id.slice(0, 8),
      };
    }),
  };
}

const getProjectBySlugCached = cache(
  async (organizationId: string, projectSlug: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("slug", projectSlug)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data;
  },
);

export async function getProjectBySlug(
  organizationId: string,
  projectSlug: string,
) {
  return getProjectBySlugCached(organizationId, projectSlug);
}

async function mapWorkItems(
  items: ProjectWorkItem[],
  identifierPrefix: string,
): Promise<WorkItemWithMeta[]> {
  const assigneeProfiles = await resolveOwnerProfiles(
    items.map((item) => item.assignee_id),
  );

  const moduleIds = [...new Set(items.map((i) => i.module_id).filter(Boolean))];
  const cycleIds = [...new Set(items.map((i) => i.cycle_id).filter(Boolean))];

  const supabase = await createClient();

  const [{ data: modules }, { data: cycles }] = await Promise.all([
    moduleIds.length
      ? supabase.from("project_modules").select("id, name").in("id", moduleIds as string[])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    cycleIds.length
      ? supabase.from("project_cycles").select("id, name").in("id", cycleIds as string[])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const moduleMap = new Map((modules ?? []).map((m) => [m.id, m.name]));
  const cycleMap = new Map((cycles ?? []).map((c) => [c.id, c.name]));

  const workItemIds = items.map((i) => i.id);
  const labelIds = new Set<string>();
  const labelLinksByItem = new Map<string, string[]>();

  if (workItemIds.length > 0) {
    const { data: labelLinks } = await supabase
      .from("project_work_item_labels")
      .select("work_item_id, label_id")
      .in("work_item_id", workItemIds);

    for (const link of labelLinks ?? []) {
      labelIds.add(link.label_id);
      const list = labelLinksByItem.get(link.work_item_id) ?? [];
      list.push(link.label_id);
      labelLinksByItem.set(link.work_item_id, list);
    }
  }

  const { data: labelRows } = labelIds.size
    ? await supabase
        .from("project_labels")
        .select("id, name")
        .in("id", [...labelIds])
    : { data: [] as { id: string; name: string }[] };

  const labelNameMap = new Map((labelRows ?? []).map((l) => [l.id, l.name]));

  return items.map((item) => ({
    ...item,
    identifier: formatWorkItemIdentifier(identifierPrefix, item.sequence_number),
    assignee: {
      userId: item.assignee_id,
      label: item.assignee_id
        ? ownerLabelFromProfiles(assigneeProfiles, item.assignee_id)
        : "Unassigned",
      email: item.assignee_id
        ? (assigneeProfiles.get(item.assignee_id)?.email ?? null)
        : null,
    },
    moduleName: item.module_id ? (moduleMap.get(item.module_id) ?? null) : null,
    cycleName: item.cycle_id ? (cycleMap.get(item.cycle_id) ?? null) : null,
    labelIds: labelLinksByItem.get(item.id) ?? [],
    labelNames: (labelLinksByItem.get(item.id) ?? [])
      .map((id) => labelNameMap.get(id))
      .filter((name): name is string => Boolean(name)),
  }));
}

export async function getProjectDetail(
  organizationId: string,
  projectSlug: string,
): Promise<ProjectDetail | null> {
  const project = await getProjectBySlug(organizationId, projectSlug);
  if (!project) {
    return null;
  }

  const supabase = await createClient();

  const [
    { data: modules },
    { data: cycles },
    { data: labels },
    { data: views },
    { data: workItems },
    { data: pages },
    { data: issueLinks },
    { data: rockLinks },
    { data: todoLinks },
  ] = await Promise.all([
    supabase
      .from("project_modules")
      .select("*")
      .eq("project_id", project.id)
      .order("display_order", { ascending: true }),
    supabase
      .from("project_cycles")
      .select("*")
      .eq("project_id", project.id)
      .order("start_date", { ascending: false }),
    supabase
      .from("project_labels")
      .select("*")
      .eq("project_id", project.id)
      .order("name", { ascending: true }),
    supabase
      .from("project_views")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_work_items")
      .select("*")
      .eq("project_id", project.id)
      .is("archived_at", null)
      .order("display_order", { ascending: true })
      .order("sequence_number", { ascending: true }),
    supabase
      .from("project_pages")
      .select("*")
      .eq("project_id", project.id)
      .is("archived_at", null)
      .order("display_order", { ascending: true }),
    supabase
      .from("project_issue_links")
      .select("issue_id")
      .eq("project_id", project.id),
    supabase
      .from("project_rock_links")
      .select("rock_id")
      .eq("project_id", project.id),
    supabase
      .from("project_todo_links")
      .select("todo_id")
      .eq("project_id", project.id),
  ]);

  const issueIds = (issueLinks ?? []).map((r) => r.issue_id);
  const rockIds = (rockLinks ?? []).map((r) => r.rock_id);
  const todoIds = (todoLinks ?? []).map((r) => r.todo_id);

  const [{ data: issues }, { data: rocks }, { data: todos }] = await Promise.all([
    issueIds.length
      ? supabase
          .from("issues")
          .select("id, title, team_id, teams(slug)")
          .in("id", issueIds)
      : Promise.resolve({ data: [] }),
    rockIds.length
      ? supabase.from("rocks").select("id, title").in("id", rockIds)
      : Promise.resolve({ data: [] }),
    todoIds.length
      ? supabase.from("todos").select("id, title").in("id", todoIds)
      : Promise.resolve({ data: [] }),
  ]);

  const leadProfiles = await resolveOwnerProfiles([project.lead_id]);
  const mappedWorkItems = await mapWorkItems(
    workItems ?? [],
    project.identifier_prefix,
  );

  return {
    ...project,
    leadLabel: project.lead_id
      ? ownerLabelFromProfiles(leadProfiles, project.lead_id)
      : null,
    modules: modules ?? [],
    cycles: cycles ?? [],
    labels: labels ?? [],
    views: views ?? [],
    workItems: mappedWorkItems,
    pages: pages ?? [],
    linkedIssues: (issues ?? []).map((issue) => ({
      id: issue.id,
      title: issue.title,
      teamSlug: (issue.teams as { slug: string } | null)?.slug ?? null,
    })),
    linkedRocks: (rocks ?? []).map((rock) => ({
      id: rock.id,
      title: rock.title,
    })),
    linkedTodos: (todos ?? []).map((todo) => ({
      id: todo.id,
      title: todo.title,
    })),
  };
}

export async function getProjectAnalytics(
  organizationId: string,
  projectId: string,
): Promise<ProjectAnalytics> {
  const supabase = await createClient();

  const [{ data: cycles }, { data: workItems }] = await Promise.all([
    supabase
      .from("project_cycles")
      .select("*")
      .eq("project_id", projectId)
      .order("start_date", { ascending: true }),
    supabase
      .from("project_work_items")
      .select("state, cycle_id, assignee_id, updated_at, created_at")
      .eq("project_id", projectId)
      .is("archived_at", null),
  ]);

  const currentCycle =
    cycles?.find((c) => c.status === "current") ?? cycles?.[0] ?? null;

  const cycleItems = currentCycle
    ? (workItems ?? []).filter((w) => w.cycle_id === currentCycle.id)
    : (workItems ?? []);

  const completed = cycleItems.filter((w) => w.state === "completed").length;
  const total = cycleItems.length;

  const burndown: ProjectAnalytics["burndown"] = [];
  if (currentCycle?.start_date && currentCycle?.end_date) {
    const start = new Date(currentCycle.start_date);
    const end = new Date(currentCycle.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const completedByDate = cycleItems.filter(
        (w) =>
          w.state === "completed" &&
          (w.updated_at?.slice(0, 10) ?? "") <= dateStr,
      ).length;
      burndown.push({
        date: dateStr,
        completed: completedByDate,
        remaining: Math.max(total - completedByDate, 0),
      });
    }
  }

  const velocity: ProjectAnalytics["velocity"] = (cycles ?? []).map((cycle) => ({
    cycleName: cycle.name,
    completed: (workItems ?? []).filter(
      (w) => w.cycle_id === cycle.id && w.state === "completed",
    ).length,
  }));

  const assigneeProfiles = await resolveOwnerProfiles(
    (workItems ?? []).map((w) => w.assignee_id),
  );
  const workloadMap = new Map<string, number>();
  for (const item of workItems ?? []) {
    if (!isOpenWorkItemState(item.state)) continue;
    const key = item.assignee_id ?? "unassigned";
    workloadMap.set(key, (workloadMap.get(key) ?? 0) + 1);
  }

  const workload: ProjectAnalytics["workload"] = [...workloadMap.entries()].map(
    ([userId, count]) => ({
      assigneeLabel:
        userId === "unassigned"
          ? "Unassigned"
          : ownerLabelFromProfiles(assigneeProfiles, userId),
      count,
    }),
  );

  return {
    burndown,
    velocity,
    workload,
    cycleProgress: {
      total,
      completed,
      cycleName: currentCycle?.name ?? null,
    },
  };
}

export async function getOrgMembersForProjects(
  organizationId: string,
): Promise<ProjectMemberOption[]> {
  return getOrgMemberOptions(organizationId);
}

export async function getOrgTeamsForProjects(
  organizationId: string,
): Promise<ProjectTeamOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, slug")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }
  return data;
}

export async function getLinkableIssues(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("id, title, teams(slug)")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("title", { ascending: true })
    .limit(100);
  return data ?? [];
}

export async function getLinkableRocks(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rocks")
    .select("id, title")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("title", { ascending: true })
    .limit(100);
  return data ?? [];
}

export async function getLinkableTodos(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("todos")
    .select("id, title")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("title", { ascending: true })
    .limit(100);
  return data ?? [];
}
