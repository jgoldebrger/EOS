import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { getOrgMemberOptions } from "@/lib/users/org-member-options";
import {
  ownerLabelFromProfiles,
  resolveOwnerProfiles,
} from "@/lib/users/owner-labels";
import { formatLoadLabel } from "@/features/transport/utils";
import type {
  LinkedIssue,
  LinkedProject,
  LinkedTodo,
  TransportLoadWithMeta,
  TransportMemberOption,
  TransportWorkspaceData,
} from "@/features/transport/types";
import type { TransportLoad, TransportStop } from "@/features/transport/types";

type RouteSummary = {
  load_id: string;
  id: string;
  route_data: Json;
  total_distance_meters: number | null;
  total_duration_seconds: number | null;
  optimized_at: string;
};

export async function getTransportMembers(
  organizationId: string,
): Promise<TransportMemberOption[]> {
  return getOrgMemberOptions(organizationId);
}

async function mapLoads(
  loads: TransportLoad[],
  stops: TransportStop[],
  carriers: { id: string; name: string }[],
  depots: { id: string; name: string }[],
  routes: RouteSummary[],
  linksByLoad: Map<
    string,
    {
      linkedProjects: LinkedProject[];
      linkedIssues: LinkedIssue[];
      linkedTodos: LinkedTodo[];
    }
  > = new Map(),
): Promise<TransportLoadWithMeta[]> {
  const carrierMap = new Map(carriers.map((c) => [c.id, c.name]));
  const depotMap = new Map(depots.map((d) => [d.id, d.name]));
  const driverIds = loads.map((l) => l.driver_id).filter(Boolean) as string[];
  const driverProfiles = await resolveOwnerProfiles(driverIds);

  const stopsByLoad = new Map<string, TransportStop[]>();
  for (const stop of stops) {
    const list = stopsByLoad.get(stop.load_id) ?? [];
    list.push(stop);
    stopsByLoad.set(stop.load_id, list);
  }
  for (const [, list] of stopsByLoad) {
    list.sort((a, b) => a.sequence_number - b.sequence_number);
  }

  const routeByLoad = new Map(routes.map((r) => [r.load_id, r]));

  return loads.map((load) => {
    const loadStops = stopsByLoad.get(load.id) ?? [];
    const route = routeByLoad.get(load.id);
    return {
      ...load,
      loadLabel: formatLoadLabel(load.load_number),
      carrierName: load.carrier_id ? (carrierMap.get(load.carrier_id) ?? null) : null,
      driverLabel: load.driver_id
        ? ownerLabelFromProfiles(driverProfiles, load.driver_id)
        : null,
      depotName: load.depot_id ? (depotMap.get(load.depot_id) ?? null) : null,
      stopCount: loadStops.length,
      stops: loadStops,
      latestRoute: route
        ? {
            id: route.id,
            organization_id: load.organization_id,
            load_id: load.id,
            route_data: route.route_data,
            total_distance_meters: route.total_distance_meters,
            total_duration_seconds: route.total_duration_seconds,
            optimized_at: route.optimized_at,
            created_by: null,
          }
        : null,
      ...(linksByLoad.get(load.id) ?? {
        linkedProjects: [],
        linkedIssues: [],
        linkedTodos: [],
      }),
    };
  });
}

