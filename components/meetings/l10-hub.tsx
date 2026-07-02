"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { CreateL10MeetingButton } from "@/components/meetings/create-l10-meeting-button";
import type { L10AgendaTemplate, MeetingListItem } from "@/features/meetings/types";
import {
  formatSectionDuration,
  getL10MeetingHref,
  getTotalAgendaMinutes,
  isUpcomingMeeting,
  meetingStatusLabel,
} from "@/features/meetings/utils";

interface L10HubProps {
  organizationId: string;
  orgSlug: string;
  teamSlug: string;
  teamId: string;
  teamName: string;
  canEdit: boolean;
  canManageAgenda: boolean;
  agendaTemplate: L10AgendaTemplate;
  meetings: MeetingListItem[];
  inProgressMeeting: MeetingListItem | null;
}

function MeetingHistoryRow({
  meeting,
  orgSlug,
  teamSlug,
}: {
  meeting: MeetingListItem;
  orgSlug: string;
  teamSlug: string;
}) {
  const href = getL10MeetingHref(orgSlug, teamSlug, meeting.id);
  const dateLabel = meeting.started_at
    ? new Date(meeting.started_at).toLocaleString()
    : new Date(meeting.created_at).toLocaleString();

  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
      data-testid="l10-meeting-history-item"
    >
      <div className="space-y-1">
        <p className="font-medium">{meeting.title}</p>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      </div>
      <Badge variant={meeting.status === "in_progress" ? "default" : "secondary"}>
        {meetingStatusLabel(meeting.status)}
      </Badge>
    </Link>
  );
}

export function L10Hub({
  organizationId,
  orgSlug,
  teamSlug,
  teamId,
  teamName,
  canEdit,
  canManageAgenda,
  agendaTemplate,
  meetings,
  inProgressMeeting,
}: L10HubProps) {
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("create") === "meeting") {
      setCreateOpen(true);
    }
  }, [searchParams]);

  const upcoming = meetings.filter((m) => isUpcomingMeeting(m.status));
  const past = meetings.filter((m) => !isUpcomingMeeting(m.status));

  return (
    <div className="space-y-8" data-testid="l10-hub">
      <PageHeader
        title="L10"
        description={`Run Level 10 meetings for ${teamName} — scorecard, rocks, issues, and more in one place.`}
        actions={
          canEdit ? (
            <CreateL10MeetingButton
              organizationId={organizationId}
              orgSlug={orgSlug}
              teamId={teamId}
              teamSlug={teamSlug}
              defaultOpen={createOpen}
              onOpenChange={setCreateOpen}
            />
          ) : undefined
        }
      />

      <Card data-testid="l10-agenda-summary">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Agenda timings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            New meetings use{" "}
            <span className="font-medium text-foreground">
              {formatSectionDuration(getTotalAgendaMinutes(agendaTemplate))}
            </span>{" "}
            across {agendaTemplate.length} sections.
          </p>
          <div className="flex flex-wrap gap-2">
            {agendaTemplate.map((step) => (
              <Badge key={step.key} variant="secondary">
                {step.label}: {formatSectionDuration(step.durationMinutes)}
              </Badge>
            ))}
          </div>
          {canManageAgenda ? (
            <Button asChild variant="outline" size="sm" data-testid="l10-agenda-settings-link">
              <Link href={`/org/${orgSlug}/settings/l10`}>Edit agenda timings</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {inProgressMeeting ? (
        <Card className="border-primary/40 bg-primary/5" data-testid="l10-resume-banner">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Meeting in progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {inProgressMeeting.title} started{" "}
              {inProgressMeeting.started_at
                ? new Date(inProgressMeeting.started_at).toLocaleString()
                : "recently"}
            </p>
            <Button asChild data-testid="l10-resume-button">
              <Link href={getL10MeetingHref(orgSlug, teamSlug, inProgressMeeting.id)}>
                Resume L10
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2" data-testid="l10-meetings-list">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming & active</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming L10 meetings"
                description={
                  canEdit
                    ? "Start an L10 to walk through the agenda with your team."
                    : "No scheduled meetings yet."
                }
              />
            ) : (
              upcoming.map((meeting) => (
                <MeetingHistoryRow
                  key={meeting.id}
                  meeting={meeting}
                  orgSlug={orgSlug}
                  teamSlug={teamSlug}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Past meetings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {past.length === 0 ? (
              <EmptyState
                title="No past meetings"
                description="Completed L10 meetings will appear here."
              />
            ) : (
              past.map((meeting) => (
                <MeetingHistoryRow
                  key={meeting.id}
                  meeting={meeting}
                  orgSlug={orgSlug}
                  teamSlug={teamSlug}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
