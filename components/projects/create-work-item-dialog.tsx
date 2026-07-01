"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkItem } from "@/features/projects/actions";
import type {
  ProjectCycle,
  ProjectMemberOption,
  ProjectModule,
} from "@/features/projects/types";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WORK_ITEM_PRIORITIES } from "@/features/projects/schema";

interface CreateWorkItemDialogProps {
  organizationId: string;
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  members: ProjectMemberOption[];
  modules: ProjectModule[];
  cycles: ProjectCycle[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultState?: string;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm";

export function CreateWorkItemDialog({
  organizationId,
  projectId,
  orgSlug,
  projectSlug,
  members,
  modules,
  cycles,
  open,
  onOpenChange,
  defaultState = "backlog",
}: CreateWorkItemDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("none");
  const [moduleId, setModuleId] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setTitle("");
    setAssigneeId("");
    setPriority("none");
    setModuleId("");
    setCycleId("");
  }

  async function handleSubmit() {
    if (!title.trim()) {
      showErrorToast("Title required", "Enter a work item title.");
      return;
    }

    setIsSubmitting(true);
    const result = await createWorkItem({
      organizationId,
      projectId,
      orgSlug,
      projectSlug,
      title: title.trim(),
      assigneeId: assigneeId || null,
      priority: priority as "urgent" | "high" | "medium" | "low" | "none",
      moduleId: moduleId || null,
      cycleId: cycleId || null,
      state: (defaultState ?? "backlog") as
        | "triage"
        | "backlog"
        | "unstarted"
        | "started"
        | "completed"
        | "cancelled",
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create work item", result.error);
      return;
    }

    showSuccessToast("Work item created");
    resetForm();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New work item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="work-item-title">Title</Label>
            <Input
              id="work-item-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="work-item-assignee">Assignee</Label>
            <select
              id="work-item-assignee"
              className={selectClassName}
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="work-item-priority">Priority</Label>
            <select
              id="work-item-priority"
              className={`${selectClassName} capitalize`}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {WORK_ITEM_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="work-item-module">Module</Label>
            <select
              id="work-item-module"
              className={selectClassName}
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
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
            <Label htmlFor="work-item-cycle">Cycle</Label>
            <select
              id="work-item-cycle"
              className={selectClassName}
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
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
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
