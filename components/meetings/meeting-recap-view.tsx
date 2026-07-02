"use client";

import Link from "next/link";
import { AiApprovalPanel } from "@/components/ai/ai-approval-panel";
import { DecisionsList } from "@/components/meetings/decisions-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MeetingRecapData } from "@/features/meetings/queries";
import { formatSectionDuration, getL10HubHref } from "@/features/meetings/utils";

interface MeetingRecapViewProps {
  organizationId: string;
  orgSlug: string;
  teamSlug: string;
  recap: MeetingRecapData;
}

export function MeetingRecapView({
  organizationId,
  orgSlug,
  teamSlug,
  recap,
}: MeetingRecapViewProps) {
  const { meeting, headlines, todos, issues, pendingSuggestions } = recap;

  return (
    <div className="space-y-8" data-testid="meeting-recap-view">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground">L10 meeting recap</p>
          <Badge variant="secondary" className="mt-2">
            Completed
          </Badge>
        </div>
        <Button variant="outline" asChild>
          <Link href={getL10HubHref(orgSlug, teamSlug)}>Back to L10 hub</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agenda timing</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {meeting.agenda.map((step) => (
              <li key={step.key} className="flex justify-between gap-4">
                <span>{step.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatSectionDuration(step.durationMinutes)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <DecisionsList
        organizationId={organizationId}
        meetingId={meeting.id}
        decisions={meeting.decisions}
        canEdit={false}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Headlines captured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {headlines.length === 0 ? (
              <p className="text-muted-foreground">No headlines from this meeting.</p>
            ) : (
              headlines.map((headline) => (
                <div key={headline.id}>
                  <p className="font-medium">{headline.title}</p>
                  {headline.body ? (
                    <p className="text-muted-foreground">{headline.body}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">To-dos created</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {todos.length === 0 ? (
              <p className="text-muted-foreground">No meeting-linked to-dos.</p>
            ) : (
              todos.map((todo) => (
                <p key={todo.id}>
                  {todo.title}{" "}
                  <span className="text-muted-foreground capitalize">({todo.status})</span>
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Issues discussed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {issues.length === 0 ? (
            <p className="text-muted-foreground">No issues linked to this meeting.</p>
          ) : (
            issues.map((issue) => (
              <p key={issue.id}>
                {issue.title}{" "}
                <span className="text-muted-foreground capitalize">({issue.status})</span>
              </p>
            ))
          )}
        </CardContent>
      </Card>

      <AiApprovalPanel
        suggestions={pendingSuggestions}
        title="Pending AI suggestions"
        emptyMessage="All AI suggestions have been reviewed."
      />
    </div>
  );
}
