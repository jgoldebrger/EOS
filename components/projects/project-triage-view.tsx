"use client";

import { useTransition } from "react";
import { moveWorkItemState, updateWorkItem } from "@/features/projects/actions";
import type { ProjectMemberOption, WorkItemWithMeta } from "@/features/projects/types";
import { showErrorToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectTriageViewProps {
  items: WorkItemWithMeta[];
  organizationId: string;
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  members: ProjectMemberOption[];
  canEdit: boolean;
  onSelect: (item: WorkItemWithMeta) => void;
}

export function ProjectTriageView({
  items,
  organizationId,
  projectId,
  orgSlug,
  projectSlug,
  members,
  canEdit,
  onSelect,
}: ProjectTriageViewProps) {
  const triageItems = items.filter((i) => i.state === "triage");
  const [isPending, startTransition] = useTransition();

  function accept(item: WorkItemWithMeta) {
    startTransition(async () => {
      const result = await moveWorkItemState({
        organizationId,
        projectId,
        workItemId: item.id,
        orgSlug,
        projectSlug,
        state: "backlog",
      });
      if (!result.success) showErrorToast("Could not accept item", result.error);
    });
  }

  function setPriority(
    item: WorkItemWithMeta,
    priority: "urgent" | "high" | "medium" | "low" | "none",
  ) {
    startTransition(async () => {
      const result = await updateWorkItem({
        organizationId,
        projectId,
        workItemId: item.id,
        orgSlug,
        projectSlug,
        priority,
      });
      if (!result.success) showErrorToast("Could not update priority", result.error);
    });
  }

  if (triageItems.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No items in triage. Create work items with state &quot;triage&quot; or move
        items here from the board.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {triageItems.map((item) => (
        <Card key={item.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
            <div>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <p className="font-mono text-xs text-muted-foreground">
                {item.identifier}
              </p>
            </div>
            <Badge variant="outline" className="capitalize">
              {item.priority}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!canEdit || isPending}
              onClick={() => accept(item)}
            >
              Accept to backlog
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onSelect(item)}>
              Details
            </Button>
            {canEdit &&
              (["urgent", "high", "medium"] as const).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant="ghost"
                  className="capitalize"
                  disabled={isPending}
                  onClick={() => setPriority(item, p)}
                >
                  {p}
                </Button>
              ))}
            <select
              className="h-8 rounded-md border px-2 text-xs"
              disabled={!canEdit || isPending}
              value={item.assignee_id ?? ""}
              onChange={(e) => {
                startTransition(async () => {
                  const result = await updateWorkItem({
                    organizationId,
                    projectId,
                    workItemId: item.id,
                    orgSlug,
                    projectSlug,
                    assigneeId: e.target.value || null,
                  });
                  if (!result.success) {
                    showErrorToast("Could not assign", result.error);
                  }
                });
              }}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
