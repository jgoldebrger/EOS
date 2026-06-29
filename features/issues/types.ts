import type { IssueStatusDb, Tables } from "@/types/database";

export type Issue = Tables<"issues">;

export interface IssueOwner {
  userId: string | null;
  label: string;
  email?: string | null;
}

export interface IssueWithLinks extends Issue {
  owner: IssueOwner;
  teamName: string | null;
  linkedMetricName: string | null;
  linkedRockTitle: string | null;
  priorityRank: number;
}

export interface IssueFilters {
  status?: IssueStatusDb;
  ownerId?: string;
  teamId?: string;
  includeArchived?: boolean;
}

export interface IssueTeamOption {
  id: string;
  name: string;
  slug: string;
}

export interface IssueMemberOption {
  userId: string;
  orgRole: string;
  label: string;
}

export type IssueActionResult =
  | { success: true }
  | { success: false; error: string };

export type CreateIssueResult =
  | { success: true; issueId: string }
  | { success: false; error: string };

export type ConvertToTodoResult =
  | { success: true; todoId: string }
  | { success: false; error: string; notImplemented?: boolean };
