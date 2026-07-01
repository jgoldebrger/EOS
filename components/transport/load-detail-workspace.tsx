"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, Route } from "lucide-react";
import {
  optimizeLoadRoute,
  reorderStops,
  updateLoad,
  updateStopStatus,
} from "@/features/transport/actions";
import { LOAD_STATUSES } from "@/features/transport/schema";
import type { TransportLoadWithMeta } from "@/features/transport/types";
import { formatLoadStatus, formatStopType } from "@/features/transport/utils";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { TransportLoadLinksPanel } from "@/components/transport/transport-load-links-panel";
import { TransportMap } from "@/components/transport/transport-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrgRole } from "@/types/domain";

interface LoadDetailWorkspaceProps {
  organizationId: string;
  orgSlug: string;
  orgRole: OrgRole;
  load: TransportLoadWithMeta;
  depots: Array<{ id: string; name: string; latitude?: number | null; longitude?: number | null }>;
  linkableProjects: Array<{ id: string; title: string; slug: string }>;
  linkableIssues: Array<{ id: string; title: string; teamSlug: string | null }>;
  linkableTodos: Array<{ id: string; title: string }>;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm";

export function LoadDetailWorkspace({
  organizationId,
  orgSlug,
  orgRole,
  load,
  depots,
  linkableProjects,
  linkableIssues,
  linkableTodos,
}: LoadDetailWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const canEdit =
    orgRole === "owner" || orgRole === "admin" || orgRole === "member";

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const result = await updateLoad({
        organizationId,
        orgSlug,
        loadId: load.id,
        status: status as (typeof LOAD_STATUSES)[number],
      });
      if (!result.success) {
        showErrorToast("Could not update", result.error);
        return;
      }
      showSuccessToast("Load updated");
      router.refresh();
    });
  }

  function handleOptimize() {
    startTransition(async () => {
      const result = await optimizeLoadRoute({
        organizationId,
        orgSlug,
        loadId: load.id,
      });
      if (!result.success) {
        showErrorToast("Optimization failed", result.error);
        return;
      }
      showSuccessToast("Route optimized");
      router.refresh();
    });
  }

  function moveStop(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= load.stops.length) return;
    const ids = load.stops.map((s) => s.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    startTransition(async () => {
      const result = await reorderStops({
        organizationId,
        orgSlug,
        loadId: load.id,
        stopIds: ids,
      });
      if (!result.success) {
        showErrorToast("Could not reorder", result.error);
        return;
      }
      router.refresh();
    });
  }

  function markStopComplete(stopId: string) {
    startTransition(async () => {
      const result = await updateStopStatus({
        organizationId,
        orgSlug,
        loadId: load.id,
        stopId,
        status: "completed",
      });
      if (!result.success) {
        showErrorToast("Could not update stop", result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/org/${orgSlug}/transport`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Transport
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {load.loadLabel}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {load.customer_name ?? "Customer"}
            {load.depotName ? ` · Depot: ${load.depotName}` : ""}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" className="gap-1" onClick={handleOptimize} disabled={isPending}>
            <Route className="h-4 w-4" />
            Optimize route
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary" className="capitalize">
          {formatLoadStatus(load.status)}
        </Badge>
        {canEdit && (
          <select
            className={`${selectClassName} w-auto`}
            value={load.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isPending}
          >
            {LOAD_STATUSES.filter((s) => s !== "cancelled").map((s) => (
              <option key={s} value={s}>
                {formatLoadStatus(s)}
              </option>
            ))}
          </select>
        )}
        {load.latestRoute && (
          <span className="text-sm text-muted-foreground">
            Last optimized {new Date(load.latestRoute.optimized_at).toLocaleString()}
            {load.latestRoute.total_distance_meters != null &&
              ` · ${(load.latestRoute.total_distance_meters / 1000).toFixed(1)} km`}
          </span>
        )}
      </div>

      <TransportMap
        depots={depots.filter((d) => d.id === load.depot_id)}
        stops={load.stops}
        height={400}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stops ({load.stops.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {load.stops.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stops on this load.</p>
          ) : (
            load.stops.map((stop, index) => (
              <div
                key={stop.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    #{stop.sequence_number} {stop.address}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {formatStopType(stop.stop_type)} · {stop.status}
                    {stop.latitude != null && stop.longitude != null
                      ? ` · ${stop.latitude.toFixed(4)}, ${stop.longitude.toFixed(4)}`
                      : " · needs coordinates"}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={isPending || index === 0}
                      onClick={() => moveStop(index, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={isPending || index === load.stops.length - 1}
                      onClick={() => moveStop(index, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    {stop.status !== "completed" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => markStopComplete(stop.id)}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <TransportLoadLinksPanel
        organizationId={organizationId}
        orgSlug={orgSlug}
        load={load}
        linkableProjects={linkableProjects}
        linkableIssues={linkableIssues}
        linkableTodos={linkableTodos}
        canEdit={canEdit}
      />

      <div className="grid gap-4 sm:grid-cols-2 text-sm text-muted-foreground">
        <p>Driver: {load.driverLabel ?? "Unassigned"}</p>
        <p>Carrier: {load.carrierName ?? "None"}</p>
      </div>
    </div>
  );
}
