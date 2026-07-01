import { z } from "zod";
import { slugifyName } from "@/features/organizations/schema";

export const PROJECT_STATUSES = [
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export const WORK_ITEM_STATES = [
  "triage",
  "backlog",
  "unstarted",
  "started",
  "completed",
  "cancelled",
] as const;

export const WORK_ITEM_PRIORITIES = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
] as const;

export const CYCLE_STATUSES = [
  "draft",
  "current",
  "upcoming",
  "completed",
] as const;

export const VIEW_DISPLAY_TYPES = ["list", "kanban", "triage"] as const;

export function projectSlugFromTitle(title: string): string {
  return slugifyName(title) || "project";
}

export const createProjectSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  identifierPrefix: z
    .string()
    .trim()
    .min(2)
    .max(8)
    .regex(/^[A-Z][A-Z0-9]*$/)
    .optional(),
  teamId: z.string().uuid().nullable().optional(),
  leadId: z.string().uuid().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  startDate: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  color: z.string().trim().max(32).nullable().optional(),
});

export const updateProjectSchema = createProjectSchema
  .omit({ organizationId: true, orgSlug: true })
  .extend({
    organizationId: z.string().uuid(),
    projectId: z.string().uuid(),
    orgSlug: z.string().trim().min(1),
    status: z.enum(PROJECT_STATUSES).optional(),
  });

export const archiveProjectSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
});

export const createWorkItemSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(10000).optional(),
  state: z.enum(WORK_ITEM_STATES).optional(),
  priority: z.enum(WORK_ITEM_PRIORITIES).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  moduleId: z.string().uuid().nullable().optional(),
  cycleId: z.string().uuid().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  estimatePoints: z.number().min(0).max(999).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateWorkItemSchema = createWorkItemSchema
  .omit({ title: true })
  .extend({
    workItemId: z.string().uuid(),
    title: z.string().trim().min(1).max(300).optional(),
    displayOrder: z.number().int().min(0).optional(),
  });

export const moveWorkItemStateSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  workItemId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
  state: z.enum(WORK_ITEM_STATES),
  displayOrder: z.number().int().min(0).optional(),
});

export const createModuleSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
});

export const createCycleSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(CYCLE_STATUSES).optional(),
});

export const updateCycleSchema = createCycleSchema.extend({
  cycleId: z.string().uuid(),
});

export const createProjectViewSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  displayType: z.enum(VIEW_DISPLAY_TYPES),
  filters: z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

export const createProjectPageSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200),
  content: z.string().max(100000).optional(),
  contentFormat: z.enum(["text", "markdown"]).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateProjectPageSchema = createProjectPageSchema.extend({
  pageId: z.string().uuid(),
});

export const linkEntitySchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
  entityId: z.string().uuid(),
});

export const restoreProjectSchema = archiveProjectSchema;

export const createProjectLabelSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
  name: z.string().trim().min(1).max(40),
  color: z.string().trim().max(32).nullable().optional(),
});

export const setWorkItemLabelsSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  workItemId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
  labelIds: z.array(z.string().uuid()),
});

export const archiveWorkItemSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  workItemId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
});
