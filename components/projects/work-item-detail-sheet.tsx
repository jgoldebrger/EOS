"use client";

import { useState, useTransition } from "react";
import { updateWorkItem } from "@/features/projects/actions";
import type { WorkItemWithMeta } from "@/features/projects/types";
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
  canEdit,
  open,
  onOpenChange,
}: WorkItemDetailSheetProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeItem = item;
  const displayTitle = activeItem?.title ?? "";
  const displayDescription = activeItem?.description ?? "";

  function syncFromItem() {
    if (!item) return;
    setTitle(item.title);
    setDescription(item.description ?? "");
  }

  function handleOpenChange(next: boolean) {
    if (next && item) syncFromItem();
    onOpenChange(next);
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
      });
      if (!result.success) {
        showErrorToast("Could not save", result.error);
        return;
      }
      showSuccessToast("Work item saved");
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
              value={open ? title || displayTitle : displayTitle}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className={`${selectClassName} min-h-24 py-2`}
              value={open ? description || displayDescription : displayDescription}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Assignee: {activeItem.assignee.label}</p>
            {activeItem.moduleName && <p>Module: {activeItem.moduleName}</p>}
            {activeItem.cycleName && <p>Cycle: {activeItem.cycleName}</p>}
          </div>
          {canEdit && (
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
