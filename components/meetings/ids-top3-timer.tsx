"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Timer } from "lucide-react";
import {
  advanceIdsFocus,
  extendIdsFocus,
  saveIdsSession,
} from "@/features/meetings/actions";
import type { IdsSession } from "@/features/meetings/ids-session";
import {
  getIdsFocusRemainingSeconds,
  isIdsFocusOvertime,
} from "@/features/meetings/ids-session";
import { formatTimerDisplay } from "@/features/meetings/utils";
import { showErrorToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IdsTop3TimerProps {
  organizationId: string;
  meetingId: string;
  session: IdsSession;
  issueTitlesById: Map<string, string>;
  canEdit: boolean;
  onSessionChange: (session: IdsSession) => void;
}

export function IdsTop3Timer({
  organizationId,
  meetingId,
  session,
  issueTitlesById,
  canEdit,
  onSessionChange,
}: IdsTop3TimerProps) {
  const [now, setNow] = useState(() => new Date());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (session.pinnedIssueIds.length === 0 || !session.focusStartedAt) {
      return;
    }

    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [session.focusStartedAt, session.pinnedIssueIds.length]);

  const currentIssueId = session.pinnedIssueIds[session.focusIndex] ?? null;
  const currentTitle = currentIssueId
    ? (issueTitlesById.get(currentIssueId) ?? "Top issue")
    : null;

  const remainingSeconds = useMemo(
    () => getIdsFocusRemainingSeconds(session, now),
    [session, now],
  );
  const overtime = isIdsFocusOvertime(session, now);

  if (session.pinnedIssueIds.length === 0) {
    return (
      <div
        className="rounded-md border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
        data-testid="ids-top3-timer"
      >
        Pin up to 3 issues to start the IDS focus timer.
      </div>
    );
  }

  function persistSession(nextSession: IdsSession) {
    onSessionChange(nextSession);
    startTransition(async () => {
      const result = await saveIdsSession({
        organizationId,
        meetingId,
        session: nextSession,
      });
      if (!result.success) {
        showErrorToast("Could not save IDS timer", result.error);
      }
    });
  }

  function handleNext() {
    if (!currentIssueId || !currentTitle) return;

    const startedAt = session.focusStartedAt
      ? new Date(session.focusStartedAt)
      : now;
    const budget = session.focusMinutesPerIssue * 60 + session.focusExtraSeconds;
    const elapsed = Math.max(
      0,
      Math.floor((now.getTime() - startedAt.getTime()) / 1000),
    );
    const secondsSpent = Math.min(elapsed, budget);

    startTransition(async () => {
      const result = await advanceIdsFocus({
        organizationId,
        meetingId,
        currentIssueId,
        currentIssueTitle: currentTitle,
        secondsSpent,
      });

      if (!result.success) {
        showErrorToast("Could not advance IDS focus", result.error);
        return;
      }

      const nextIndex = Math.min(
        session.focusIndex + 1,
        session.pinnedIssueIds.length - 1,
      );
      onSessionChange({
        ...session,
        focusIndex: nextIndex,
        focusStartedAt: new Date().toISOString(),
        focusExtraSeconds: 0,
        focusLog: [
          ...session.focusLog,
          { issueId: currentIssueId, title: currentTitle, secondsSpent },
        ],
      });
    });
  }

  function handleExtend() {
    startTransition(async () => {
      const result = await extendIdsFocus({
        organizationId,
        meetingId,
        extraSeconds: 60,
      });

      if (!result.success) {
        showErrorToast("Could not extend IDS timer", result.error);
        return;
      }

      onSessionChange({
        ...session,
        focusExtraSeconds: session.focusExtraSeconds + 60,
      });
    });
  }

  function handleStart() {
    persistSession({
      ...session,
      focusStartedAt: new Date().toISOString(),
      focusExtraSeconds: 0,
    });
  }

  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3",
        overtime ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "bg-card",
      )}
      data-testid="ids-top3-timer"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Timer className="h-4 w-4 shrink-0" />
            <span>
              Issue {session.focusIndex + 1} of {session.pinnedIssueIds.length}
            </span>
          </div>
          {currentTitle ? (
            <p className="mt-1 truncate text-sm text-muted-foreground">{currentTitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-lg font-semibold tabular-nums",
              overtime && "text-amber-700 dark:text-amber-300",
            )}
            data-testid="ids-top3-timer-display"
          >
            {session.focusStartedAt
              ? formatTimerDisplay(remainingSeconds)
              : `${session.focusMinutesPerIssue}:00`}
          </span>
          {canEdit ? (
            <>
              {!session.focusStartedAt ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={handleStart}
                  data-testid="ids-top3-start"
                >
                  Start
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={handleExtend}
                    data-testid="ids-top3-extend"
                  >
                    +1 min
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending || session.focusIndex >= session.pinnedIssueIds.length - 1}
                    onClick={handleNext}
                    data-testid="ids-top3-next"
                  >
                    Next issue
                  </Button>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
