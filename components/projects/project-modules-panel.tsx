"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createModule } from "@/features/projects/actions";
import type { ProjectModule } from "@/features/projects/types";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectModulesPanelProps {
  organizationId: string;
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  modules: ProjectModule[];
  canEdit: boolean;
}

export function ProjectModulesPanel({
  organizationId,
  projectId,
  orgSlug,
  projectSlug,
  modules,
  canEdit,
}: ProjectModulesPanelProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createModule({
        organizationId,
        projectId,
        orgSlug,
        projectSlug,
        name: name.trim(),
      });
      if (!result.success) {
        showErrorToast("Could not create module", result.error);
        return;
      }
      showSuccessToast("Module created");
      setName("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label>Module name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreate} disabled={isPending || !name.trim()}>
              Add module
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No modules yet.</p>
        ) : (
          modules.map((mod) => (
            <Card key={mod.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{mod.name}</CardTitle>
              </CardHeader>
              {mod.description && (
                <CardContent className="text-sm text-muted-foreground">
                  {mod.description}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
