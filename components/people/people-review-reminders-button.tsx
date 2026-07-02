"use client";

import { useTransition } from "react";
import { sendPeopleReviewReminders } from "@/features/people/actions";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";

interface PeopleReviewRemindersButtonProps {
  organizationId: string;
  orgSlug: string;
  quarter: string;
}

export function PeopleReviewRemindersButton({
  organizationId,
  orgSlug,
  quarter,
}: PeopleReviewRemindersButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await sendPeopleReviewReminders({
        organizationId,
        orgSlug,
        quarter,
      });
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      showSuccessToast(`Sent ${result.remindedCount ?? 0} review reminders`);
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={handleClick}
    >
      Send review reminders
    </Button>
  );
}
