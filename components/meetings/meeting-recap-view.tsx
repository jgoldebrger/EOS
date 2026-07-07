"use client";

import Link from "next/link";
import { useState } from "react";
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
  const { meeting, headlines, todos, issues, idsRecap, pendingSuggestions } = recap;
  const [copied, setCopied] = useState(false);
  const recapUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/org/${orgSlug}/teams/${teamSlug}/l10/${meeting.id}/recap`
      : `/org/${orgSlug}/teams/${teamSlug}/l10/${meeting.id}/recap`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(recapUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

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
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyLink}
            data-testid="copy-recap-link"
          >
            {copied ? "Link copied" : "Copy recap link"}
          </Button>
          <Button variant="outline" asChild>
            <Link href={getL10HubHref(orgSlug, teamSlug)}>Back to L10 hub</Link>
          </Button>
        </div>
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

      <Card data-testid="meeting-recap-ids">
        <CardHeader>
          <CardTitle className="text-lg">IDS summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{idsRecap?.solvedCount ?? 0}</p>
              <p className="text-muted-foreground">Solved</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">
                {idsRecap?.parkingLotCount ?? 0}
              </p>
              <p className="text-muted-foreground">Parking lot</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">
                {idsRecap?.pinnedIssueIds.length ?? 0}
              </p>
              <p className="text-muted-foreground">Top 3 pinned</p>
            </div>
          </div>

          {(idsRecap?.focusLog.length ?? 0) > 0 ? (
            <div>
              <p className="mb-2 font-medium">Focus time</p>
              <ul className="space-y-1 text-muted-foreground">
                {idsRecap?.focusLog.map((entry) => (
                  <li key={`${entry.issueId}-${entry.secondsSpent}`}>
                    {entry.title} — {Math.max(1, Math.round(entry.secondsSpent / 60))} min
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Issues discussed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {issues.length === 0 ? (
            <p className="text-muted-foreground">No issues linked to this meeting.</p>
          ) : (
            issues.map((issue) => (
              <div key={issue.id} className="space-y-1">
                <p>
                  {issue.priorityRank ? (
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {issue.priorityRank}
                    </span>
                  ) : null}
                  {issue.title}{" "}
                  <span className="text-muted-foreground capitalize">
                    ({issue.is_parking_lot ? "parking lot" : issue.status})
                  </span>
                </p>
                {issue.ids_notes ? (
                  <p className="text-muted-foreground">{issue.ids_notes}</p>
                ) : null}
              </div>
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
