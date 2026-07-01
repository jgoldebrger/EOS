"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import type {
  ProjectAnalytics,
  ProjectDetail,
  ProjectMemberOption,
} from "@/features/projects/types";
import { createProjectView } from "@/features/projects/actions";
import { filterWorkItems, formatProjectStatus } from "@/features/projects/utils";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { CreateWorkItemDialog } from "@/components/projects/create-work-item-dialog";
import { ProjectAnalyticsPanel } from "@/components/projects/project-analytics-panel";
import { ProjectBoard } from "@/components/projects/project-board";
import { ProjectCyclesPanel } from "@/components/projects/project-cycles-panel";
import { ProjectLinksPanel } from "@/components/projects/project-links-panel";
import { ProjectModulesPanel } from "@/components/projects/project-modules-panel";
import { ProjectPagesPanel } from "@/components/projects/project-pages-panel";
import { ProjectTriageView } from "@/components/projects/project-triage-view";
import { WorkItemDetailSheet } from "@/components/projects/work-item-detail-sheet";
import { WorkItemTable } from "@/components/projects/work-item-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrgRole } from "@/types/domain";
import type { WorkItemWithMeta } from "@/features/projects/types";

type ProjectTab =
  | "work"
  | "kanban"
  | "triage"
  | "cycles"
  | "modules"
  | "pages"
  | "links"
  | "analytics";

const TABS: { id: ProjectTab; label: string }[] = [
  { id: "work", label: "Work" },
  { id: "kanban", label: "Board" },
  { id: "triage", label: "Triage" },
  { id: "cycles", label: "Cycles" },
  { id: "modules", label: "Modules" },
  { id: "pages", label: "Pages" },
  { id: "links", label: "EOS links" },
  { id: "analytics", label: "Analytics" },
];

interface ProjectWorkspaceProps {
  orgSlug: string;
  orgRole: OrgRole;
  project: ProjectDetail;
  members: ProjectMemberOption[];
  analytics: ProjectAnalytics;
  linkableIssues: Array<{ id: string; title: string; teams: { slug: string } | null }>;
  linkableRocks: Array<{ id: string; title: string }>;
  linkableTodos: Array<{ id: string; title: string }>;
}

export function ProjectWorkspace({
  orgSlug,
  orgRole,
  project,
  members,
  analytics,
  linkableIssues,
  linkableRocks,
  linkableTodos,
}: ProjectWorkspaceProps) {
  const [tab, setTab] = useState<ProjectTab>("work");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<WorkItemWithMeta | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isSavingView, startSaveView] = useTransition();

  const canEdit =
    orgRole === "owner" || orgRole === "admin" || orgRole === "member";

  const filteredItems = useMemo(
    () => filterWorkItems(project.workItems, { search }),
    [project.workItems, search],
  );

  function openItem(item: WorkItemWithMeta) {
    setSelectedItem(item);
    setDetailOpen(true);
  }

  function saveCurrentView() {
    const displayType =
      tab === "kanban" ? "kanban" : tab === "triage" ? "triage" : "list";
    startSaveView(async () => {
      const result = await createProjectView({
        organizationId: project.organization_id,
        projectId: project.id,
        orgSlug,
        projectSlug: project.slug,
        name: `${displayType} view`,
        displayType,
        filters: { search },
      });
      if (!result.success) {
        showErrorToast("Could not save view", result.error);
        return;
      }
      showSuccessToast("View saved");
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href={`/org/${orgSlug}/projects`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All projects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {project.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="capitalize">
                {formatProjectStatus(project.status)}
              </Badge>
              {project.leadLabel && <span>Lead: {project.leadLabel}</span>}
              <span>{project.workItems.length} work items</span>
            </div>
            {project.description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
          {canEdit && (tab === "work" || tab === "kanban" || tab === "triage") && (
            <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New work item
            </Button>
          )}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`shrink-0 rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {(tab === "work" || tab === "kanban") && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search work items…"
            className="max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              disabled={isSavingView}
              onClick={saveCurrentView}
            >
              Save view
            </Button>
          )}
        </div>
      )}

      {tab === "work" && (
        <WorkItemTable items={filteredItems} onSelect={openItem} />
      )}

      {tab === "kanban" && (
        <ProjectBoard
          items={filteredItems}
          organizationId={project.organization_id}
          projectId={project.id}
          orgSlug={orgSlug}
          projectSlug={project.slug}
          canEdit={canEdit}
          onSelect={openItem}
        />
      )}

      {tab === "triage" && (
        <ProjectTriageView
          items={project.workItems}
          organizationId={project.organization_id}
          projectId={project.id}
          orgSlug={orgSlug}
          projectSlug={project.slug}
          members={members}
          canEdit={canEdit}
          onSelect={openItem}
        />
      )}

      {tab === "cycles" && (
        <ProjectCyclesPanel
          organizationId={project.organization_id}
          projectId={project.id}
          orgSlug={orgSlug}
          projectSlug={project.slug}
          cycles={project.cycles}
          canEdit={canEdit}
        />
      )}

      {tab === "modules" && (
        <ProjectModulesPanel
          organizationId={project.organization_id}
          projectId={project.id}
          orgSlug={orgSlug}
          projectSlug={project.slug}
          modules={project.modules}
          canEdit={canEdit}
        />
      )}

      {tab === "pages" && (
        <ProjectPagesPanel
          organizationId={project.organization_id}
          projectId={project.id}
          orgSlug={orgSlug}
          projectSlug={project.slug}
          pages={project.pages}
          canEdit={canEdit}
        />
      )}

      {tab === "links" && (
        <ProjectLinksPanel
          organizationId={project.organization_id}
          projectId={project.id}
          orgSlug={orgSlug}
          projectSlug={project.slug}
          project={project}
          linkableIssues={linkableIssues}
          linkableRocks={linkableRocks}
          linkableTodos={linkableTodos}
          canEdit={canEdit}
        />
      )}

      {tab === "analytics" && <ProjectAnalyticsPanel analytics={analytics} />}

      <WorkItemDetailSheet
        item={selectedItem}
        organizationId={project.organization_id}
        projectId={project.id}
        orgSlug={orgSlug}
        projectSlug={project.slug}
        canEdit={canEdit}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <CreateWorkItemDialog
        organizationId={project.organization_id}
        projectId={project.id}
        orgSlug={orgSlug}
        projectSlug={project.slug}
        members={members}
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultState={tab === "triage" ? "triage" : "backlog"}
      />
    </div>
  );
}
