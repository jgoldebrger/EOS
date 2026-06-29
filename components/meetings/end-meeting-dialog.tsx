"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { endMeeting } from "@/features/meetings/actions";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface EndMeetingDialogProps {
  organizationId: string;
  meetingId: string;
  orgSlug: string;
  canEdit: boolean;
}

export function EndMeetingDialog({
  organizationId,
  meetingId,
  orgSlug,
  canEdit,
}: EndMeetingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!canEdit) {
    return null;
  }

  function handleEnd() {
    startTransition(async () => {
      const result = await endMeeting({ organizationId, meetingId });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      showSuccessToast("Meeting ended");
      setOpen(false);
      router.push(`/org/${orgSlug}/meetings`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" data-testid="end-meeting-button">
          End meeting
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End this meeting?</DialogTitle>
          <DialogDescription>
            The meeting will be marked completed. You can review notes and
            decisions from the meetings list.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleEnd}
            disabled={isPending}
            data-testid="end-meeting-confirm"
          >
            {isPending ? "Ending…" : "End meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
