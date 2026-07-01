"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDepot, createIsochroneAnalysis } from "@/features/transport/actions";
import type { TransportAnalysis, TransportDepot } from "@/features/transport/types";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { TransportMap } from "@/components/transport/transport-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalysisPanelProps {
  organizationId: string;
  orgSlug: string;
  depots: TransportDepot[];
  analyses: TransportAnalysis[];
  canEdit: boolean;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm";

export function AnalysisPanel({
  organizationId,
  orgSlug,
  depots,
  analyses,
  canEdit,
}: AnalysisPanelProps) {
  const router = useRouter();
  const [depotId, setDepotId] = useState(depots[0]?.id ?? "");
  const [minutes, setMinutes] = useState("15,30,45");
  const [depotName, setDepotName] = useState("");
  const [depotLat, setDepotLat] = useState("");
  const [depotLng, setDepotLng] = useState("");
  const [isPending, startTransition] = useTransition();

  const latestCompleted = analyses.find((a) => a.status === "completed" && a.result);
  const isochroneFeatures =
    latestCompleted?.result &&
    typeof latestCompleted.result === "object" &&
    latestCompleted.result !== null &&
    "features" in latestCompleted.result &&
    Array.isArray((latestCompleted.result as { features: unknown[] }).features)
      ? ((latestCompleted.result as { features: Array<{
          type: string;
          properties?: Record<string, unknown>;
          geometry: { type: string; coordinates: unknown };
        }> }).features)
      : [];

  function runAnalysis() {
    const parsedMinutes = minutes
      .split(",")
      .map((m) => Number(m.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0);

    if (!depotId || parsedMinutes.length === 0) {
      showErrorToast("Invalid input", "Select a depot and enter minute thresholds.");
      return;
    }

    startTransition(async () => {
      const result = await createIsochroneAnalysis({
        organizationId,
        orgSlug,
        depotId,
        minutes: parsedMinutes,
      });
      if (!result.success) {
        showErrorToast("Analysis failed", result.error);
        return;
      }
      showSuccessToast("Isochrone analysis complete");
      router.refresh();
    });
  }

  function addDepot() {
    if (!depotName.trim()) return;
    startTransition(async () => {
      const result = await createDepot({
        organizationId,
        orgSlug,
        name: depotName.trim(),
        latitude: depotLat ? Number(depotLat) : null,
        longitude: depotLng ? Number(depotLng) : null,
      });
      if (!result.success) {
        showErrorToast("Could not create depot", result.error);
        return;
      }
      showSuccessToast("Depot created");
      setDepotName("");
      setDepotLat("");
      setDepotLng("");
      router.refresh();
    });
  }

  const selectedDepot = depots.find((d) => d.id === depotId) ?? depots[0];

  return (
    <div className="space-y-6">
      <TransportMap
        depots={selectedDepot ? [selectedDepot] : depots}
        isochroneFeatures={isochroneFeatures}
        height={400}
      />

      {canEdit && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Run isochrone analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Depot</Label>
                <select
                  className={selectClassName}
                  value={depotId}
                  onChange={(e) => setDepotId(e.target.value)}
                >
                  {depots.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Minutes (comma-separated)</Label>
                <Input value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              </div>
              <Button onClick={runAnalysis} disabled={isPending || depots.length === 0}>
                {isPending ? "Running…" : "Run analysis"}
              </Button>
              {latestCompleted?.result && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const blob = new Blob(
                      [JSON.stringify(latestCompleted.result, null, 2)],
                      { type: "application/json" },
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "isochrone-analysis.geojson";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export GeoJSON
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add depot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Depot name"
                value={depotName}
                onChange={(e) => setDepotName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Latitude"
                  value={depotLat}
                  onChange={(e) => setDepotLat(e.target.value)}
                />
                <Input
                  placeholder="Longitude"
                  value={depotLng}
                  onChange={(e) => setDepotLng(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={addDepot} disabled={isPending}>
                Add depot
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Recent analyses</h3>
        {analyses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No analyses yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {analyses.map((a) => (
              <li key={a.id} className="rounded-md border px-3 py-2">
                <span className="capitalize">{a.analysis_type}</span>
                <span className="text-muted-foreground"> · {a.status}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {new Date(a.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
