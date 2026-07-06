"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMeetingSchedule,
  upsertMeetingSchedule,
} from "@/features/meetings/schedule-actions";
import {
  DAY_OF_WEEK_LABELS,
  formatScheduleSummary,
  type MeetingSchedule,
} from "@/features/meetings/schedule-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

const TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "UTC",
];

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface L10ScheduleFormProps {
  organizationId: string;
  orgSlug: string;
  teamId: string;
  teamSlug: string;
  initialSchedule: MeetingSchedule | null;
  canEdit: boolean;
}

export function L10ScheduleForm({
  organizationId,
  orgSlug,
  teamId,
  teamSlug,
  initialSchedule,
  canEdit,
}: L10ScheduleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initialSchedule?.enabled ?? true);
  const [dayOfWeek, setDayOfWeek] = useState(String(initialSchedule?.day_of_week ?? 1));
  const [timeLocal, setTimeLocal] = useState(
    initialSchedule?.time_local.slice(0, 5) ?? "09:00",
  );
  const [timezone, setTimezone] = useState(initialSchedule?.timezone ?? "America/New_York");
  const [reminderHours, setReminderHours] = useState(
    String(initialSchedule?.reminder_hours_before ?? 24),
  );

  function handleSave() {
    startTransition(async () => {
      const result = await upsertMeetingSchedule({
        organizationId,
        orgSlug,
        teamId,
        teamSlug,
        dayOfWeek: Number.parseInt(dayOfWeek, 10),
        timeLocal,
        timezone,
        reminderHoursBefore: Number.parseInt(reminderHours, 10),
        enabled,
      });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      showSuccessToast("L10 schedule saved");
      router.refresh();
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await deleteMeetingSchedule({
        organizationId,
        orgSlug,
        teamId,
        teamSlug,
      });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      showSuccessToast("L10 schedule removed");
      router.refresh();
    });
  }

  if (!canEdit) {
    if (!initialSchedule) {
      return (
        <p className="text-sm text-muted-foreground" data-testid="l10-schedule-empty">
          No recurring L10 schedule configured.
        </p>
      );
    }

    return (
      <p className="text-sm" data-testid="l10-schedule-summary">
        {initialSchedule.enabled
          ? formatScheduleSummary(initialSchedule)
          : "Recurring schedule is disabled."}
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="l10-schedule-form">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="l10-schedule-enabled">Recurring L10</Label>
          <p className="text-sm text-muted-foreground">
            Team members get an inbox reminder before each occurrence.
          </p>
        </div>
        <input
          id="l10-schedule-enabled"
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="size-4"
          data-testid="l10-schedule-enabled"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="l10-schedule-day">Day</Label>
          <select
            id="l10-schedule-day"
            value={dayOfWeek}
            onChange={(event) => setDayOfWeek(event.target.value)}
            className={selectClassName}
            data-testid="l10-schedule-day"
          >
            {DAY_OF_WEEK_LABELS.map((label, index) => (
              <option key={label} value={String(index)}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="l10-schedule-time">Time</Label>
          <Input
            id="l10-schedule-time"
            type="time"
            value={timeLocal}
            onChange={(event) => setTimeLocal(event.target.value)}
            data-testid="l10-schedule-time"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="l10-schedule-timezone">Timezone</Label>
          <select
            id="l10-schedule-timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className={selectClassName}
            data-testid="l10-schedule-timezone"
          >
            {TIMEZONE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="l10-schedule-reminder">Reminder (hours before)</Label>
          <Input
            id="l10-schedule-reminder"
            type="number"
            min={1}
            max={168}
            value={reminderHours}
            onChange={(event) => setReminderHours(event.target.value)}
            data-testid="l10-schedule-reminder-hours"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={isPending} data-testid="l10-schedule-save">
          Save schedule
        </Button>
        {initialSchedule ? (
          <Button
            variant="outline"
            onClick={handleRemove}
            disabled={isPending}
            data-testid="l10-schedule-remove"
          >
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
