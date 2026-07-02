"use client";

import { useState } from "react";
import { createHeadline } from "@/features/headlines/actions";
import { EditHeadlineSheet, type HeadlineItem } from "@/components/headlines/edit-headline-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Megaphone, Pencil } from "lucide-react";

interface HeadlinesWorkspaceProps {
  organizationId: string;
  teamId: string;
  canCreate: boolean;
  headlines: HeadlineItem[];
  variant?: "page" | "meeting";
  meetingId?: string;
}

export function HeadlinesWorkspace({
  organizationId,
  teamId,
  canCreate,
  headlines: initial,
  variant = "page",
  meetingId,
}: HeadlinesWorkspaceProps) {
  const [headlines, setHeadlines] = useState(initial);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<"customer" | "employee">("customer");
  const [editHeadline, setEditHeadline] = useState<HeadlineItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    const result = await createHeadline({
      organizationId,
      teamId,
      title: title.trim(),
      body: body.trim() || undefined,
      headlineType: type,
      meetingId: meetingId ?? null,
    });
    if (result.success) {
      setHeadlines([
        {
          id: result.headlineId ?? crypto.randomUUID(),
          title: title.trim(),
          body: body.trim(),
          headline_type: type,
          created_at: new Date().toISOString(),
        },
        ...headlines,
      ]);
      setTitle("");
      setBody("");
    }
  }

  function openEdit(headline: HeadlineItem) {
    setEditHeadline(headline);
    setEditOpen(true);
  }

  return (
    <div className={variant === "meeting" ? "space-y-4" : "space-y-6"}>
      {variant === "meeting" ? (
        <p className="text-sm text-muted-foreground">
          Share customer and employee headlines.
        </p>
      ) : null}
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
      {headlines.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title="No headlines"
          description="Share customer and employee wins with your team."
        />
      ) : (
        <div className="space-y-3">
          {headlines.map((h) => (
            <Card key={h.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{h.title}</CardTitle>
                    <Badge variant="secondary" className="capitalize">
                      {h.headline_type}
                    </Badge>
                  </div>
                  {canCreate ? (
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
