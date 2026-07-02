"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrgL10Agenda } from "@/features/meetings/actions";
import type { L10AgendaTemplate } from "@/features/meetings/types";
import {
  extractAgendaDurations,
  formatSectionDuration,
  getDefaultL10Agenda,
  getTotalAgendaMinutes,
} from "@/features/meetings/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface L10AgendaSettingsFormProps {
  organizationId: string;
  orgSlug: string;
  initialAgenda: L10AgendaTemplate;
  canEdit: boolean;
}

export function L10AgendaSettingsForm({
  organizationId,
  orgSlug,
  initialAgenda,
  canEdit,
}: L10AgendaSettingsFormProps) {
  const router = useRouter();
  const [durations, setDurations] = useState(() => extractAgendaDurations(initialAgenda));
  const [isPending, startTransition] = useTransition();

  const previewAgenda = useMemo(() => {
    const defaults = getDefaultL10Agenda();
    return defaults.map((step) => ({
      ...step,
      durationMinutes: durations[step.key as keyof typeof durations] ?? step.durationMinutes,
    }));
  }, [durations]);

  const totalMinutes = getTotalAgendaMinutes(previewAgenda);

  function handleDurationChange(key: keyof typeof durations, value: string) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    setDurations((current) => ({ ...current, [key]: parsed }));
  }

  function handleReset() {
    setDurations(extractAgendaDurations(getDefaultL10Agenda()));
  }

  function handleSave() {
    startTransition(async () => {
      const defaults = getDefaultL10Agenda();
      const payload = Object.fromEntries(
        defaults.map((step) => [
          step.key,
          durations[step.key as keyof typeof durations] ?? step.durationMinutes,
        ]),
      ) as {
        segue: number;
        scorecard: number;
        rocks: number;
        headlines: number;
        todos: number;
        issues: number;
        conclude: number;
      };

      const result = await updateOrgL10Agenda({
        organizationId,
        orgSlug,
        durations: payload,
      });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      showSuccessToast("L10 agenda timings saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6" data-testid="l10-agenda-settings">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Total meeting time:{" "}
          <span className="font-medium text-foreground">
            {formatSectionDuration(totalMinutes)}
          </span>
        </p>
        {canEdit ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              Reset to defaults
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              data-testid="l10-agenda-save"
            >
              {isPending ? "Saving…" : "Save timings"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {previewAgenda.map((step) => (
          <div
            key={step.key}
            className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_120px]"
            data-testid={`l10-agenda-row-${step.key}`}
          >
            <div>
              <p className="font-medium">{step.label}</p>
              <p className="text-sm text-muted-foreground">
                {step.required ? "Required section" : "Optional section"}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`l10-duration-${step.key}`}>Minutes</Label>
              <Input
                id={`l10-duration-${step.key}`}
                type="number"
                min={1}
                max={480}
                value={durations[step.key as keyof typeof durations] ?? step.durationMinutes}
                onChange={(event) =>
                  handleDurationChange(
                    step.key as keyof typeof durations,
                    event.target.value,
                  )
                }
                disabled={!canEdit || isPending}
                data-testid={`l10-duration-input-${step.key}`}
              />
            </div>
          </div>
        ))}
      </div>

      {!canEdit ? (
        <p className="text-sm text-muted-foreground">
          Contact an organization owner or admin to change these timings.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          New L10 meetings use these time boxes. Meetings already started keep
          their original agenda snapshot.
        </p>
      )}
    </div>
  );
}
