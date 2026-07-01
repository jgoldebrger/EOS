"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import type {
  ProjectAnalytics,
  ProjectDetail,
  ProjectMemberOption,
  WorkItemFilters,
  WorkItemWithMeta,
} from "@/features/projects/types";
import { createProjectView } from "@/features/projects/actions";
import { filterWorkItems, formatProjectStatus } from "@/features/projects/utils";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { CreateWorkItemDialog } from "@/components/projects/create-work-item-dialog";
import {
  EMPTY_WORK_ITEM_FILTERS,
  filtersToSavedView,
  ProjectFiltersToolbar,
  savedViewToFilters,
} from "@/components/projects/project-filters-toolbar";
import { ProjectAnalyticsPanel } from "@/components/projects/project-analytics-panel";
import { ProjectBoard } from "@/components/projects/project-board";
import { ProjectCyclesPanel } from "@/components/projects/project-cycles-panel";
import { ProjectLinksPanel } from "@/components/projects/project-links-panel";
import { ProjectModulesPanel } from "@/components/projects/project-modules-panel";
import { ProjectPagesPanel } from "@/components/projects/project-pages-panel";
import { ProjectSettingsSheet } from "@/components/projects/project-settings-sheet";
import { ProjectTriageView } from "@/components/projects/project-triage-view";
import { WorkItemDetailSheet } from "@/components/projects/work-item-detail-sheet";
import { WorkItemTable } from "@/components/projects/work-item-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrgRole } from "@/types/domain";
import type { ProjectDisplayTypeDb } from "@/types/database";

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

const DISPLAY_TYPE_TO_TAB: Record<ProjectDisplayTypeDb, ProjectTab> = {
  list: "work",
  kanban: "kanban",
  triage: "triage",
};

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
  const [filters, setFilters] = useState<WorkItemFilters>(EMPTY_WORK_ITEM_FILTERS);
  const [selectedItem, setSelectedItem] = useState<WorkItemWithMeta | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSavingView, startSaveView] = useTransition();

  const canEdit =
    orgRole === "owner" || orgRole === "admin" || orgRole === "member";

  const filteredItems = useMemo(
    () => filterWorkItems(project.workItems, filters),
    [project.workItems, filters],
  );

  const hasActiveFilters = Object.values(filters).some(Boolean);
  const triageCount = project.workItems.filter((i) => i.state === "triage").length;

  function openItem(item: WorkItemWithMeta) {
    setSelectedItem(item);
    setDetailOpen(true);
  }

  function applySavedView(viewId: string) {
    const view = project.views.find((v) => v.id === viewId);
    if (!view) return;
    setFilters(savedViewToFilters((view.filters ?? {}) as Record<string, string>));
    setTab(DISPLAY_TYPE_TO_TAB[view.display_type] ?? "work");
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
        filters: filtersToSavedView(filters),
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
              {project.archived_at && (
                <Badge variant="outline">Archived</Badge>
              )}
              {project.leadLabel && <span>Lead: {project.leadLabel}</span>}
              <span>{project.workItems.length} work items</span>
            </div>
            {project.description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            )}
            {canEdit && (tab === "work" || tab === "kanban" || tab === "triage") && (
              <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New work item
              </Button>
            )}
          </div>
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
            {t.id === "triage" && triageCount > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({triageCount})
              </span>
            )}
          </button>
        ))}
      </nav>

      {(tab === "work" || tab === "kanban") && (
        <div className="space-y-2">
          {project.views.length > 0 && (
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) applySavedView(e.target.value);
              }}
              aria-label="Apply saved view"
            >
              <option value="">Saved views…</option>
              {project.views.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name} ({view.display_type})
                </option>
              ))}
            </select>
          )}
          <ProjectFiltersToolbar
            filters={filters}
            onChange={setFilters}
            members={members}
            modules={project.modules}
            cycles={project.cycles}
          >
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
          </ProjectFiltersToolbar>
        </div>
      )}

      {tab === "work" && (
        filteredItems.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? "No matching work items" : "No work items yet"}
            description={
              hasActiveFilters
                ? "Try adjusting your filters."
                : "Create a work item to get started."
            }
            action={
              canEdit && !hasActiveFilters ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  New work item
                </Button>
              ) : undefined
            }
          />
        ) : (
          <WorkItemTable items={filteredItems} onSelect={openItem} />
        )
      )}

      {tab === "kanban" && (
        filteredItems.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? "No matching work items" : "Board is empty"}
            description={
              hasActiveFilters
                ? "Try adjusting your filters."
                : "Add work items to see them on the board."
            }
          />
        ) : (
          <ProjectBoard
            items={filteredItems}
            organizationId={project.organization_id}
            projectId={project.id}
            orgSlug={orgSlug}
            projectSlug={project.slug}
            canEdit={canEdit}
            onSelect={openItem}
          />
        )
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
        project.cycles.length === 0 ? (
          <EmptyState
            title="No cycles yet"
            description="Create a cycle to plan work in time-boxed iterations."
          />
        ) : (
          <ProjectCyclesPanel
            organizationId={project.organization_id}
            projectId={project.id}
            orgSlug={orgSlug}
            projectSlug={project.slug}
            cycles={project.cycles}
            canEdit={canEdit}
          />
        )
      )}

      {tab === "modules" && (
        project.modules.length === 0 ? (
          <EmptyState
            title="No modules yet"
            description="Group work items into modules for larger initiatives."
          />
        ) : (
          <ProjectModulesPanel
            organizationId={project.organization_id}
            projectId={project.id}
            orgSlug={orgSlug}
            projectSlug={project.slug}
            modules={project.modules}
            canEdit={canEdit}
          />
        )
      )}

      {tab === "pages" && (
        project.pages.length === 0 ? (
          <EmptyState
            title="No pages yet"
            description="Add documentation pages for this project."
          />
        ) : (
          <ProjectPagesPanel
            organizationId={project.organization_id}
            projectId={project.id}
            orgSlug={orgSlug}
            projectSlug={project.slug}
            pages={project.pages}
            canEdit={canEdit}
          />
        )
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
        members={members}
        modules={project.modules}
        cycles={project.cycles}
        labels={project.labels}
        canEdit={canEdit}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <ProjectSettingsSheet
        project={project}
        organizationId={project.organization_id}
        orgSlug={orgSlug}
        members={members}
        canEdit={canEdit}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      <CreateWorkItemDialog
        organizationId={project.organization_id}
        projectId={project.id}
        orgSlug={orgSlug}
        projectSlug={project.slug}
        members={members}
        modules={project.modules}
        cycles={project.cycles}
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultState={tab === "triage" ? "triage" : "backlog"}
      />
    </div>
  );
}
