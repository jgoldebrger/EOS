import { PageHeader } from "@/components/shared/page-header";
import { CreateMetricDialog } from "@/components/scorecard/create-metric-dialog";
import type {
  ScorecardMemberOption,
  ScorecardTeamOption,
} from "@/features/scorecard/types";

interface ScorecardPageHeaderProps {
  organizationId: string;
  canManageMetrics: boolean;
  teams: ScorecardTeamOption[];
  members: ScorecardMemberOption[];
  defaultOwnerId: string;
}

export function ScorecardPageHeader({
  organizationId,
  canManageMetrics,
  teams,
  members,
  defaultOwnerId,
}: ScorecardPageHeaderProps) {
  return (
    <PageHeader
      title="Scorecard"
      description="Track weekly measurables against targets across the last 13 weeks."
      actions={
        canManageMetrics ? (
          <CreateMetricDialog
            organizationId={organizationId}
            teams={teams}
            members={members}
            defaultOwnerId={defaultOwnerId}
          />
        ) : undefined
      }
    />
  );
}
