"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MeetingDecision } from "@/features/meetings/types";
import { CreateDecisionDialog } from "@/components/meetings/create-decision-dialog";

interface DecisionsListProps {
  organizationId: string;
  meetingId: string;
  decisions: MeetingDecision[];
  canEdit: boolean;
}

export function DecisionsList({
  organizationId,
  meetingId,
  decisions,
  canEdit,
}: DecisionsListProps) {
  return (
    <Card data-testid="decisions-list">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Decisions</CardTitle>
        <CreateDecisionDialog
          organizationId={organizationId}
          meetingId={meetingId}
          canEdit={canEdit}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {decisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No decisions recorded yet.
          </p>
        ) : (
          decisions.map((decision) => (
            <div
              key={decision.id}
              className="rounded-md border p-3"
              data-testid="decision-item"
            >
              <p className="font-medium">{decision.title}</p>
              {decision.description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {decision.description}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {decision.deciderLabel}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
