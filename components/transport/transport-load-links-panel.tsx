"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  linkIssueToLoad,
  linkProjectToLoad,
  linkTodoToLoad,
} from "@/features/transport/actions";
import type { TransportLoadWithMeta } from "@/features/transport/types";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TransportLoadLinksPanelProps {
  organizationId: string;
  orgSlug: string;
  load: Pick<
    TransportLoadWithMeta,
    "id" | "linkedProjects" | "linkedIssues" | "linkedTodos"
  >;
  linkableProjects: Array<{ id: string; title: string; slug: string }>;
  linkableIssues: Array<{ id: string; title: string; teamSlug: string | null }>;
  linkableTodos: Array<{ id: string; title: string }>;
  canEdit: boolean;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm";

export function TransportLoadLinksPanel({
  organizationId,
  orgSlug,
  load,
  linkableProjects,
  linkableIssues,
  linkableTodos,
  canEdit,
}: TransportLoadLinksPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function link(type: "project" | "issue" | "todo", entityId: string) {
    if (!entityId) return;
    startTransition(async () => {
      const input = { organizationId, orgSlug, loadId: load.id, entityId };
      const result =
        type === "project"
          ? await linkProjectToLoad(input)
          : type === "issue"
            ? await linkIssueToLoad(input)
            : await linkTodoToLoad(input);

      if (!result.success) {
        showErrorToast("Could not link", result.error);
        return;
      }
      showSuccessToast("Linked");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {load.linkedProjects.map((p) => (
            <Link
              key={p.id}
              href={`/org/${orgSlug}/projects/${p.slug}`}
              className="block rounded-md border px-3 py-2 hover:bg-muted/50"
            >
              {p.title}
            </Link>
          ))}
          {load.linkedProjects.length === 0 && (
            <p className="text-muted-foreground">No linked projects.</p>
          )}
          {canEdit && (
            <select
              className={selectClassName}
              defaultValue=""
              disabled={isPending}
              onChange={(e) => {
                link("project", e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Link project…</option>
              {linkableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {load.linkedIssues.map((issue) => (
            <Link
              key={issue.id}
              href={
                issue.teamSlug
                  ? `/org/${orgSlug}/teams/${issue.teamSlug}/issues`
                  : `#`
              }
              className="block rounded-md border px-3 py-2 hover:bg-muted/50"
            >
              {issue.title}
            </Link>
          ))}
          {load.linkedIssues.length === 0 && (
            <p className="text-muted-foreground">No linked issues.</p>
          )}
          {canEdit && (
            <select
              className={selectClassName}
              defaultValue=""
              disabled={isPending}
              onChange={(e) => {
                link("issue", e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Link issue…</option>
              {linkableIssues.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">To-Dos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {load.linkedTodos.map((todo) => (
            <p key={todo.id} className="rounded-md border px-3 py-2">
              {todo.title}
            </p>
          ))}
          {load.linkedTodos.length === 0 && (
            <p className="text-muted-foreground">No linked to-dos.</p>
          )}
          {canEdit && (
            <select
              className={selectClassName}
              defaultValue=""
              disabled={isPending}
              onChange={(e) => {
                link("todo", e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Link to-do…</option>
              {linkableTodos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
