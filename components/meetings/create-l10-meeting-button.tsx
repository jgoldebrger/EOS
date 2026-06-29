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
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface CreateL10MeetingButtonProps {
  organizationId: string;
  orgSlug: string;
  teams: MeetingTeamOption[];
}

export function CreateL10MeetingButton({
  organizationId,
  orgSlug,
  teams,
}: CreateL10MeetingButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("L10 Meeting");
  const [teamId, setTeamId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const result = await createMeeting({
        organizationId,
        title: title.trim() || "L10 Meeting",
        meetingType: "l10",
        teamId: teamId || null,
      });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      showSuccessToast("L10 meeting created");
      setOpen(false);
      router.push(`/org/${orgSlug}/meetings/${result.meetingId}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="create-l10-meeting-button">Create L10</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule L10 Meeting</DialogTitle>
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
          {teams.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="meeting-team">Team (optional)</Label>
              <select
                id="meeting-team"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
              >
                <option value="">All teams</option>
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
