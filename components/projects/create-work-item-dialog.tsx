"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkItem } from "@/features/projects/actions";
import type { ProjectMemberOption } from "@/features/projects/types";
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

interface CreateWorkItemDialogProps {
  organizationId: string;
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  members: ProjectMemberOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultState?: string;
}

export function CreateWorkItemDialog({
  organizationId,
  projectId,
  orgSlug,
  projectSlug,
  members,
  open,
  onOpenChange,
  defaultState = "backlog",
}: CreateWorkItemDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setTitle("");
    setAssigneeId("");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              className="flex h-9 w-full rounded-md border border-input px-3 text-sm"
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
