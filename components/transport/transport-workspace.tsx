"use client";

import { useState } from "react";
import { Plus, Truck } from "lucide-react";
import type {
  TransportMemberOption,
  TransportWorkspaceData,
} from "@/features/transport/types";
import { AnalysisPanel } from "@/components/transport/analysis-panel";
import { CreateCarrierDialog } from "@/components/transport/create-carrier-dialog";
import { CreateLoadDialog } from "@/components/transport/create-load-dialog";
import { DispatchBoard } from "@/components/transport/dispatch-board";
import { TransportMap } from "@/components/transport/transport-map";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { OrgRole } from "@/types/domain";

type TransportTab = "dispatch" | "map" | "analysis";

interface TransportWorkspaceProps {
  organizationId: string;
  orgSlug: string;
  orgRole: OrgRole;
  data: TransportWorkspaceData;
  members: TransportMemberOption[];
}

export function TransportWorkspace({
  organizationId,
  orgSlug,
  orgRole,
  data,
  members,
}: TransportWorkspaceProps) {
  const [tab, setTab] = useState<TransportTab>("dispatch");
  const [createOpen, setCreateOpen] = useState(false);
  const [carrierOpen, setCarrierOpen] = useState(false);

  const canEdit =
    orgRole === "owner" || orgRole === "admin" || orgRole === "member";

  const allStops = data.loads.flatMap((load) => load.stops);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Transport</h1>
          <p className="text-muted-foreground">
            Last-mile dispatch, route optimization, and service-area analysis.
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setCarrierOpen(true)}>
              Add carrier
            </Button>
            <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New load
            </Button>
          </div>
        )}
      </div>

      <nav className="flex gap-1 border-b pb-px">
        {(
          [
            { id: "dispatch" as const, label: "Dispatch" },
            { id: "map" as const, label: "Map" },
            { id: "analysis" as const, label: "Analysis" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "dispatch" &&
        (data.loads.length === 0 ? (
          <EmptyState
            icon={<Truck className="h-6 w-6" />}
            title="No loads yet"
            description="Create a load to start dispatching deliveries."
            action={
              canEdit ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  Create load
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DispatchBoard orgSlug={orgSlug} loads={data.loads} />
        ))}

      {tab === "map" && (
        <TransportMap depots={data.depots} stops={allStops} height={480} />
      )}

      {tab === "analysis" && (
        <AnalysisPanel
          organizationId={organizationId}
          orgSlug={orgSlug}
          depots={data.depots}
          analyses={data.analyses}
          canEdit={canEdit}
        />
      )}

      <CreateLoadDialog
        organizationId={organizationId}
        orgSlug={orgSlug}
        carriers={data.carriers}
        depots={data.depots}
        members={members}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <CreateCarrierDialog
        organizationId={organizationId}
        orgSlug={orgSlug}
        open={carrierOpen}
        onOpenChange={setCarrierOpen}
      />
    </div>
  );
}
