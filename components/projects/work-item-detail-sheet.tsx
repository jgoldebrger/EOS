"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveWorkItem,
  setWorkItemLabels,
  updateWorkItem,
} from "@/features/projects/actions";
import {
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_STATES,
} from "@/features/projects/schema";
import type {
  ProjectCycle,
  ProjectLabel,
  ProjectMemberOption,
  ProjectModule,
  WorkItemWithMeta,
} from "@/features/projects/types";
import { formatWorkItemState } from "@/features/projects/utils";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface WorkItemDetailSheetProps {
  item: WorkItemWithMeta | null;
  organizationId: string;
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  members: ProjectMemberOption[];
  modules: ProjectModule[];
  cycles: ProjectCycle[];
  labels: ProjectLabel[];
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm";

export function WorkItemDetailSheet({
  item,
  organizationId,
  projectId,
  orgSlug,
  projectSlug,
  members,
  modules,
  cycles,
  labels,
  canEdit,
  open,
  onOpenChange,
}: WorkItemDetailSheetProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<WorkItemWithMeta["state"]>("backlog");
  const [priority, setPriority] = useState<WorkItemWithMeta["priority"]>("none");
  const [assigneeId, setAssigneeId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatePoints, setEstimatePoints] = useState("");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const activeItem = item;

  function syncFromItem() {
    if (!item) return;
    setTitle(item.title);
    setDescription(item.description ?? "");
    setState(item.state);
    setPriority(item.priority);
    setAssigneeId(item.assignee_id ?? "");
    setModuleId(item.module_id ?? "");
    setCycleId(item.cycle_id ?? "");
    setDueDate(item.due_date ?? "");
    setEstimatePoints(
      item.estimate_points != null ? String(item.estimate_points) : "",
    );
    setSelectedLabelIds(item.labelIds);
  }

  function handleOpenChange(next: boolean) {
    if (next && item) syncFromItem();
    onOpenChange(next);
  }

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId],
    );
  }

  function handleSave() {
    if (!item) return;
    startTransition(async () => {
      const result = await updateWorkItem({
        organizationId,
        projectId,
        workItemId: item.id,
        orgSlug,
        projectSlug,
        title: title.trim(),
        description: description.trim() || undefined,
        state,
        priority,
        assigneeId: assigneeId || null,
        moduleId: moduleId || null,
        cycleId: cycleId || null,
        dueDate: dueDate || null,
        estimatePoints: estimatePoints ? Number(estimatePoints) : null,
      });
      if (!result.success) {
        showErrorToast("Could not save", result.error);
        return;
      }

      const labelsChanged =
        selectedLabelIds.length !== item.labelIds.length ||
        selectedLabelIds.some((id) => !item.labelIds.includes(id));

      if (labelsChanged) {
        const labelResult = await setWorkItemLabels({
          organizationId,
          projectId,
          workItemId: item.id,
          orgSlug,
          projectSlug,
          labelIds: selectedLabelIds,
        });
        if (!labelResult.success) {
          showErrorToast("Could not update labels", labelResult.error);
          return;
        }
      }

      showSuccessToast("Work item saved");
      router.refresh();
    });
  }

  function handleArchive() {
    if (!item) return;
    startTransition(async () => {
      const result = await archiveWorkItem({
        organizationId,
        projectId,
        workItemId: item.id,
        orgSlug,
        projectSlug,
      });
      if (!result.success) {
        showErrorToast("Could not archive", result.error);
        return;
      }
      showSuccessToast("Work item archived");
      onOpenChange(false);
      router.refresh();
    });
  }

  if (!activeItem) return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{activeItem.identifier}</SheetTitle>
          <SheetDescription className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">
              {formatWorkItemState(activeItem.state)}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {activeItem.priority}
            </Badge>
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={open ? title : activeItem.title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className={`${selectClassName} min-h-24 py-2`}
              value={open ? description : (activeItem.description ?? "")}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>State</Label>
              <select
                className={selectClassName}
                value={open ? state : activeItem.state}
                onChange={(e) =>
                  setState(e.target.value as WorkItemWithMeta["state"])
                }
                disabled={!canEdit}
              >
                {WORK_ITEM_STATES.map((s) => (
                  <option key={s} value={s}>
                    {formatWorkItemState(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <select
                className={`${selectClassName} capitalize`}
                value={open ? priority : activeItem.priority}
                onChange={(e) =>
                  setPriority(e.target.value as WorkItemWithMeta["priority"])
                }
                disabled={!canEdit}
              >
                {WORK_ITEM_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assignee</Label>
            <select
              className={selectClassName}
              value={open ? assigneeId : (activeItem.assignee_id ?? "")}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={!canEdit}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Module</Label>
              <select
                className={selectClassName}
                value={open ? moduleId : (activeItem.module_id ?? "")}
                onChange={(e) => setModuleId(e.target.value)}
                disabled={!canEdit}
              >
                <option value="">None</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Cycle</Label>
              <select
                className={selectClassName}
                value={open ? cycleId : (activeItem.cycle_id ?? "")}
                onChange={(e) => setCycleId(e.target.value)}
                disabled={!canEdit}
              >
                <option value="">None</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={open ? dueDate : (activeItem.due_date ?? "")}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>Estimate (points)</Label>
              <Input
                type="number"
                min={0}
                value={
                  open
                    ? estimatePoints
                    : activeItem.estimate_points != null
                      ? String(activeItem.estimate_points)
                      : ""
                }
                onChange={(e) => setEstimatePoints(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>
          {labels.length > 0 && (
            <div className="space-y-2">
              <Label>Labels</Label>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => {
                  const selected = (open ? selectedLabelIds : activeItem.labelIds).includes(
                    label.id,
                  );
                  return (
                    <button
                      key={label.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => toggleLabel(label.id)}
                      className="disabled:opacity-60"
                    >
                      <Badge variant={selected ? "default" : "outline"}>
                        {label.name}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {canEdit && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="destructive"
                onClick={handleArchive}
                disabled={isPending}
              >
                Archive
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
