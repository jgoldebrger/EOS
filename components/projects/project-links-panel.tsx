"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  linkIssueToProject,
  linkRockToProject,
  linkTodoToProject,
} from "@/features/projects/actions";
import type { ProjectDetail } from "@/features/projects/types";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectLinksPanelProps {
  organizationId: string;
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  project: Pick<
    ProjectDetail,
    "linkedIssues" | "linkedRocks" | "linkedTodos"
  >;
  linkableIssues: Array<{ id: string; title: string; teams: { slug: string } | null }>;
  linkableRocks: Array<{ id: string; title: string }>;
  linkableTodos: Array<{ id: string; title: string }>;
  canEdit: boolean;
}

export function ProjectLinksPanel({
  organizationId,
  projectId,
  orgSlug,
  projectSlug,
  project,
  linkableIssues,
  linkableRocks,
  linkableTodos,
  canEdit,
}: ProjectLinksPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function link(
    type: "issue" | "rock" | "todo",
    entityId: string,
  ) {
    startTransition(async () => {
      const input = {
        organizationId,
        projectId,
        orgSlug,
        projectSlug,
        entityId,
      };
      const result =
        type === "issue"
          ? await linkIssueToProject(input)
          : type === "rock"
            ? await linkRockToProject(input)
            : await linkTodoToProject(input);

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
          <CardTitle className="text-base">Issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {project.linkedIssues.map((issue) => (
            <div key={issue.id}>
              {issue.teamSlug ? (
                <Link
                  href={`/org/${orgSlug}/teams/${issue.teamSlug}/issues`}
                  className="text-primary hover:underline"
                >
                  {issue.title}
                </Link>
              ) : (
                issue.title
              )}
            </div>
          ))}
          {canEdit && (
            <select
              className="mt-2 h-9 w-full rounded-md border px-2 text-sm"
              disabled={isPending}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) link("issue", e.target.value);
              }}
            >
              <option value="">Link an issue…</option>
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
          <CardTitle className="text-base">Rocks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {project.linkedRocks.map((rock) => (
            <div key={rock.id}>{rock.title}</div>
          ))}
          {canEdit && (
            <select
              className="mt-2 h-9 w-full rounded-md border px-2 text-sm"
              disabled={isPending}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) link("rock", e.target.value);
              }}
            >
              <option value="">Link a rock…</option>
              {linkableRocks.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {project.linkedTodos.map((todo) => (
            <div key={todo.id}>{todo.title}</div>
          ))}
          {canEdit && (
            <select
              className="mt-2 h-9 w-full rounded-md border px-2 text-sm"
              disabled={isPending}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) link("todo", e.target.value);
              }}
            >
              <option value="">Link a todo…</option>
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
