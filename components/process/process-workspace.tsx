"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  FileText,
  FolderTree,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  archiveProcessPage,
  createProcessPage,
  deleteProcessPage,
} from "@/features/process/actions";
import {
  DEFAULT_PROCESS_CATEGORY,
  filterProcessPages,
  flattenProcessPageTree,
  getProcessCategories,
} from "@/features/process/list-utils";
import type { ProcessPageListItem } from "@/features/process/types";
import { TagBadges } from "@/components/scorecard/tag-picker";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(DEFAULT_PROCESS_CATEGORY);
  const [showArchived, setShowArchived] = useState(false);
  const [isPending, startTransition] = useTransition();

  const categories = useMemo(() => getProcessCategories(pages), [pages]);

  const filteredPages = useMemo(
    () =>
      filterProcessPages(pages, {
        search,
        category,
        showArchived,
      }),
    [pages, search, category, showArchived],
  );

  const visibleNodes = useMemo(
    () => flattenProcessPageTree(filteredPages),
    [filteredPages],
  );

  const hasActiveFilters =
    search.trim().length > 0 ||
    category !== DEFAULT_PROCESS_CATEGORY ||
    showArchived;

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

  function handleArchive(page: ProcessPageListItem) {
    if (!confirm(`Archive "${page.title}"? It will be hidden from the default list.`)) {
      return;
    }

    startTransition(async () => {
      const result = await archiveProcessPage({
        id: page.id,
        organizationId,
        orgSlug,
        teamId,
        teamSlug,
        archived: true,
      });

      if (!result.success) {
        showErrorToast("Could not archive SOP", result.error);
        return;
      }

      setPages((current) =>
        current.map((item) =>
          item.id === page.id
            ? { ...item, archived_at: new Date().toISOString() }
            : item,
        ),
      );
      showSuccessToast("SOP archived");
      router.refresh();
    });
  }

  function handleDelete(page: ProcessPageListItem) {
    if (!confirm(`Permanently delete "${page.title}"? This cannot be undone.`)) {
      return;
    }

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

      {pages.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title…"
              className="pl-9"
              aria-label="Search process pages"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
              className="size-4 rounded border-input"
            />
            Show archived
          </label>
        </div>
      ) : null}

      {pages.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No SOPs yet"
          description="Document how work gets done with step-by-step procedures your team can follow and improve over time."
          action={
            canEdit ? (
              <Button onClick={handleCreate} disabled={isPending}>
                <Plus className="mr-2 size-4" />
                Create your first SOP
              </Button>
            ) : undefined
          }
        />
      ) : visibleNodes.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="No matching SOPs"
          description={
            hasActiveFilters
              ? "Try a different search term, category, or enable archived items."
              : "Nothing to show with the current filters."
          }
          action={
            hasActiveFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setCategory(DEFAULT_PROCESS_CATEGORY);
                  setShowArchived(false);
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {visibleNodes.map(({ page, depth }) => (
            <Card
              key={page.id}
              className={cn(
                page.archived_at && "border-dashed opacity-80",
                depth > 0 && "border-l-2 border-l-muted-foreground/25",
              )}
              style={depth > 0 ? { marginLeft: `${depth * 1.25}rem` } : undefined}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {depth > 0 ? (
                      <FolderTree
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    ) : null}
                    <Link href={pageViewHref(page.id)} className="truncate hover:underline">
                      {page.title}
                    </Link>
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Updated {formatDate(page.updated_at)}</span>
                    <Badge variant="secondary">
                      {page.content_format === "sop" ? "SOP" : "Text"}
                    </Badge>
                    <Badge variant="outline">{page.category}</Badge>
                    {page.archived_at ? (
                      <Badge variant="secondary" className="text-muted-foreground">
                        Archived
                      </Badge>
                    ) : null}
                    {page.tags.length > 0 ? (
                      <TagBadges tags={page.tags} />
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={pageViewHref(page.id)}>View</Link>
                  </Button>
                  {canEdit && !page.archived_at ? (
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
                        onClick={() => handleArchive(page)}
                        disabled={isPending}
                      >
                        <Archive className="mr-1 size-3.5" />
                        Archive
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
                  {canEdit && page.archived_at ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(page)}
                      disabled={isPending}
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      Delete
                    </Button>
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
