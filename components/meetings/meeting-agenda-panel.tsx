"use client";

import { cn } from "@/lib/utils";
import type { AgendaStep } from "@/features/meetings/types";
import {
  formatSectionDuration,
  formatTimerDisplay,
  getSectionRemainingSeconds,
  isSectionOvertime,
} from "@/features/meetings/utils";

interface MeetingAgendaPanelProps {
  agenda: AgendaStep[];
  activeSectionKey: string | null;
  sectionStartedAt: Date | null;
  canEdit: boolean;
  onSelectSection: (sectionKey: string) => void;
  now?: Date;
}

export function MeetingAgendaPanel({
  agenda,
  activeSectionKey,
  sectionStartedAt,
  canEdit,
  onSelectSection,
  now = new Date(),
}: MeetingAgendaPanelProps) {
  return (
    <nav
      className="space-y-1"
      aria-label="Meeting agenda"
      data-testid="meeting-agenda-panel"
    >
      {agenda.map((step) => {
        const isActive = step.key === activeSectionKey;
        const remaining = isActive
          ? getSectionRemainingSeconds(
              step.durationMinutes,
              sectionStartedAt,
              now,
            )
          : step.durationMinutes * 60;
        const overtime = isActive
          ? isSectionOvertime(step.durationMinutes, sectionStartedAt, now)
          : false;

        return (
          <button
            key={step.key}
            type="button"
            disabled={!canEdit}
            onClick={() => onSelectSection(step.key)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
              !canEdit && "cursor-default",
            )}
            data-testid={`agenda-section-${step.key}`}
            data-active={isActive ? "true" : "false"}
          >
            <span>
              {step.label}
              {step.required ? (
                <span className="ml-1 text-xs opacity-70">*</span>
              ) : null}
            </span>
            <span
              className={cn(
                "tabular-nums text-xs",
                overtime && isActive && "font-semibold",
              )}
            >
              {isActive
                ? formatTimerDisplay(remaining)
                : formatSectionDuration(step.durationMinutes)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
