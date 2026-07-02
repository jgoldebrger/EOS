"use client";

import { useMemo, useState } from "react";
import { createHeadline } from "@/features/headlines/actions";
import { sendCascades } from "@/features/cascades/actions";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { EditHeadlineSheet, type HeadlineItem } from "@/components/headlines/edit-headline-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Megaphone, Pencil } from "lucide-react";

interface HeadlinesWorkspaceProps {
  organizationId: string;
  orgSlug: string;
  teamId: string;
  canCreate: boolean;
  headlines: HeadlineItem[];
  targetTeams?: Array<{ id: string; name: string }>;
  variant?: "page" | "meeting";
  meetingId?: string;
}

export function HeadlinesWorkspace({
  organizationId,
  orgSlug,
  teamId,
  canCreate,
  headlines: initial,
  targetTeams = [],
  variant = "page",
  meetingId,
}: HeadlinesWorkspaceProps) {
  const [headlines, setHeadlines] = useState(initial);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<"customer" | "employee">("customer");
  const [isCascading, setIsCascading] = useState(false);
  const [filter, setFilter] = useState<"active" | "cascading" | "archived">("active");
  const [editHeadline, setEditHeadline] = useState<HeadlineItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const visibleHeadlines = useMemo(() => {
    return headlines.filter((headline) => {
      if (filter === "archived") return Boolean(headline.archived_at);
      if (headline.archived_at) return false;
      if (filter === "cascading") return headline.is_cascading;
      return true;
    });
  }, [headlines, filter]);

  async function handleCreate() {
    if (!title.trim()) return;
    const result = await createHeadline({
      organizationId,
      teamId,
      title: title.trim(),
      body: body.trim() || undefined,
      headlineType: type,
      meetingId: meetingId ?? null,
      isCascading,
    });
    if (result.success) {
      setHeadlines([
        {
          id: result.headlineId ?? crypto.randomUUID(),
          title: title.trim(),
          body: body.trim(),
          headline_type: type,
          is_cascading: isCascading,
          created_at: new Date().toISOString(),
        },
        ...headlines,
      ]);
      setTitle("");
      setBody("");
      setIsCascading(false);
    }
  }

  function openEdit(headline: HeadlineItem) {
    setEditHeadline(headline);
    setEditOpen(true);
  }

  async function handleSendCascade(headline: HeadlineItem) {
    const targetTeamIds = targetTeams.map((team) => team.id);
    if (targetTeamIds.length === 0) {
      showErrorToast("No downstream teams to cascade to");
      return;
    }

    const result = await sendCascades({
      organizationId,
      orgSlug,
      sourceTeamId: teamId,
      sourceType: "headline",
      sourceId: headline.id,
      sourceLabel: headline.title,
      targetTeamIds,
    });

    if (!result.success) {
      showErrorToast("Could not send cascade", result.error);
      return;
    }

    showSuccessToast(`Cascade sent to ${result.deliveredCount ?? targetTeamIds.length} team(s)`);
  }

  return (
    <div className={variant === "meeting" ? "space-y-4" : "space-y-6"} data-testid="headlines-workspace">
      {variant === "meeting" ? (
        <p className="text-sm text-muted-foreground">
          Share customer and employee headlines.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={filter === "active" ? "default" : "outline"}
            onClick={() => setFilter("active")}
          >
            Active
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "cascading" ? "default" : "outline"}
            onClick={() => setFilter("cascading")}
          >
            Cascading
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "archived" ? "default" : "outline"}
            onClick={() => setFilter("archived")}
          >
            Archived
          </Button>
        </div>
      )}
      {canCreate && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Headline title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="max-w-md"
              aria-label="Headline title"
            />
            <select
              className="h-9 rounded-md border px-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as "customer" | "employee")}
              aria-label="Headline type"
            >
              <option value="customer">Customer</option>
              <option value="employee">Employee</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isCascading}
                onChange={(e) => setIsCascading(e.target.checked)}
              />
              Cascade
            </label>
            <Button onClick={handleCreate}>Add headline</Button>
          </div>
          <textarea
            placeholder="Details (optional)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex min-h-16 w-full max-w-xl rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label="Headline body"
          />
        </div>
      )}
      {visibleHeadlines.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title="No headlines"
          description="Share customer and employee wins with your team."
        />
      ) : (
        <div className="space-y-3">
          {visibleHeadlines.map((h) => (
            <Card key={h.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{h.title}</CardTitle>
                    <Badge variant="secondary" className="capitalize">
                      {h.headline_type}
                    </Badge>
                    {h.is_cascading ? <Badge variant="outline">Cascade</Badge> : null}
                  </div>
                  {canCreate ? (
                    <div className="flex gap-1">
                      {h.is_cascading && targetTeams.length > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleSendCascade(h)}
                        >
                          Send cascade
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => openEdit(h)}
                        aria-label="Edit headline"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              {h.body ? (
                <CardContent className="text-sm text-muted-foreground">{h.body}</CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <EditHeadlineSheet
        headline={editHeadline}
        organizationId={organizationId}
        canEdit={canCreate}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={(updated) =>
          setHeadlines((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          )
        }
        onArchived={(headlineId) =>
          setHeadlines((current) => current.filter((item) => item.id !== headlineId))
        }
      />
    </div>
  );
}
