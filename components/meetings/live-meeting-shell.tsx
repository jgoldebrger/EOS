"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { List } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeetingAgendaPanel } from "@/components/meetings/meeting-agenda-panel";
import { MeetingSectionEmbed } from "@/components/meetings/meeting-section-embed";
import { MeetingNotesEditor } from "@/components/meetings/meeting-notes-editor";
import { DecisionsList } from "@/components/meetings/decisions-list";
import { EndMeetingDialog } from "@/components/meetings/end-meeting-dialog";
import { MeetingRatingDialog } from "@/components/meetings/meeting-rating-dialog";
import { SeguePromptCard } from "@/components/meetings/segue-prompt-card";
import { CascadingMessagesChecklist } from "@/components/meetings/cascading-messages-checklist";
import { AiSummaryPanel } from "@/components/ai/ai-summary-panel";
import type { AiSuggestion } from "@/features/ai/schema";
import {
  extendSectionDuration,
  startMeeting,
  updateActiveSection,
} from "@/features/meetings/actions";
import type { MeetingWithNotes } from "@/features/meetings/types";
import { parseMeetingTimer } from "@/features/meetings/timer";
import { getL10HubHref, getSectionByKey, getSectionRemainingSeconds, isSectionOvertime, formatTimerDisplay, parseCascadingMessageTemplates } from "@/features/meetings/utils";
import { cn } from "@/lib/utils";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface LiveMeetingShellProps {
  organizationId: string;
  orgSlug: string;
  meeting: MeetingWithNotes;
  canEdit: boolean;
  teamSlug?: string;
  sectionPanel?: React.ReactNode;
  pendingSuggestions?: AiSuggestion[];
  seguePrompts?: string[];
  cascadingTemplates?: string[];
}

