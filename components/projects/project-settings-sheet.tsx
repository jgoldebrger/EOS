"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveProject,
  createProjectLabel,
  restoreProject,
  updateProject,
} from "@/features/projects/actions";
import { PROJECT_STATUSES } from "@/features/projects/schema";
import type {
  ProjectDetail,
  ProjectLabel,
  ProjectMemberOption,
} from "@/features/projects/types";
import { formatProjectStatus } from "@/features/projects/utils";
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

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm";

interface ProjectSettingsSheetProps {
  project: ProjectDetail;
  organizationId: string;
  orgSlug: string;
  members: ProjectMemberOption[];
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectSettingsSheet({
  project,
  organizationId,
  orgSlug,
  members,
  canEdit,
  open,
  onOpenChange,
}: ProjectSettingsSheetProps) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState(project.status);
  const [leadId, setLeadId] = useState(project.lead_id ?? "");
  const [dueDate, setDueDate] = useState(project.due_date ?? "");
  const [labelName, setLabelName] = useState("");
  const [labels, setLabels] = useState<ProjectLabel[]>(project.labels);
  const [isPending, startTransition] = useTransition();

  const isArchived = Boolean(project.archived_at);

  function syncFromProject() {
    setTitle(project.title);
    setDescription(project.description ?? "");
    setStatus(project.status);
    setLeadId(project.lead_id ?? "");
    setDueDate(project.due_date ?? "");
    setLabels(project.labels);
    setLabelName("");
  }

  function handleOpenChange(next: boolean) {
    if (next) syncFromProject();
    onOpenChange(next);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateProject({
        organizationId,
        projectId: project.id,
        orgSlug,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        leadId: leadId || null,
        dueDate: dueDate || null,
      });
      if (!result.success) {
        showErrorToast("Could not save project", result.error);
        return;
      }
      showSuccessToast("Project updated");
      router.refresh();
    });
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveProject({
        organizationId,
        projectId: project.id,
        orgSlug,
      });
      if (!result.success) {
        showErrorToast("Could not archive project", result.error);
        return;
      }
      showSuccessToast("Project archived");
      onOpenChange(false);
      router.push(`/org/${orgSlug}/projects`);
      router.refresh();
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreProject({
        organizationId,
        projectId: project.id,
        orgSlug,
      });
      if (!result.success) {
        showErrorToast("Could not restore project", result.error);
        return;
      }
      showSuccessToast("Project restored");
      router.refresh();
    });
  }

  function handleCreateLabel() {
    if (!labelName.trim()) return;
    startTransition(async () => {
      const result = await createProjectLabel({
        organizationId,
        projectId: project.id,
        orgSlug,
        projectSlug: project.slug,
        name: labelName.trim(),
      });
      if (!result.success) {
        showErrorToast("Could not create label", result.error);
        return;
      }
      showSuccessToast("Label created");
      setLabelName("");
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Project settings</SheetTitle>
          <SheetDescription>
            {isArchived ? (
              <Badge variant="secondary">Archived</Badge>
            ) : (
              "Update project details and labels."
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-settings-title">Title</Label>
              <Input
                id="project-settings-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEdit || isArchived}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-settings-description">Description</Label>
              <textarea
                id="project-settings-description"
                className={`${selectClassName} min-h-20 py-2`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit || isArchived}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-settings-status">Status</Label>
              <select
                id="project-settings-status"
                className={selectClassName}
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as typeof status)
                }
                disabled={!canEdit || isArchived}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {formatProjectStatus(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-settings-lead">Lead</Label>
              <select
                id="project-settings-lead"
                className={selectClassName}
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                disabled={!canEdit || isArchived}
              >
                <option value="">No lead</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-settings-due">Due date</Label>
              <Input
                id="project-settings-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={!canEdit || isArchived}
              />
            </div>
            {canEdit && !isArchived && (
              <Button onClick={handleSave} disabled={isPending || !title.trim()}>
                {isPending ? "Saving…" : "Save changes"}
              </Button>
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-medium">Labels</h3>
            {labels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No labels yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <Badge key={label.id} variant="outline">
                    {label.name}
                  </Badge>
                ))}
              </div>
            )}
            {canEdit && !isArchived && (
              <div className="flex gap-2">
                <Input
                  placeholder="New label name"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleCreateLabel}
                  disabled={isPending || !labelName.trim()}
                >
                  Add
                </Button>
              </div>
            )}
          </div>

          {canEdit && (
            <div className="border-t pt-4">
              {isArchived ? (
                <Button variant="outline" onClick={handleRestore} disabled={isPending}>
                  Restore project
                </Button>
              ) : (
                <Button variant="destructive" onClick={handleArchive} disabled={isPending}>
                  Archive project
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
