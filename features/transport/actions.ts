"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canEditResource } from "@/lib/permissions/checks";
import type { OrgRole } from "@/types/domain";
import type { Json, TablesInsert, TablesUpdate } from "@/types/database";
import {
  createCarrierSchema,
  createDepotSchema,
  createIsochroneAnalysisSchema,
  createLoadSchema,
  linkLoadEntitySchema,
  optimizeLoadRouteSchema,
  reorderStopsSchema,
  updateLoadSchema,
  updateStopStatusSchema,
} from "@/features/transport/schema";
import { geocodeAddress, geocodeStops } from "@/features/transport/geocode";
import { circleGeoJson } from "@/features/transport/utils";
import { nearestNeighborOrder, solveVroom } from "@/features/transport/vroom-client";
import type {
  CreateLoadResult,
  OptimizeRouteResult,
  TransportActionResult,
} from "@/features/transport/types";

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

function revalidateTransportPaths(orgSlug: string, loadId?: string) {
  after(() => {
    revalidatePath(`/org/${orgSlug}/transport`);
    if (loadId) {
      revalidatePath(`/org/${orgSlug}/transport/${loadId}`);
    }
  });
}

async function nextLoadNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
): Promise<number> {
  const { data } = await supabase
    .from("transport_loads")
    .select("load_number")
    .eq("organization_id", organizationId)
    .order("load_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.load_number ?? 0) + 1;
}

export async function createDepot(input: unknown): Promise<TransportActionResult> {
  const parsed = createDepotSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid depot" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) return { success: false, error: actor.error ?? "Unauthorized" };
  if (!canEditResource(actor.orgRole, "transport")) {
    return { success: false, error: "You do not have permission to create depots" };
  }

  let latitude = parsed.data.latitude ?? null;
  let longitude = parsed.data.longitude ?? null;
  if ((latitude == null || longitude == null) && parsed.data.address) {
    const geo = await geocodeAddress(parsed.data.address);
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
    }
  }

  const { error } = await actor.supabase.from("transport_depots").insert({
    organization_id: parsed.data.organizationId,
    name: parsed.data.name,
    address: parsed.data.address ?? null,
    latitude,
    longitude,
    created_by: actor.user.id,
  });

  if (error) {
    return { success: false, error: error.message ?? "Unable to create depot." };
  }

  revalidateTransportPaths(parsed.data.orgSlug);
  return { success: true };
}

export async function createCarrier(input: unknown): Promise<TransportActionResult> {
  const parsed = createCarrierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid carrier" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) return { success: false, error: actor.error ?? "Unauthorized" };
  if (!canEditResource(actor.orgRole, "transport")) {
    return { success: false, error: "You do not have permission to create carriers" };
  }

  const { error } = await actor.supabase.from("transport_carriers").insert({
    organization_id: parsed.data.organizationId,
    name: parsed.data.name,
    contact_name: parsed.data.contactName ?? null,
    contact_email: parsed.data.contactEmail || null,
    contact_phone: parsed.data.contactPhone ?? null,
    mc_number: parsed.data.mcNumber ?? null,
    notes: parsed.data.notes ?? null,
    created_by: actor.user.id,
  });

  if (error) {
    return { success: false, error: error.message ?? "Unable to create carrier." };
  }

  revalidateTransportPaths(parsed.data.orgSlug);
  return { success: true };
}

export async function createLoad(input: unknown): Promise<CreateLoadResult> {
  const parsed = createLoadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid load",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) return { success: false, error: actor.error ?? "Unauthorized" };
  if (!canEditResource(actor.orgRole, "transport")) {
    return { success: false, error: "You do not have permission to create loads" };
  }

  const loadNumber = await nextLoadNumber(actor.supabase, parsed.data.organizationId);

  const { data: load, error: loadError } = await actor.supabase
    .from("transport_loads")
    .insert({
      organization_id: parsed.data.organizationId,
      load_number: loadNumber,
      reference: parsed.data.reference ?? null,
      customer_name: parsed.data.customerName,
      customer_phone: parsed.data.customerPhone ?? null,
      carrier_id: parsed.data.carrierId ?? null,
      driver_id: parsed.data.driverId ?? null,
      depot_id: parsed.data.depotId ?? null,
      project_id: parsed.data.projectId ?? null,
      scheduled_date: parsed.data.scheduledDate ?? null,
      notes: parsed.data.notes ?? null,
      status: "quote",
      created_by: actor.user.id,
    })
    .select("id")
    .single();

  if (loadError || !load) {
    return {
      success: false,
      error: loadError?.message ?? "Unable to create load.",
    };
  }

  const geocodedStops = await geocodeStops(parsed.data.stops);

  const stopRows: TablesInsert<"transport_stops">[] = geocodedStops.map(
    (stop, index) => ({
      organization_id: parsed.data.organizationId,
      load_id: load.id,
      sequence_number: index + 1,
      stop_type: stop.stopType,
      address: stop.address,
      latitude: stop.latitude ?? null,
      longitude: stop.longitude ?? null,
      contact_name: stop.contactName ?? null,
      contact_phone: stop.contactPhone ?? null,
      service_duration_minutes: stop.serviceDurationMinutes ?? 5,
      status: "pending",
    }),
  );

  const { error: stopsError } = await actor.supabase
    .from("transport_stops")
    .insert(stopRows);

  if (stopsError) {
    return { success: false, error: stopsError.message ?? "Unable to create stops." };
  }

  revalidateTransportPaths(parsed.data.orgSlug, load.id);
  return { success: true, loadId: load.id };
}

