import type {
  ProjectCycleStatusDb,
  ProjectDisplayTypeDb,
  ProjectPriorityDb,
  ProjectStatusDb,
  ProjectWorkItemStateDb,
  Tables,
} from "@/types/database";

export type Project = Tables<"projects">;
export type ProjectWorkItem = Tables<"project_work_items">;
export type ProjectModule = Tables<"project_modules">;
export type ProjectLabel = Tables<"project_labels">;
export type ProjectCycle = Tables<"project_cycles">;
export type ProjectView = Tables<"project_views">;
export type ProjectPage = Tables<"project_pages">;

export type { ProjectWorkItemStateDb, ProjectPriorityDb, ProjectStatusDb };
export type { ProjectCycleStatusDb, ProjectDisplayTypeDb };

export interface ProjectAssignee {
  userId: string | null;
  label: string;
  email: string | null;
}

export interface ProjectWithStats extends Project {
  workItemCount: number;
  openWorkItemCount: number;
  leadLabel: string | null;
}

export interface WorkItemWithMeta extends ProjectWorkItem {
  identifier: string;
  assignee: ProjectAssignee;
  moduleName: string | null;
  cycleName: string | null;
  labelNames: string[];
  labelIds: string[];
  parentIdentifier: string | null;
}

export interface ProjectDetail extends Project {
  leadLabel: string | null;
  modules: ProjectModule[];
  cycles: ProjectCycle[];
  labels: ProjectLabel[];
  views: ProjectView[];
  workItems: WorkItemWithMeta[];
  pages: ProjectPage[];
  linkedIssues: LinkedIssue[];
  linkedRocks: LinkedRock[];
  linkedTodos: LinkedTodo[];
}

export interface LinkedIssue {
  id: string;
  title: string;
  teamSlug: string | null;
}

export interface LinkedRock {
  id: string;
  title: string;
}

export interface LinkedTodo {
  id: string;
  title: string;
}

export interface ProjectFilters {
  status?: ProjectStatusDb;
  search?: string;
  includeArchived?: boolean;
}

export interface WorkItemFilters {
  state?: ProjectWorkItemStateDb;
  priority?: ProjectPriorityDb;
  assigneeId?: string;
  moduleId?: string;
  cycleId?: string;
  search?: string;
}

export interface SavedViewFilters {
  search?: string;
  state?: string;
  priority?: string;
  assigneeId?: string;
  moduleId?: string;
  cycleId?: string;
}

export interface ProjectMemberOption {
  userId: string;
  orgRole: string;
  label: string;
}

export interface ProjectTeamOption {
  id: string;
  name: string;
  slug: string;
}

export type ProjectActionResult =
  | { success: true }
  | { success: false; error: string };

export type CreateProjectResult =
  | { success: true; projectId: string; slug: string }
  | { success: false; error: string };

export type CreateWorkItemResult =
  | { success: true; workItemId: string }
  | { success: false; error: string };

export interface BurndownPoint {
  date: string;
  remaining: number;
  completed: number;
}

export interface VelocityPoint {
  cycleName: string;
  completed: number;
}

export interface WorkloadPoint {
  assigneeLabel: string;
  count: number;
}

export interface ProjectAnalytics {
  burndown: BurndownPoint[];
  velocity: VelocityPoint[];
  workload: WorkloadPoint[];
  cycleProgress: {
    total: number;
    completed: number;
    cycleName: string | null;
  };
}
