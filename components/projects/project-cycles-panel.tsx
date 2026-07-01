"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCycle, updateCycle } from "@/features/projects/actions";
import type { ProjectCycle } from "@/features/projects/types";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectCyclesPanelProps {
  organizationId: string;
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  cycles: ProjectCycle[];
  canEdit: boolean;
}

export function ProjectCyclesPanel({
  organizationId,
  projectId,
  orgSlug,
  projectSlug,
  cycles,
  canEdit,
}: ProjectCyclesPanelProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createCycle({
        organizationId,
        projectId,
        orgSlug,
        projectSlug,
        name: name.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
      });
      if (!result.success) {
        showErrorToast("Could not create cycle", result.error);
        return;
      }
      showSuccessToast("Cycle created");
      setName("");
      setStartDate("");
      setEndDate("");
      router.refresh();
    });
  }

  function setCurrent(cycle: ProjectCycle) {
    startTransition(async () => {
      const result = await updateCycle({
        organizationId,
        projectId,
        cycleId: cycle.id,
        orgSlug,
        projectSlug,
        name: cycle.name,
        startDate: cycle.start_date,
        endDate: cycle.end_date,
        status: "current",
      });
      if (!result.success) {
        showErrorToast("Could not set current cycle", result.error);
        return;
      }
      showSuccessToast("Current cycle updated");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New cycle</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Start</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleCreate} disabled={isPending || !name.trim()}>
              Add cycle
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {cycles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cycles yet.</p>
        ) : (
          cycles.map((cycle) => (
            <Card key={cycle.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{cycle.name}</CardTitle>
                <Badge variant="secondary" className="capitalize">
                  {cycle.status}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {cycle.start_date && <span>Start {cycle.start_date}</span>}
                {cycle.end_date && <span>End {cycle.end_date}</span>}
                {canEdit && cycle.status !== "current" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => setCurrent(cycle)}
                  >
                    Set as current
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
