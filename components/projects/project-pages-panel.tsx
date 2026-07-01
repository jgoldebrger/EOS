"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProjectPage, updateProjectPage } from "@/features/projects/actions";
import type { ProjectPage } from "@/features/projects/types";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectPagesPanelProps {
  organizationId: string;
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  pages: ProjectPage[];
  canEdit: boolean;
}

export function ProjectPagesPanel({
  organizationId,
  projectId,
  orgSlug,
  projectSlug,
  pages,
  canEdit,
}: ProjectPagesPanelProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(pages[0]?.id ?? null);
  const [newTitle, setNewTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const selected = pages.find((p) => p.id === selectedId) ?? null;
  const [editTitle, setEditTitle] = useState(selected?.title ?? "");
  const [editContent, setEditContent] = useState(selected?.content ?? "");

  function selectPage(page: ProjectPage) {
    setSelectedId(page.id);
    setEditTitle(page.title);
    setEditContent(page.content);
  }

  function handleCreate() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      const result = await createProjectPage({
        organizationId,
        projectId,
        orgSlug,
        projectSlug,
        title: newTitle.trim(),
        content: "",
        contentFormat: "markdown",
      });
      if (!result.success) {
        showErrorToast("Could not create page", result.error);
        return;
      }
      showSuccessToast("Page created");
      setNewTitle("");
      router.refresh();
    });
  }

  function handleSave() {
    if (!selected) return;
    startTransition(async () => {
      const result = await updateProjectPage({
        organizationId,
        projectId,
        pageId: selected.id,
        orgSlug,
        projectSlug,
        title: editTitle.trim(),
        content: editContent,
        contentFormat: "markdown",
      });
      if (!result.success) {
        showErrorToast("Could not save page", result.error);
        return;
      }
      showSuccessToast("Page saved");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <div className="space-y-3">
        {canEdit && (
          <div className="space-y-2">
            <Input
              placeholder="New page title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Button
              size="sm"
              className="w-full"
              onClick={handleCreate}
              disabled={isPending || !newTitle.trim()}
            >
              Add page
            </Button>
          </div>
        )}
        <ul className="space-y-1">
          {pages.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${
                  selectedId === page.id ? "bg-muted font-medium" : ""
                }`}
                onClick={() => selectPage(page)}
              >
                {page.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1">
              <Label>Content (Markdown)</Label>
              <textarea
                className="min-h-[280px] w-full rounded-md border border-input px-3 py-2 text-sm"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            {canEdit && (
              <Button onClick={handleSave} disabled={isPending}>
                Save page
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Select or create a page.</p>
      )}
    </div>
  );
}
