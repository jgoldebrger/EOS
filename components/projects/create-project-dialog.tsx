"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/features/projects/actions";
import type { ProjectMemberOption, ProjectTeamOption } from "@/features/projects/types";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateProjectDialogProps {
  organizationId: string;
  orgSlug: string;
  teams: ProjectTeamOption[];
  members: ProjectMemberOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function CreateProjectDialog({
  organizationId,
  orgSlug,
  teams,
  members,
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setTitle("");
    setDescription("");
    setTeamId("");
    setLeadId("");
  }

  async function handleSubmit() {
    if (!title.trim()) {
      showErrorToast("Title required", "Enter a project name.");
      return;
    }

    setIsSubmitting(true);
    const result = await createProject({
      organizationId,
      orgSlug,
      title: title.trim(),
      description: description.trim() || undefined,
      teamId: teamId || null,
      leadId: leadId || null,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create project", result.error);
      return;
    }

    showSuccessToast("Project created", result.slug);
    resetForm();
    onOpenChange(false);
    router.push(`/org/${orgSlug}/projects/${result.slug}`);
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
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Start a new initiative to track work items, cycles, and docs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-title">Name</Label>
            <Input
              id="project-title"
              placeholder="Q3 product launch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Input
              id="project-description"
              placeholder="Optional summary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-team">Team</Label>
            <select
              id="project-team"
              className={selectClassName}
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <option value="">No team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-lead">Lead</Label>
            <select
              id="project-lead"
              className={selectClassName}
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
            >
              <option value="">Assign later</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? "Creating…" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
