import { z } from "zod";

const issueStatusSchema = z.enum(["open", "discussing", "solved", "archived"]);

const issueBaseSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  teamId: z.string().uuid("Invalid team").nullable().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z.string().trim().max(2000).nullable().optional(),
  ownerId: z.string().uuid("Invalid owner").nullable().optional(),
  priority: z.number().int().min(0).optional(),
  status: issueStatusSchema.optional(),
  idsNotes: z.string().trim().max(5000).nullable().optional(),
  linkedMetricId: z.string().uuid("Invalid metric").nullable().optional(),
  linkedRockId: z.string().uuid("Invalid rock").nullable().optional(),
  linkedMeetingId: z.string().uuid("Invalid meeting").nullable().optional(),
});

export const createIssueSchema = issueBaseSchema;

export const updateIssueSchema = issueBaseSchema
  .partial()
  .extend({
    issueId: z.string().uuid("Invalid issue"),
    organizationId: z.string().uuid("Invalid organization"),
  });

export const solveIssueSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  issueId: z.string().uuid("Invalid issue"),
  idsNotes: z.string().trim().max(5000).nullable().optional(),
});

export const archiveIssueSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  issueId: z.string().uuid("Invalid issue"),
});

export const prioritizeIssueSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  issueId: z.string().uuid("Invalid issue"),
  priority: z.number().int().min(0, "Priority must be at least 0"),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type SolveIssueInput = z.infer<typeof solveIssueSchema>;
export type ArchiveIssueInput = z.infer<typeof archiveIssueSchema>;
export type PrioritizeIssueInput = z.infer<typeof prioritizeIssueSchema>;
