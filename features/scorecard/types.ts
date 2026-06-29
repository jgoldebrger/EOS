import type { Tables } from "@/types/database";
import type { MetricStatus, TargetRule } from "@/features/scorecard/utils";

export type ScorecardMetric = Tables<"scorecard_metrics">;
export type ScorecardValue = Tables<"scorecard_values">;

export interface ScorecardMetricOwner {
  userId: string;
  label: string;
  email?: string | null;
}

export interface ScorecardMetricWithOwner extends ScorecardMetric {
  owner: ScorecardMetricOwner;
  teamName: string | null;
}

export interface ScorecardValueCell {
  periodStart: string;
  actual: number | null;
  targetSnapshot: number | null;
  statusOverride: MetricStatus | null;
  status: MetricStatus;
  valueId: string | null;
  notes: string | null;
}

export interface ScorecardGridRow {
  metric: ScorecardMetricWithOwner;
  weeks: ScorecardValueCell[];
  canEdit: boolean;
}

export interface ScorecardTeamOption {
  id: string;
  name: string;
  slug: string;
}

export interface ScorecardMemberOption {
  userId: string;
  orgRole: string;
  label: string;
}

export type ScorecardActionResult =
  | { success: true }
  | { success: false; error: string };

export type CreateMetricResult =
  | { success: true; metricId: string }
  | { success: false; error: string };

export interface ScorecardPageData {
  metrics: ScorecardMetricWithOwner[];
  weeks: string[];
  valuesByMetric: Record<string, ScorecardValueCell[]>;
  teams: ScorecardTeamOption[];
  members: ScorecardMemberOption[];
  currentUserId: string;
  canManageMetrics: boolean;
}

export type { MetricStatus, TargetRule };
