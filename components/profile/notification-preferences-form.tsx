"use client";

import { useState } from "react";
import { updateNotificationPreferences } from "@/features/profile/actions";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface NotificationPreferences {
  emailAssignments: boolean;
  emailL10Recap: boolean;
  emailWeeklyDigest: boolean;
}

interface NotificationPreferencesFormProps {
  orgSlug: string;
  preferences: NotificationPreferences;
}

export function NotificationPreferencesForm({
  orgSlug,
  preferences,
}: NotificationPreferencesFormProps) {
  const [emailAssignments, setEmailAssignments] = useState(preferences.emailAssignments);
  const [emailL10Recap, setEmailL10Recap] = useState(preferences.emailL10Recap);
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(preferences.emailWeeklyDigest);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    const result = await updateNotificationPreferences({
      orgSlug,
      emailAssignments,
      emailL10Recap,
      emailWeeklyDigest,
    });
    setIsSaving(false);

    if (!result.success) {
      showErrorToast(result.error);
      return;
    }

    showSuccessToast("Notification preferences saved");
  }

  return (
    <div className="space-y-4" data-testid="notification-preferences-form">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={emailAssignments}
          onChange={(e) => setEmailAssignments(e.target.checked)}
        />
        <Label>Email me on new assignments</Label>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={emailL10Recap}
          onChange={(e) => setEmailL10Recap(e.target.checked)}
        />
        <Label>Email me L10 recap links</Label>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={emailWeeklyDigest}
          onChange={(e) => setEmailWeeklyDigest(e.target.checked)}
        />
        <Label>Weekly digest email</Label>
      </label>
      <Button type="button" size="sm" disabled={isSaving} onClick={handleSave}>
        {isSaving ? "Saving…" : "Save preferences"}
      </Button>
    </div>
  );
}
