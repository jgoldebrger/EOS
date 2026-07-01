"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderKanban, Plus } from "lucide-react";
import type {
  ProjectFilters,
  ProjectMemberOption,
  ProjectTeamOption,
  ProjectWithStats,
} from "@/features/projects/types";
import { formatProjectStatus } from "@/features/projects/utils";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
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
}

export function ProjectsWorkspace({
  organizationId,
  orgSlug,
  orgRole,
  projects,
  teams,
  members,
}: ProjectsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState<ProjectFilters>({});

  const canCreate =
    orgRole === "owner" || orgRole === "admin" || orgRole === "member";

  useEffect(() => {
    if (searchParams.get("create") === "project" && canCreate) {
      setCreateOpen(true);
      router.replace(`/org/${orgSlug}/projects`, { scroll: false });
    }
  }, [searchParams, canCreate, orgSlug, router]);

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
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title="No projects"
          description="Create a project to group related work."
          action={
            canCreate ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Create project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link key={project.id} href={`/org/${orgSlug}/projects/${project.slug}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <CardTitle className="text-base leading-snug">
                    {project.title}
                  </CardTitle>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {formatProjectStatus(project.status)}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {project.leadLabel && <p>Lead: {project.leadLabel}</p>}
                  <p>
                    {project.openWorkItemCount} open · {project.workItemCount}{" "}
                    total items
                  </p>
                  {project.due_date && <p>Due {project.due_date}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
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