export function LiveMeetingShell({
  organizationId,
  orgSlug,
  meeting: initialMeeting,
  canEdit,
  teamSlug,
  sectionPanel,
  pendingSuggestions = [],
  seguePrompts = [],
  cascadingTemplates = [],
}: LiveMeetingShellProps) {
  const router = useRouter();
  const meeting = initialMeeting;
  const initialTimer = parseMeetingTimer(initialMeeting.metadata);
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(
    initialMeeting.active_section_key ??
      initialTimer.sectionKey ??
      initialMeeting.agenda[0]?.key ??
      null,
  );
  const [sectionStartedAt, setSectionStartedAt] = useState<Date | null>(
    initialTimer.startedAt ??
      (initialMeeting.started_at ? new Date(initialMeeting.started_at) : null),
  );
  const [now, setNow] = useState(() => new Date());
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [presenceCount, setPresenceCount] = useState(1);
  const [durationExtensions, setDurationExtensions] = useState<Record<string, number>>(
    initialTimer.extensions,
  );
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingDismissed, setRatingDismissed] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function applyTimerFromMetadata(metadata: unknown) {
    const timer = parseMeetingTimer(metadata);
    if (timer.sectionKey) {
      setActiveSectionKey(timer.sectionKey);
    }
    if (timer.startedAt) {
      setSectionStartedAt(timer.startedAt);
    }
    setDurationExtensions(timer.extensions);
  }

  useEffect(() => {
    if (meeting.status !== "in_progress") {
      return;
    }

    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [meeting.status]);

  useEffect(() => {
    if (meeting.status !== "in_progress") {
      return;
    }

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;

    try {
      const supabase = createClient();
      channel = supabase
        .channel(`meeting-${meeting.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "meetings",
            filter: `id=eq.${meeting.id}`,
          },
          (payload) => {
            const nextRow = payload.new as {
              active_section_key?: string | null;
              metadata?: unknown;
            };
            if (
              nextRow.active_section_key &&
              nextRow.active_section_key !== activeSectionKey
            ) {
              setActiveSectionKey(nextRow.active_section_key);
            }
            applyTimerFromMetadata(nextRow.metadata);
            router.refresh();
          },
        )
        .on("presence", { event: "sync" }, () => {
          const state = channel?.presenceState() ?? {};
          setPresenceCount(Math.max(1, Object.keys(state).length));
        })
        .subscribe(async (status) => {
          setRealtimeConnected(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") {
            await channel?.track({ online_at: new Date().toISOString() });
          }
        });
    } catch {
      // Realtime unavailable — leave realtimeConnected at its initial false value.
    }

    return () => {
      if (channel) {
        const supabase = createClient();
        void supabase.removeChannel(channel);
      }
    };
  }, [meeting.id, meeting.status, activeSectionKey, router]);

  const activeSection = activeSectionKey
    ? getSectionByKey(meeting.agenda, activeSectionKey)
    : undefined;

  const effectiveDurationMinutes =
    activeSection != null
      ? activeSection.durationMinutes + (durationExtensions[activeSection.key] ?? 0)
      : 0;

  const sectionOvertime =
    activeSection != null &&
    isSectionOvertime(effectiveDurationMinutes, sectionStartedAt, now);

  const sectionRemaining =
    activeSection != null
      ? getSectionRemainingSeconds(effectiveDurationMinutes, sectionStartedAt, now)
      : 0;

  const activeSectionIndex = meeting.agenda.findIndex(
    (step) => step.key === activeSectionKey,
  );
  const nextSectionKey = meeting.agenda[activeSectionIndex + 1]?.key ?? null;

  const showRatingPrompt =
    activeSectionKey === "conclude" &&
    meeting.status === "in_progress" &&
    !ratingDismissed;

  const meetingMetadata =
    typeof meeting.metadata === "object" &&
    meeting.metadata !== null &&
    !Array.isArray(meeting.metadata)
      ? (meeting.metadata as Record<string, unknown>)
      : {};

  const initialCascadingMessages = Array.isArray(meetingMetadata.cascadingMessages)
    ? (meetingMetadata.cascadingMessages as Array<{ label: string; completed: boolean }>)
    : undefined;

  const handleSelectSection = useCallback(
    (sectionKey: string) => {
      if (!canEdit || meeting.status !== "in_progress") return;

      setActiveSectionKey(sectionKey);
      startTransition(async () => {
        const result = await updateActiveSection({
          organizationId,
          meetingId: meeting.id,
          sectionKey,
        });

        if (!result.success) {
          showErrorToast(result.error);
          setActiveSectionKey(
            meeting.active_section_key ?? meeting.agenda[0]?.key ?? null,
          );
          return;
        }

        router.refresh();
      });
    },
    [
      canEdit,
      meeting.active_section_key,
      meeting.agenda,
      meeting.id,
      meeting.status,
      organizationId,
      router,
    ],
  );

  function handleSkipSection() {
    if (!nextSectionKey || !canEdit) return;
    handleSelectSection(nextSectionKey);
  }

  function handleExtendSection() {
    if (!activeSectionKey || !canEdit) return;

    const sectionKey = activeSectionKey;
    const previousExtensions = durationExtensions;
    setDurationExtensions((current) => ({
      ...current,
      [sectionKey]: (current[sectionKey] ?? 0) + 5,
    }));

    startTransition(async () => {
      const result = await extendSectionDuration({
        organizationId,
        meetingId: meeting.id,
        sectionKey,
        extraMinutes: 5,
      });

      if (!result.success) {
        setDurationExtensions(previousExtensions);
        showErrorToast(result.error);
      }
    });
  }

  const noteForSection = meeting.notes.find(
    (note) => note.section_key === activeSectionKey,
  );

  const combinedNotes = meeting.notes
    .map((note) => `[${note.section_key}]\n${note.content}`)
    .join("\n\n");

  function handleStartMeeting() {
    startTransition(async () => {
      const result = await startMeeting({
        organizationId,
        meetingId: meeting.id,
      });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      showSuccessToast("Meeting started");
      router.refresh();
    });
  }

  const exitHref =
    teamSlug != null ? getL10HubHref(orgSlug, teamSlug) : `/org/${orgSlug}/meetings`;

  if (meeting.status === "scheduled") {
    return (
      <div className="space-y-6" data-testid="meeting-scheduled-view">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {meeting.title}
            </h1>
            <p className="text-muted-foreground">
              Ready to start your L10 meeting.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {teamSlug ? (
              <Button variant="outline" asChild>
                <Link href={exitHref}>Back to L10 hub</Link>
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                onClick={handleStartMeeting}
                disabled={isPending}
                data-testid="start-meeting-button"
              >
                {isPending ? "Starting…" : "Start meeting"}
              </Button>
            ) : null}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agenda preview</CardTitle>
          </CardHeader>
          <CardContent>
            <MeetingAgendaPanel
              agenda={meeting.agenda}
              activeSectionKey={null}
              sectionStartedAt={null}
              canEdit={false}
              onSelectSection={() => undefined}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (meeting.status === "completed" || meeting.status === "cancelled") {
    return (
      <div className="space-y-6" data-testid="meeting-completed-view">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {meeting.title}
            </h1>
            <Badge variant="secondary" className="mt-2">
              {meeting.status === "completed" ? "Completed" : "Cancelled"}
            </Badge>
          </div>
          {teamSlug ? (
            <Button variant="outline" asChild>
              <Link href={exitHref}>Back to L10 hub</Link>
            </Button>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Section notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {meeting.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes captured.</p>
              ) : (
                meeting.notes.map((note) => (
                  <div key={note.id}>
                    <p className="text-sm font-medium capitalize">
                      {note.section_key}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {note.content || "—"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <DecisionsList
            organizationId={organizationId}
            meetingId={meeting.id}
            decisions={meeting.decisions}
            canEdit={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0" data-testid="live-meeting-shell">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {meeting.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Live L10
            {realtimeConnected ? " · synced" : " · local mode"}
            {presenceCount > 1 ? ` · ${presenceCount} participants` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setAgendaOpen((open) => !open)}
            data-testid="l10-mobile-agenda-toggle"
          >
            <List className="mr-1 h-4 w-4" />
            Agenda
          </Button>
          {teamSlug ? (
            <Button variant="outline" asChild data-testid="l10-exit-button">
              <Link href={exitHref}>Exit L10</Link>
            </Button>
          ) : null}
          <EndMeetingDialog
            organizationId={organizationId}
            meetingId={meeting.id}
            orgSlug={orgSlug}
            teamSlug={teamSlug}
            canEdit={canEdit}
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden" data-testid="l10-mobile-agenda-strip">
        {meeting.agenda.map((step) => {
          const isActive = step.key === activeSectionKey;
          return (
            <button
              key={step.key}
              type="button"
              disabled={!canEdit}
              onClick={() => handleSelectSection(step.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {step.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside
          className={cn(
            "rounded-lg border p-4",
            agendaOpen ? "block" : "hidden lg:block",
          )}
          data-testid="l10-agenda-sidebar"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Agenda
          </p>
          <MeetingAgendaPanel
            agenda={meeting.agenda}
            activeSectionKey={activeSectionKey}
            sectionStartedAt={sectionStartedAt}
            canEdit={canEdit}
            onSelectSection={handleSelectSection}
            now={now}
            durationExtensions={durationExtensions}
          />
        </aside>

        <main className="space-y-6">
          {activeSection ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium">{activeSection.label}</h2>
                  <p className="text-sm text-muted-foreground">
                    {effectiveDurationMinutes} minute time box
                    {durationExtensions[activeSection.key]
                      ? ` (+${durationExtensions[activeSection.key]}m extended)`
                      : ""}
                  </p>
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExtendSection}
                    >
                      +5 min
                    </Button>
                    {nextSectionKey ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSkipSection}
                        disabled={isPending}
                      >
                        Skip section
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {sectionOvertime ? (
                <div
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  data-testid="section-overtime-alert"
                >
                  Overtime — {formatTimerDisplay(sectionRemaining)} remaining
                </div>
              ) : null}
            </div>
          ) : null}

          {activeSectionKey === "segue" && seguePrompts.length > 0 ? (
            <SeguePromptCard prompts={seguePrompts} />
          ) : null}

          {sectionPanel ?? (
            <MeetingSectionEmbed
              orgSlug={orgSlug}
              teamSlug={teamSlug}
              sectionKey={activeSectionKey ?? ""}
            />
          )}

          {activeSectionKey ? (
            <MeetingNotesEditor
              key={activeSectionKey}
              organizationId={organizationId}
              meetingId={meeting.id}
              sectionKey={activeSectionKey}
              sectionLabel={activeSection?.label ?? activeSectionKey}
              initialContent={noteForSection?.content ?? ""}
              canEdit={canEdit}
            />
          ) : null}

          {activeSectionKey === "conclude" ? (
            <CascadingMessagesChecklist
              organizationId={organizationId}
              meetingId={meeting.id}
              templates={cascadingTemplates.length > 0 ? cascadingTemplates : parseCascadingMessageTemplates(null)}
              initialMessages={initialCascadingMessages}
              canEdit={canEdit}
            />
          ) : null}

          <AiSummaryPanel
            organizationId={organizationId}
            meetingId={meeting.id}
            notes={combinedNotes}
            canUseAi={canEdit}
            initialSuggestions={pendingSuggestions}
          />

          <DecisionsList
            organizationId={organizationId}
            meetingId={meeting.id}
            decisions={meeting.decisions}
            canEdit={canEdit}
          />
        </main>
      </div>

      {canEdit && meeting.status === "in_progress" ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur lg:hidden"
          data-testid="l10-mobile-facilitator-bar"
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {activeSection?.label ?? "Select section"}
              </p>
              <p
                className={cn(
                  "text-xs",
                  sectionOvertime ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {formatTimerDisplay(sectionRemaining)}
                {sectionOvertime ? " overtime" : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" size="sm" variant="outline" onClick={handleExtendSection}>
                +5m
              </Button>
              {nextSectionKey ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSkipSection}
                  disabled={isPending}
                >
                  Next
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <MeetingRatingDialog
        organizationId={organizationId}
        meetingId={meeting.id}
        open={ratingOpen || showRatingPrompt}
        onOpenChange={(open) => {
          setRatingOpen(open);
          if (!open) {
            setRatingDismissed(true);
          }
        }}
      />
    </div>
  );
}
