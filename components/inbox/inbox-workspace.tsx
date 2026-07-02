"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  archiveInboxItem,
  markAllInboxRead,
  markInboxRead,
} from "@/features/inbox/actions";
import type { InboxItem } from "@/features/inbox/queries";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Inbox } from "lucide-react";

interface InboxWorkspaceProps {
  organizationId: string;
  orgSlug: string;
  items: InboxItem[];
}

export function InboxWorkspace({
  organizationId,
  orgSlug,
  items: initialItems,
}: InboxWorkspaceProps) {
  const [items, setItems] = useState(initialItems);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!showArchived && item.archived_at) return false;
      if (showArchived && !item.archived_at) return false;
      if (typeFilter === "all") return true;
      return item.source_type === typeFilter;
    });
  }, [items, typeFilter, showArchived]);

  function handleMarkRead(itemId: string) {
    startTransition(async () => {
      const result = await markInboxRead({ organizationId, itemId });
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      setItems((current) =>
        current.map((item) =>
          item.id === itemId ? { ...item, read_at: new Date().toISOString() } : item,
        ),
      );
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      const result = await markAllInboxRead({ organizationId, orgSlug });
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      showSuccessToast("All items marked read");
      setItems((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })),
      );
    });
  }

  function handleArchive(itemId: string) {
    startTransition(async () => {
      const result = await archiveInboxItem({ organizationId, itemId });
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      setItems((current) =>
        current.map((item) =>
          item.id === itemId ? { ...item, archived_at: new Date().toISOString() } : item,
        ),
      );
    });
  }

  return (
    <div className="space-y-4" data-testid="inbox-workspace">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-md border px-2 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          <option value="todo">To-dos</option>
          <option value="issue">Issues</option>
          <option value="rock">Rocks</option>
          <option value="assignment">Assignments</option>
        </select>
        <Button
          type="button"
          size="sm"
          variant={showArchived ? "default" : "outline"}
          onClick={() => setShowArchived((value) => !value)}
        >
          {showArchived ? "Active" : "Archived"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={handleMarkAllRead}
        >
          Mark all read
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title={showArchived ? "No archived items" : "Inbox zero"}
          description={
            showArchived
              ? "Archived items will appear here."
              : "No assigned items right now."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className={item.read_at ? "opacity-80" : "border-primary/30"}
              data-testid="inbox-item-card"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    {item.action_url ? (
                      <Link href={item.action_url} className="hover:underline">
                        {item.title}
                      </Link>
                    ) : (
                      item.title
                    )}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {item.source_type ? (
                      <Badge variant="outline" className="capitalize">
                        {item.source_type}
                      </Badge>
                    ) : null}
                    {!item.read_at ? <Badge>New</Badge> : null}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!item.read_at ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleMarkRead(item.id)}
                    >
                      Mark read
                    </Button>
                  ) : null}
                  {!item.archived_at ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleArchive(item.id)}
                    >
                      Archive
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              {item.body ? (
                <CardContent className="text-sm text-muted-foreground">{item.body}</CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
