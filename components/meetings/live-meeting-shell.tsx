"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeetingAgendaPanel } from "@/components/meetings/meeting-agenda-panel";
import { MeetingSectionEmbed } from "@/components/meetings/meeting-section-embed";
import { MeetingNotesEditor } from "@/components/meetings/meeting-notes-editor";
import { DecisionsList } from "@/components/meetings/decisions-list";
import { EndMeetingDialog } from "@/components/meetings/end-meeting-dialog";
import { AiSummaryPanel } from "@/components/ai/ai-summary-panel";
import {
  startMeeting,
  updateActiveSection,
} from "@/features/meetings/actions";
import type { MeetingWithNotes } from "@/features/meetings/types";
import { getSectionByKey } from "@/features/meetings/utils";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface LiveMeetingShellProps {
  organizationId: string;
  orgSlug: string;
  meeting: MeetingWithNotes;
  canEdit: boolean;
}

export function LiveMeetingShell({
  organizationId,
  orgSlug,
  meeting: initialMeeting,
  canEdit,
}: LiveMeetingShellProps) {
  const router = useRouter();
  const meeting = initialMeeting;
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(
    initialMeeting.active_section_key ?? initialMeeting.agenda[0]?.key ?? null,
  );
  const [sectionStartedAt, setSectionStartedAt] = useState<Date | null>(
    initialMeeting.started_at ? new Date(initialMeeting.started_at) : null,
  );
  const [now, setNow] = useState(() => new Date());
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [isPending, startTransition] = useTransition();
  const prevSectionRef = useRef(activeSectionKey);

  useEffect(() => {
    if (meeting.status !== "in_progress") {
      return;
    }

    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [meeting.status]);

  useEffect(() => {
    if (prevSectionRef.current !== activeSectionKey) {
      setSectionStartedAt(new Date());
      prevSectionRef.current = activeSectionKey;
    }
  }, [activeSectionKey]);

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
            const nextKey = (payload.new as { active_section_key?: string | null })
              .active_section_key;
            if (nextKey) {
              setActiveSectionKey(nextKey);
            }
          },
        )
        .subscribe((status) => {
          setRealtimeConnected(status === "SUBSCRIBED");
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
  }, [meeting.id, meeting.status]);

  const activeSection = activeSectionKey
    ? getSectionByKey(meeting.agenda, activeSectionKey)
    : undefined;

  const noteForSection = meeting.notes.find(
    (note) => note.section_key === activeSectionKey,
  );

  const combinedNotes = meeting.notes
    .map((note) => `[${note.section_key}]\n${note.content}`)
    .join("\n\n");

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
        }
      });
    },
    [canEdit, meeting.active_section_key, meeting.id, meeting.status, organizationId],
  );

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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {meeting.title}
          </h1>
          <Badge variant="secondary" className="mt-2">
            {meeting.status === "completed" ? "Completed" : "Cancelled"}
          </Badge>
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
    <div className="space-y-6" data-testid="live-meeting-shell">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {meeting.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Live L10
            {realtimeConnected ? " · synced" : " · local mode"}
          </p>
        </div>
        <EndMeetingDialog
          organizationId={organizationId}
          meetingId={meeting.id}
          orgSlug={orgSlug}
          canEdit={canEdit}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border p-4">
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
          />
        </aside>

        <main className="space-y-6">
          {activeSection ? (
            <div>
              <h2 className="text-lg font-medium">{activeSection.label}</h2>
              <p className="text-sm text-muted-foreground">
                {activeSection.durationMinutes} minute time box
              </p>
            </div>
          ) : null}

          <MeetingSectionEmbed orgSlug={orgSlug} sectionKey={activeSectionKey ?? ""} />

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

          <AiSummaryPanel
            organizationId={organizationId}
            meetingId={meeting.id}
            notes={combinedNotes}
            canUseAi={canEdit}
          />

          <DecisionsList
            organizationId={organizationId}
            meetingId={meeting.id}
            decisions={meeting.decisions}
            canEdit={canEdit}
          />
        </main>
      </div>
    </div>
  );
}