export async function updateLoad(input: unknown): Promise<TransportActionResult> {
  const parsed = updateLoadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid load" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) return { success: false, error: actor.error ?? "Unauthorized" };
  if (!canEditResource(actor.orgRole, "transport")) {
    return { success: false, error: "You do not have permission to update loads" };
  }

  const patch: TablesUpdate<"transport_loads"> = {};
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.customerName !== undefined) patch.customer_name = parsed.data.customerName;
  if (parsed.data.customerPhone !== undefined) {
    patch.customer_phone = parsed.data.customerPhone ?? null;
  }
  if (parsed.data.reference !== undefined) patch.reference = parsed.data.reference ?? null;
  if (parsed.data.carrierId !== undefined) patch.carrier_id = parsed.data.carrierId;
  if (parsed.data.driverId !== undefined) patch.driver_id = parsed.data.driverId;
  if (parsed.data.depotId !== undefined) patch.depot_id = parsed.data.depotId;
  if (parsed.data.scheduledDate !== undefined) {
    patch.scheduled_date = parsed.data.scheduledDate ?? null;
  }
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes ?? null;

  const { error } = await actor.supabase
    .from("transport_loads")
    .update(patch)
    .eq("id", parsed.data.loadId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return { success: false, error: error.message ?? "Unable to update load." };
  }

  revalidateTransportPaths(parsed.data.orgSlug, parsed.data.loadId);
  return { success: true };
}

