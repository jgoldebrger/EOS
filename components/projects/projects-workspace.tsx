"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderKanban, Plus } from "lucide-react";
import { restoreProject } from "@/features/projects/actions";
import type {
  ProjectFilters,
  ProjectMemberOption,
  ProjectTeamOption,
  ProjectWithStats,
} from "@/features/projects/types";
import { formatProjectStatus } from "@/features/projects/utils";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { OrgRole } from "@/types/domain";

interface ProjectsWorkspaceProps {
  organizationId: string;
  orgSlug: string;
  orgRole: OrgRole;
  projects: ProjectWithStats[];
  teams: ProjectTeamOption[];
  members: ProjectMemberOption[];
  showArchived: boolean;
}

export function ProjectsWorkspace({
  organizationId,
  orgSlug,
  orgRole,
  projects,
  teams,
  members,
  showArchived,
}: ProjectsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canCreate =
    orgRole === "owner" || orgRole === "admin" || orgRole === "member";
  const canEdit =
    orgRole === "owner" || orgRole === "admin" || orgRole === "member";
  const wantsCreateProject =
    searchParams.get("create") === "project" && canCreate;
  const [createOpen, setCreateOpen] = useState(wantsCreateProject);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [isRestoring, startRestore] = useTransition();

  useEffect(() => {
    if (wantsCreateProject) {
      router.replace(`/org/${orgSlug}/projects`, { scroll: false });
    }
  }, [wantsCreateProject, orgSlug, router]);

  function toggleArchived() {
    const next = !showArchived;
    router.push(
      next ? `/org/${orgSlug}/projects?archived=1` : `/org/${orgSlug}/projects`,
    );
  }

  function handleRestore(projectId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startRestore(async () => {
      const result = await restoreProject({
        organizationId,
        projectId,
        orgSlug,
      });
      if (!result.success) {
        showErrorToast("Could not restore project", result.error);
        return;
      }
      showSuccessToast("Project restored");
      router.refresh();
    });
  }

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      if (filters.status && project.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!project.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [projects, filters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Track initiatives with work items, cycles, and docs.
          </p>
        </div>
        {canCreate && (
          <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search projects…"
          className="max-w-xs"
          value={filters.search ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, search: e.target.value }))
          }
        />
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={filters.status ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              status: (e.target.value || undefined) as ProjectFilters["status"],
            }))
          }
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="completed">Completed</option>
        </select>
        <Button
          size="sm"
          variant={showArchived ? "secondary" : "outline"}
          onClick={toggleArchived}
        >
          {showArchived ? "Showing archived" : "Show archived"}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title={showArchived ? "No archived projects" : "No projects"}
          description={
            showArchived
              ? "Archived projects will appear here."
              : "Create a project to group related work."
          }
          action={
            canCreate && !showArchived ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Create project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
            const isArchived = Boolean(project.archived_at);
            return (
              <Link
                key={project.id}
                href={`/org/${orgSlug}/projects/${project.slug}`}
                className="block"
              >
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                    <CardTitle className="text-base leading-snug">
                      {project.title}
                    </CardTitle>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="secondary" className="capitalize">
                        {formatProjectStatus(project.status)}
                      </Badge>
                      {isArchived && (
                        <Badge variant="outline">Archived</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {project.leadLabel && <p>Lead: {project.leadLabel}</p>}
                    <p>
                      {project.openWorkItemCount} open · {project.workItemCount}{" "}
                      total items
                    </p>
                    {project.due_date && <p>Due {project.due_date}</p>}
                    {isArchived && canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isRestoring}
                        onClick={(e) => handleRestore(project.id, e)}
                      >
                        Restore
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <CreateProjectDialog
        organizationId={organizationId}
        orgSlug={orgSlug}
        teams={teams}
        members={members}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
