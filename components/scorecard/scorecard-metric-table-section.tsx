import { after } from "next/server";
import { ScorecardMetricTable } from "@/components/scorecard/scorecard-metric-table";
import { getValuesForMetrics } from "@/features/scorecard/queries";
import { collectFormulaParseErrors } from "@/features/scorecard/formula";
import {
  findBrokenFormulaReferencesForMetrics,
  syncFormulaMetricValues,
} from "@/features/scorecard/actions";
import type {
  ScorecardCategory,
  ScorecardMemberOption,
  ScorecardMetricWithOwner,
  ScorecardTag,
  ScorecardTeamOption,
} from "@/features/scorecard/types";
import type { PeriodType } from "@/features/scorecard/utils";
import type { OrgRole } from "@/types/domain";

interface ScorecardMetricTableSectionProps {
  organizationId: string;
  orgSlug: string;
  teamSlug: string;
  orgRole: OrgRole;
  currentUserId: string;
  isTeamLeader: boolean;
  canManageMetrics: boolean;
  metrics: ScorecardMetricWithOwner[];
  teams: ScorecardTeamOption[];
  members: ScorecardMemberOption[];
  categories: ScorecardCategory[];
  tags: ScorecardTag[];
  weeks: string[];
  groupBy: "owner" | "team" | "none";
  periodType: PeriodType;
}

export async function ScorecardMetricTableSection({
  metrics,
  weeks,
  periodType,
  ...tableProps
}: ScorecardMetricTableSectionProps) {
  const valuesByMetric = await getValuesForMetrics(
    metrics.map((metric) => metric.id),
    weeks,
    periodType,
    metrics,
  );

  const formulaMetrics = metrics.filter((metric) => metric.datasource === "formula");
  const formulaMetricIds = formulaMetrics.map((metric) => metric.id);

  const brokenRefsByMetricId =
    formulaMetricIds.length > 0
      ? await findBrokenFormulaReferencesForMetrics({
          organizationId: tableProps.organizationId,
          metrics: formulaMetrics.map((metric) => ({
            id: metric.id,
            formula: metric.formula,
          })),
        })
      : {};

  const parseErrorsByMetricId =
    formulaMetricIds.length > 0
      ? collectFormulaParseErrors(
          formulaMetrics.map((metric) => ({
            id: metric.id,
            formula: metric.formula,
          })),
        )
      : {};

  if (formulaMetricIds.length > 0 && periodType === "weekly") {
    after(() => {
      void syncFormulaMetricValues({
        organizationId: tableProps.organizationId,
        metricIds: formulaMetricIds,
        periods: weeks,
      });
    });
  }

  return (
    <ScorecardMetricTable
      {...tableProps}
      metrics={metrics}
      weeks={weeks}
      periodType={periodType}
      valuesByMetric={valuesByMetric}
      brokenRefsByMetricId={brokenRefsByMetricId}
      parseErrorsByMetricId={parseErrorsByMetricId}
    />
  );
}
