"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateL10MeetingButton } from "@/components/meetings/create-l10-meeting-button";
import { PageHeader } from "@/components/shared/page-header";
import type { MeetingListItem, MeetingTeamOption } from "@/features/meetings/types";
import {
  isUpcomingMeeting,
  meetingStatusLabel,
} from "@/features/meetings/utils";

interface MeetingsListPageProps {
  organizationId: string;
  orgSlug: string;
  canEdit: boolean;
  meetings: MeetingListItem[];
  teams: MeetingTeamOption[];
}

function MeetingRow({
  meeting,
  orgSlug,
}: {
  meeting: MeetingListItem;
  orgSlug: string;
}) {
  const href = `/org/${orgSlug}/meetings/${meeting.id}`;
  const dateLabel = meeting.started_at
    ? new Date(meeting.started_at).toLocaleString()
    : new Date(meeting.created_at).toLocaleString();

  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
      data-testid="meeting-list-item"
    >
      <div className="space-y-1">
        <p className="font-medium">{meeting.title}</p>
        <p className="text-sm text-muted-foreground">
          {dateLabel}
          {meeting.teamName ? ` · ${meeting.teamName}` : ""}
        </p>
      </div>
      <Badge variant={meeting.status === "in_progress" ? "default" : "secondary"}>
        {meetingStatusLabel(meeting.status)}
      </Badge>
    </Link>
  );
}

export function MeetingsListPage({
  organizationId,
  orgSlug,
  canEdit,
  meetings,
  teams,
}: MeetingsListPageProps) {
  const upcoming = meetings.filter((m) => isUpcomingMeeting(m.status));
  const past = meetings.filter((m) => !isUpcomingMeeting(m.status));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Meetings"
        description="Run Level 10 meetings with a structured agenda, section notes, and decisions."
        actions={
          canEdit ? (
            <CreateL10MeetingButton
              organizationId={organizationId}
              orgSlug={orgSlug}
              teams={teams}
            />
          ) : undefined
        }
      />

      <div className="grid gap-8 lg:grid-cols-2" data-testid="meetings-list">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming & active</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming meetings"
                description={
                  canEdit
                    ? "Create an L10 to get started."
                    : "No scheduled meetings yet."
                }
              />
            ) : (
              upcoming.map((meeting) => (
                <MeetingRow key={meeting.id} meeting={meeting} orgSlug={orgSlug} />
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
                description="Completed meetings will appear here."
              />
            ) : (
              past.map((meeting) => (
                <MeetingRow key={meeting.id} meeting={meeting} orgSlug={orgSlug} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
