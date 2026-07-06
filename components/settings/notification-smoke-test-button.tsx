"use client";

import { useTransition } from "react";
import { sendNotificationSmokeTest } from "@/features/notifications/actions";
import { Button } from "@/components/ui/button";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface NotificationSmokeTestButtonProps {
  organizationId: string;
}

export function NotificationSmokeTestButton({
  organizationId,
}: NotificationSmokeTestButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await sendNotificationSmokeTest({ organizationId });
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      showSuccessToast(result.message ?? (result.sent ? "Test email sent" : "Test completed"));
    });
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      data-testid="notification-smoke-test-button"
    >
      {isPending ? "Sending…" : "Send test email to me"}
    </Button>
  );
}
