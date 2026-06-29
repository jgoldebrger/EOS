"use client";

import { useState } from "react";
import { assignUser } from "@/features/accountability/actions";
import type { SeatMemberOption, SeatNode } from "@/features/accountability/types";
import { AssignUserCombobox } from "@/components/accountability/assign-user-combobox";
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

interface AssignSeatDialogProps {
  organizationId: string;
  seat: SeatNode | null;
  members: SeatMemberOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignSeatDialog({
  organizationId,
  seat,
  members,
  open,
  onOpenChange,
}: AssignSeatDialogProps) {
  const [userId, setUserId] = useState<string | null>(seat?.assigned_user_id ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next && seat) {
      setUserId(seat.assigned_user_id);
    }
    onOpenChange(next);
  }

  async function handleSubmit() {
    if (!seat) return;

    setIsSubmitting(true);
    const result = await assignUser({
      organizationId,
      seatId: seat.id,
      userId,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not assign user", result.error);
      return;
    }

    showSuccessToast("Assignee updated");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign seat owner</DialogTitle>
          <DialogDescription>
            {seat
              ? `Choose who owns the "${seat.title}" seat.`
              : "Choose a seat owner."}
          </DialogDescription>
        </DialogHeader>
        <AssignUserCombobox
          members={members}
          value={userId}
          onChange={setUserId}
          disabled={isSubmitting}
        />
        <DialogFooter>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !seat}
            data-testid="assign-seat-submit"
          >
            {isSubmitting ? "Saving…" : "Save assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
