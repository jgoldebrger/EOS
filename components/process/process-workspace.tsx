"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createProcessPage,
  deleteProcessPage,
} from "@/features/process/actions";
import type { ProcessPageListItem } from "@/features/process/types";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

interface ProcessWorkspaceProps {
  organizationId: string;
  orgSlug: string;
  teamId: string | null;
  teamSlug?: string;
  canEdit: boolean;
  scopeLabel: string;
  pages: ProcessPageListItem[];
  processBasePath: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProcessWorkspace({
  organizationId,
  orgSlug,
  teamId,
  teamSlug,
  canEdit,
  scopeLabel,
  pages: initialPages,
  processBasePath,
}: ProcessWorkspaceProps) {
  const router = useRouter();
  const [pages, setPages] = useState(initialPages);
  const [isPending, startTransition] = useTransition();

  function pageViewHref(pageId: string) {
    return `${processBasePath}/${pageId}`;
  }

  function pageEditHref(pageId: string) {
    return `${processBasePath}/${pageId}/edit`;
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createProcessPage({
        organizationId,
        orgSlug,
        teamId,
        teamSlug,
        title: "New SOP",
      });

      if (!result.success) {
        showErrorToast("Could not create SOP", result.error);
        return;
      }
      if (!result.id) {
        showErrorToast("Could not create SOP", "Missing page id");
        return;
      }

      showSuccessToast("SOP created");
      router.push(pageEditHref(result.id));
    });
  }

  function handleDelete(page: ProcessPageListItem) {
    if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteProcessPage({
        id: page.id,
        organizationId,
        orgSlug,
        teamId,
        teamSlug,
      });

      if (!result.success) {
        showErrorToast("Could not delete SOP", result.error);
        return;
      }

      setPages((current) => current.filter((item) => item.id !== page.id));
      showSuccessToast("SOP deleted");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6" data-testid="process-workspace">
      <PageHeader
        title="Process"
        description={`${scopeLabel} standard operating procedures`}
        actions={
          canEdit ? (
            <Button onClick={handleCreate} disabled={isPending}>
              <Plus className="mr-2 size-4" />
              Create SOP
            </Button>
          ) : null
        }
      />

      {pages.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No process docs"
          description="Create your first SOP with the step-by-step builder."
          action={
            canEdit ? (
              <Button onClick={handleCreate} disabled={isPending}>
                <Plus className="mr-2 size-4" />
                Create SOP
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <Card key={page.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    <Link href={pageViewHref(page.id)} className="hover:underline">
                      {page.title}
                    </Link>
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Updated {formatDate(page.updated_at)}</span>
                    <Badge variant="secondary">
                      {page.content_format === "sop" ? "SOP" : "Text"}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={pageViewHref(page.id)}>View</Link>
                  </Button>
                  {canEdit ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={pageEditHref(page.id)}>
                          <Pencil className="mr-1 size-3.5" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(page)}
                        disabled={isPending}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        Delete
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardHeader>
              {page.content ? (
                <CardContent className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {page.content.replace(/^#+\s+/gm, "").slice(0, 280)}
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