export async function getTransportWorkspace(
  organizationId: string,
): Promise<TransportWorkspaceData> {
  const supabase = await createClient();

  const [
    { data: loads },
    { data: carriers },
    { data: depots },
    { data: analyses },
  ] = await Promise.all([
    supabase
      .from("transport_loads")
      .select("*")
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .order("load_number", { ascending: false }),
    supabase
      .from("transport_carriers")
      .select("*")
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("transport_depots")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("transport_analyses")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const loadList = loads ?? [];
  const loadIds = loadList.map((l) => l.id);

  const [{ data: stops }, { data: routes }] = await Promise.all([
    loadIds.length
      ? supabase
          .from("transport_stops")
          .select("*")
          .in("load_id", loadIds)
          .order("sequence_number", { ascending: true })
      : Promise.resolve({ data: [] as TransportStop[] }),
    loadIds.length
      ? supabase
          .from("transport_routes")
          .select("load_id, id, route_data, total_distance_meters, total_duration_seconds, optimized_at")
          .in("load_id", loadIds)
          .order("optimized_at", { ascending: false })
      : Promise.resolve({ data: [] as RouteSummary[] }),
  ]);

  const latestRoutes = new Map<string, RouteSummary>();
  for (const route of routes ?? []) {
    if (!latestRoutes.has(route.load_id)) {
      latestRoutes.set(route.load_id, route);
    }
  }

  const mappedLoads = await mapLoads(
    loadList,
    stops ?? [],
    (carriers ?? []).map((c) => ({ id: c.id, name: c.name })),
    (depots ?? []).map((d) => ({ id: d.id, name: d.name })),
    [...latestRoutes.values()],
  );

  return {
    loads: mappedLoads,
    carriers: carriers ?? [],
    depots: depots ?? [],
    analyses: analyses ?? [],
  };
}

export async function getTransportLoadDetail(
  organizationId: string,
  loadId: string,
): Promise<TransportLoadWithMeta | null> {
  const supabase = await createClient();

  const { data: load } = await supabase
    .from("transport_loads")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", loadId)
    .maybeSingle();

  if (!load) return null;

  const [{ data: stops }, { data: carriers }, { data: depots }, { data: routes }, links] =
    await Promise.all([
      supabase
        .from("transport_stops")
        .select("*")
        .eq("load_id", loadId)
        .order("sequence_number", { ascending: true }),
      supabase
        .from("transport_carriers")
        .select("id, name")
        .eq("organization_id", organizationId),
      supabase
        .from("transport_depots")
        .select("id, name, latitude, longitude")
        .eq("organization_id", organizationId),
      supabase
        .from("transport_routes")
        .select("load_id, id, route_data, total_distance_meters, total_duration_seconds, optimized_at")
        .eq("load_id", loadId)
        .order("optimized_at", { ascending: false })
        .limit(1),
      fetchLoadLinks(supabase, loadId),
    ]);

  const linksByLoad = new Map([[loadId, links]]);

  const mapped = await mapLoads(
    [load],
    stops ?? [],
    carriers ?? [],
    depots ?? [],
    routes ?? [],
    linksByLoad,
  );
  return mapped[0] ?? null;
}

async function fetchLoadLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  loadId: string,
): Promise<{
  linkedProjects: LinkedProject[];
  linkedIssues: LinkedIssue[];
  linkedTodos: LinkedTodo[];
}> {
  const [{ data: projectLinks }, { data: issueLinks }, { data: todoLinks }] =
    await Promise.all([
      supabase
        .from("transport_project_links")
        .select("project_id")
        .eq("load_id", loadId),
      supabase
        .from("transport_issue_links")
        .select("issue_id")
        .eq("load_id", loadId),
      supabase
        .from("transport_todo_links")
        .select("todo_id")
        .eq("load_id", loadId),
    ]);

  const projectIds = (projectLinks ?? []).map((r) => r.project_id);
  const issueIds = (issueLinks ?? []).map((r) => r.issue_id);
  const todoIds = (todoLinks ?? []).map((r) => r.todo_id);

  const [{ data: projects }, { data: issues }, { data: todos }] = await Promise.all([
    projectIds.length
      ? supabase.from("projects").select("id, title, slug").in("id", projectIds)
      : Promise.resolve({ data: [] as LinkedProject[] }),
    issueIds.length
      ? supabase
          .from("issues")
          .select("id, title, teams(slug)")
          .in("id", issueIds)
      : Promise.resolve({ data: [] }),
    todoIds.length
      ? supabase.from("todos").select("id, title").in("id", todoIds)
      : Promise.resolve({ data: [] as LinkedTodo[] }),
  ]);

  const linkedProjects: LinkedProject[] = (projects ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
  }));

  const linkedIssues: LinkedIssue[] = (issues ?? []).map((issue) => ({
    id: issue.id,
    title: issue.title,
    teamSlug: (issue.teams as { slug: string } | null)?.slug ?? null,
  }));

  const linkedTodos: LinkedTodo[] = todos ?? [];

  return { linkedProjects, linkedIssues, linkedTodos };
}

export async function getLinkableEntitiesForTransport(organizationId: string) {
  const supabase = await createClient();

  const [{ data: projects }, { data: issues }, { data: todos }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, slug")
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .order("title", { ascending: true })
      .limit(50),
    supabase
      .from("issues")
      .select("id, title, teams(slug)")
      .eq("organization_id", organizationId)
      .neq("status", "archived")
      .order("title", { ascending: true })
      .limit(50),
    supabase
      .from("todos")
      .select("id, title")
      .eq("organization_id", organizationId)
      .neq("status", "cancelled")
      .order("title", { ascending: true })
      .limit(50),
  ]);

  return {
    projects: projects ?? [],
    issues: (issues ?? []).map((i) => ({
      id: i.id,
      title: i.title,
      teamSlug: (i.teams as { slug: string } | null)?.slug ?? null,
    })),
    todos: todos ?? [],
  };
}

export async function searchTransportLoads(
  organizationId: string,
  query: string,
  limit = 10,
) {
  const supabase = await createClient();
  const q = query.trim();
  if (!q) return [];

  const loadNumber = Number(q.replace(/^ld-?/i, ""));
  let dbQuery = supabase
    .from("transport_loads")
    .select("id, load_number, customer_name, status")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .limit(limit);

  if (!Number.isNaN(loadNumber) && loadNumber > 0) {
    dbQuery = dbQuery.or(
      `customer_name.ilike.%${q}%,load_number.eq.${loadNumber}`,
    );
  } else {
    dbQuery = dbQuery.ilike("customer_name", `%${q}%`);
  }

  const { data } = await dbQuery;
  return data ?? [];
}
