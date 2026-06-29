"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Archive, CheckCircle2, Link2 } from "lucide-react";
import { archiveIssue, solveIssue, updateIssue } from "@/features/issues/actions";
import type { IssueWithLinks } from "@/features/issues/types";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface IssueDetailSheetProps {
  issue: IssueWithLinks | null;
  orgSlug: string;
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IssueDetailContentProps {
  issue: IssueWithLinks;
  orgSlug: string;
  canEdit: boolean;
  onClose: () => void;
}

function IssueDetailContent({
  issue,
  orgSlug,
  canEdit,
  onClose,
}: IssueDetailContentProps) {
  const [idsNotes, setIdsNotes] = useState(issue.ids_notes ?? "");
  const [solveOpen, setSolveOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSaveNotes() {
    startTransition(async () => {
      const result = await updateIssue({
        organizationId: issue.organization_id,
        issueId: issue.id,
        idsNotes: idsNotes || null,
        status:
          issue.status === "open" && idsNotes.trim()
            ? "discussing"
            : issue.status,
      });

      if (!result.success) {
        showErrorToast("Could not save notes", result.error);
        return;
      }

      showSuccessToast("IDS notes saved");
    });
  }

  function handleSolve() {
    startTransition(async () => {
      const result = await solveIssue({
        organizationId: issue.organization_id,
        issueId: issue.id,
        idsNotes: idsNotes || null,
      });

      if (!result.success) {
        showErrorToast("Could not solve issue", result.error);
        return;
      }

      showSuccessToast("Issue solved");
      setSolveOpen(false);
      onClose();
    });
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveIssue({
        organizationId: issue.organization_id,
        issueId: issue.id,
      });

      if (!result.success) {
        showErrorToast("Could not archive issue", result.error);
        return;
      }

      showSuccessToast("Issue archived");
      setArchiveOpen(false);
      onClose();
    });
  }

  return (
    <>
      <SheetHeader className="space-y-3 text-left">
        <div className="flex items-start justify-between gap-3 pr-8">
          <SheetTitle className="text-xl leading-snug">{issue.title}</SheetTitle>
          <StatusBadge status={issue.status} />
        </div>
        <SheetDescription>
          Rank #{issue.priorityRank} · Priority score {issue.priority}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        {issue.description && (
          <section className="space-y-1">
            <h3 className="text-sm font-medium">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {issue.description}
            </p>
          </section>
        )}

        {(issue.linkedMetricName || issue.linkedRockTitle) && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Linked items</h3>
            <ul className="space-y-2 text-sm">
              {issue.linkedMetricName && issue.linked_metric_id && (
                <li>
                  <Link
                    href={`/org/${orgSlug}/scorecard`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Link2 className="h-3.5 w-3.5" aria-hidden />
                    Metric: {issue.linkedMetricName}
                  </Link>
                </li>
              )}
              {issue.linkedRockTitle && issue.linked_rock_id && (
                <li>
                  <Link
                    href={`/org/${orgSlug}/rocks`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Link2 className="h-3.5 w-3.5" aria-hidden />
                    Rock: {issue.linkedRockTitle}
                  </Link>
                </li>
              )}
            </ul>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-medium">IDS notes</h3>
          <p className="text-xs text-muted-foreground">
            Identify root cause, Discuss options, and document the Solve.
          </p>
          <textarea
            className="flex min-h-36 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            value={idsNotes}
            onChange={(event) => setIdsNotes(event.target.value)}
            placeholder="Capture Identify → Discuss → Solve notes…"
            disabled={!canEdit || issue.status === "archived"}
            data-testid="issue-ids-notes"
          />
          {canEdit && issue.status !== "archived" && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSaveNotes}
              disabled={isPending}
              data-testid="issue-save-notes"
            >
              Save notes
            </Button>
          )}
        </section>

        {canEdit && issue.status !== "archived" && issue.status !== "solved" && (
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              type="button"
              onClick={() => setSolveOpen(true)}
              disabled={isPending}
              data-testid="issue-solve-button"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
              Mark solved
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setArchiveOpen(true)}
              disabled={isPending}
              data-testid="issue-archive-button"
            >
              <Archive className="mr-2 h-4 w-4" aria-hidden />
              Archive
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={solveOpen}
        onOpenChange={setSolveOpen}
        title="Mark issue as solved?"
        description="This will move the issue to solved status. IDS notes will be saved."
        confirmLabel="Solve"
        isLoading={isPending}
        onConfirm={handleSolve}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this issue?"
        description="Archived issues are hidden from the default list but remain searchable."
        confirmLabel="Archive"
        isLoading={isPending}
        onConfirm={handleArchive}
      />
    </>
  );
}

export function IssueDetailSheet({
  issue,
  orgSlug,
  canEdit,
  open,
  onOpenChange,
}: IssueDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {issue ? (
          <IssueDetailContent
            key={issue.id}
            issue={issue}
            orgSlug={orgSlug}
            canEdit={canEdit}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