export async function optimizeLoadRoute(
  input: unknown,
): Promise<OptimizeRouteResult> {
  const parsed = optimizeLoadRouteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) return { success: false, error: actor.error ?? "Unauthorized" };
  if (!canEditResource(actor.orgRole, "transport")) {
    return { success: false, error: "You do not have permission to optimize routes" };
  }

  const { data: load } = await actor.supabase
    .from("transport_loads")
    .select("id, depot_id")
    .eq("id", parsed.data.loadId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!load) {
    return { success: false, error: "Load not found." };
  }

  const [{ data: stops }, { data: depot }] = await Promise.all([
    actor.supabase
      .from("transport_stops")
      .select("id, latitude, longitude, service_duration_minutes, sequence_number")
      .eq("load_id", parsed.data.loadId)
      .order("sequence_number", { ascending: true }),
    load.depot_id
      ? actor.supabase
          .from("transport_depots")
          .select("latitude, longitude")
          .eq("id", load.depot_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!stops?.length) {
    return { success: false, error: "Add stops before optimizing." };
  }

  const geocodedStops = stops.filter(
    (s) => s.latitude != null && s.longitude != null,
  ) as Array<{
    id: string;
    latitude: number;
    longitude: number;
    service_duration_minutes: number;
  }>;

  if (geocodedStops.length !== stops.length) {
    return {
      success: false,
      error: "All stops need latitude and longitude for route optimization.",
    };
  }

  let depotCoord: [number, number];
  if (depot?.latitude != null && depot?.longitude != null) {
    depotCoord = [depot.longitude, depot.latitude];
  } else {
    depotCoord = [geocodedStops[0].longitude, geocodedStops[0].latitude];
  }

  const jobs = geocodedStops.map((stop, index) => ({
    id: index + 1,
    location: [stop.longitude, stop.latitude] as [number, number],
    service: (stop.service_duration_minutes ?? 5) * 60,
  }));

  const stopIdByJobId = new Map(
    geocodedStops.map((stop, index) => [index + 1, stop.id]),
  );

  let orderedStopIds: string[];
  let totalDistance: number | null = null;
  let totalDuration: number | null = null;
  let usedVroom = false;

  const solution = await solveVroom({
    jobs,
    vehicles: [{ id: 1, start: depotCoord, end: depotCoord }],
  });

  if (solution?.routes?.[0]) {
    usedVroom = true;
    const route = solution.routes[0];
    totalDistance = route.distance;
    totalDuration = route.duration;
    orderedStopIds = route.steps
      .filter((step) => step.type === "job" && step.job != null)
      .map((step) => stopIdByJobId.get(step.job!)!)
      .filter(Boolean);
  } else {
    orderedStopIds = nearestNeighborOrder(
      depotCoord,
      geocodedStops.map((s) => ({
        id: s.id,
        location: [s.longitude, s.latitude] as [number, number],
      })),
    );
  }

  for (let i = 0; i < orderedStopIds.length; i++) {
    await actor.supabase
      .from("transport_stops")
      .update({ sequence_number: i + 1 })
      .eq("id", orderedStopIds[i]);
  }

  const routeData = {
    orderedStopIds,
    depot: depotCoord,
    engine: usedVroom ? "vroom" : "nearest_neighbor",
  };

  const { data: routeRow, error: routeError } = await actor.supabase
    .from("transport_routes")
    .insert({
      organization_id: parsed.data.organizationId,
      load_id: parsed.data.loadId,
      route_data: routeData as Json,
      total_distance_meters: totalDistance,
      total_duration_seconds: totalDuration,
      created_by: actor.user.id,
    })
    .select("id")
    .single();

  if (routeError || !routeRow) {
    return { success: false, error: routeError?.message ?? "Unable to save route." };
  }

  revalidateTransportPaths(parsed.data.orgSlug, parsed.data.loadId);
  return {
    success: true,
    routeId: routeRow.id,
    orderedStopIds,
    totalDistanceMeters: totalDistance,
    totalDurationSeconds: totalDuration,
  };
}

export async function createIsochroneAnalysis(
  input: unknown,
): Promise<TransportActionResult & { analysisId?: string }> {
  const parsed = createIsochroneAnalysisSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid analysis" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) return { success: false, error: actor.error ?? "Unauthorized" };
  if (!canEditResource(actor.orgRole, "transport")) {
    return { success: false, error: "You do not have permission to run analyses" };
  }

  const { data: depot } = await actor.supabase
    .from("transport_depots")
    .select("latitude, longitude, name")
    .eq("id", parsed.data.depotId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!depot?.latitude || !depot?.longitude) {
    return { success: false, error: "Depot needs coordinates for isochrone analysis." };
  }

  const { data: analysis, error: insertError } = await actor.supabase
    .from("transport_analyses")
    .insert({
      organization_id: parsed.data.organizationId,
      analysis_type: "isochrone",
      status: "running",
      params: {
        depotId: parsed.data.depotId,
        minutes: parsed.data.minutes,
      } as Json,
      created_by: actor.user.id,
    })
    .select("id")
    .single();

  if (insertError || !analysis) {
    return { success: false, error: insertError?.message ?? "Unable to start analysis." };
  }

  const workerUrl = process.env.FERROBUS_WORKER_URL;
  let result: Json | null = null;
  let errorMessage: string | null = null;

  if (workerUrl) {
    try {
      const response = await fetch(`${workerUrl}/isochrone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lng: depot.longitude,
          lat: depot.latitude,
          minutes: parsed.data.minutes,
        }),
        signal: AbortSignal.timeout(120_000),
      });
      if (response.ok) {
        result = (await response.json()) as Json;
      } else {
        errorMessage = `Worker returned ${response.status}`;
      }
    } catch {
      errorMessage = "Ferrobus worker unavailable";
    }
  }

  if (!result) {
    const lng = depot.longitude!;
    const lat = depot.latitude!;
    const features = parsed.data.minutes.map((minutes) => {
      const speedMps = 8.33;
      const radiusMeters = minutes * 60 * speedMps;
      return {
        type: "Feature",
        properties: { minutes, fallback: true },
        geometry: circleGeoJson(lng, lat, radiusMeters),
      };
    });
    result = {
      type: "FeatureCollection",
      features,
      depot: { name: depot.name, lng, lat },
      engine: workerUrl ? "fallback" : "approximate",
    } as Json;
  }

  const { error: updateError } = await actor.supabase
    .from("transport_analyses")
    .update({
      status: errorMessage && !result ? "failed" : "completed",
      result,
      error_message: errorMessage,
    })
    .eq("id", analysis.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidateTransportPaths(parsed.data.orgSlug);
  return { success: true, analysisId: analysis.id };
}

export async function reorderStops(input: unknown): Promise<TransportActionResult> {
  const parsed = reorderStopsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) return { success: false, error: actor.error ?? "Unauthorized" };
  if (!canEditResource(actor.orgRole, "transport")) {
    return { success: false, error: "You do not have permission to reorder stops" };
  }

  for (let i = 0; i < parsed.data.stopIds.length; i++) {
    const { error } = await actor.supabase
      .from("transport_stops")
      .update({ sequence_number: i + 1 })
      .eq("id", parsed.data.stopIds[i])
      .eq("load_id", parsed.data.loadId);
    if (error) {
      return { success: false, error: error.message ?? "Unable to reorder stops." };
    }
  }

  revalidateTransportPaths(parsed.data.orgSlug, parsed.data.loadId);
  return { success: true };
}

export async function updateStopStatus(input: unknown): Promise<TransportActionResult> {
  const parsed = updateStopStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) return { success: false, error: actor.error ?? "Unauthorized" };
  if (!canEditResource(actor.orgRole, "transport")) {
    return { success: false, error: "You do not have permission to update stops" };
  }

  const { error } = await actor.supabase
    .from("transport_stops")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.stopId)
    .eq("load_id", parsed.data.loadId);

  if (error) {
    return { success: false, error: error.message ?? "Unable to update stop." };
  }

  revalidateTransportPaths(parsed.data.orgSlug, parsed.data.loadId);
  return { success: true };
}

async function linkLoadEntity(
  actor: {
    supabase: Awaited<ReturnType<typeof createClient>>;
    user: { id: string };
  },
  table: "transport_project_links" | "transport_issue_links" | "transport_todo_links",
  column: "project_id" | "issue_id" | "todo_id",
  loadId: string,
  entityId: string,
) {
  const base = { load_id: loadId, created_by: actor.user.id };
  if (table === "transport_project_links" && column === "project_id") {
    return actor.supabase.from(table).insert({ ...base, project_id: entityId });
  }
  if (table === "transport_issue_links" && column === "issue_id") {
    return actor.supabase.from(table).insert({ ...base, issue_id: entityId });
  }
  return actor.supabase.from("transport_todo_links").insert({ ...base, todo_id: entityId });
}

export async function linkProjectToLoad(input: unknown): Promise<TransportActionResult> {
  const parsed = linkLoadEntitySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request" };

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) return { success: false, error: actor.error ?? "Unauthorized" };
  if (!canEditResource(actor.orgRole, "transport")) {
    return { success: false, error: "You do not have permission to link projects" };
  }

  const { error } = await linkLoadEntity(
    actor,
    "transport_project_links",
    "project_id",
    parsed.data.loadId,
    parsed.data.entityId,
  );
  if (error) return { success: false, error: error.message ?? "Unable to link project." };

  revalidateTransportPaths(parsed.data.orgSlug, parsed.data.loadId);
  return { success: true };
}

export async function linkIssueToLoad(input: unknown): Promise<TransportActionResult> {
  const parsed = linkLoadEntitySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request" };

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) return { success: false, error: actor.error ?? "Unauthorized" };
  if (!canEditResource(actor.orgRole, "transport")) {
    return { success: false, error: "You do not have permission to link issues" };
  }

  const { error } = await linkLoadEntity(
    actor,
    "transport_issue_links",
    "issue_id",
    parsed.data.loadId,
    parsed.data.entityId,
  );
  if (error) return { success: false, error: error.message ?? "Unable to link issue." };

  revalidateTransportPaths(parsed.data.orgSlug, parsed.data.loadId);
  return { success: true };
}

export async function linkTodoToLoad(input: unknown): Promise<TransportActionResult> {
  const parsed = linkLoadEntitySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request" };

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) return { success: false, error: actor.error ?? "Unauthorized" };
  if (!canEditResource(actor.orgRole, "transport")) {
    return { success: false, error: "You do not have permission to link todos" };
  }

  const { error } = await linkLoadEntity(
    actor,
    "transport_todo_links",
    "todo_id",
    parsed.data.loadId,
    parsed.data.entityId,
  );
  if (error) return { success: false, error: error.message ?? "Unable to link todo." };

  revalidateTransportPaths(parsed.data.orgSlug, parsed.data.loadId);
  return { success: true };
}

export async function searchTransportForNav(
  organizationId: string,
  query: string,
) {
  const { searchTransportLoads } = await import("@/features/transport/queries");
  return searchTransportLoads(organizationId, query);
}
