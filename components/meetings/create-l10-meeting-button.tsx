"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createMeeting } from "@/features/meetings/actions";
import type { MeetingTeamOption } from "@/features/meetings/types";
import { getL10MeetingHref } from "@/features/meetings/utils";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface CreateL10MeetingButtonProps {
  organizationId: string;
  orgSlug: string;
  teams?: MeetingTeamOption[];
  teamId?: string;
  teamSlug?: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel?: string;
}

export function CreateL10MeetingButton({
  organizationId,
  orgSlug,
  teams = [],
  teamId: fixedTeamId,
  teamSlug: fixedTeamSlug,
  defaultOpen = false,
  onOpenChange,
  triggerLabel = "Start L10",
}: CreateL10MeetingButtonProps) {
  const router = useRouter();
  const isControlled = onOpenChange !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = isControlled ? defaultOpen : uncontrolledOpen;
  const [title, setTitle] = useState("L10 Meeting");
  const [teamId, setTeamId] = useState<string>(fixedTeamId ?? "");
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  }

  function handleCreate() {
    const resolvedTeamId = fixedTeamId ?? teamId;
    if (!resolvedTeamId) {
      showErrorToast("Select a team for this L10 meeting.");
      return;
    }

    startTransition(async () => {
      const result = await createMeeting({
        organizationId,
        title: title.trim() || "L10 Meeting",
        meetingType: "l10",
        teamId: resolvedTeamId,
      });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      const teamSlug =
        fixedTeamSlug ?? teams.find((team) => team.id === resolvedTeamId)?.slug;

      showSuccessToast("L10 meeting created");
      handleOpenChange(false);

      if (teamSlug) {
        router.push(getL10MeetingHref(orgSlug, teamSlug, result.meetingId));
      } else {
        router.push(`/org/${orgSlug}/meetings/${result.meetingId}`);
      }
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="create-l10-meeting-button">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start L10 Meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="meeting-title">Title</Label>
            <Input
              id="meeting-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-testid="create-meeting-title"
            />
          </div>
          {fixedTeamId ? null : teams.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="meeting-team">Team</Label>
              <select
                id="meeting-team"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
              >
                <option value="">Select team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={isPending}
            data-testid="create-meeting-submit"
          >
            {isPending ? "Creating…" : "Create meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
