"use client";

import { useState, useTransition } from "react";
import { saveMeetingRating } from "@/features/meetings/actions";
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

interface MeetingRatingDialogProps {
  organizationId: string;
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MeetingRatingDialog({
  organizationId,
  meetingId,
  open,
  onOpenChange,
}: MeetingRatingDialogProps) {
  const [rating, setRating] = useState(8);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await saveMeetingRating({
        organizationId,
        meetingId,
        rating,
      });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      showSuccessToast("Meeting rating saved");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate this meeting</DialogTitle>
          <DialogDescription>
            EOS conclude: rate the meeting 1–10 on traction and engagement.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-4 py-2">
          <input
            type="range"
            min={1}
            max={10}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full"
            aria-label="Meeting rating"
          />
          <span className="w-8 text-center text-lg font-semibold tabular-nums">{rating}</span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : "Submit rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
