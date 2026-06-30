import { PageHeader } from "@/components/shared/page-header";
import { CreateMetricDialog } from "@/components/scorecard/create-metric-dialog";
import type {
  ScorecardCategory,
  ScorecardMemberOption,
  ScorecardTag,
  ScorecardTeamOption,
} from "@/features/scorecard/types";

interface ScorecardPageHeaderProps {
  organizationId: string;
  orgSlug: string;
  teamSlug: string;
  canManageMetrics: boolean;
  teams: ScorecardTeamOption[];
  members: ScorecardMemberOption[];
  categories?: ScorecardCategory[];
  tags?: ScorecardTag[];
  defaultOwnerId: string;
  defaultTeamId?: string;
}

export function ScorecardPageHeader({
  organizationId,
  orgSlug,
  teamSlug,
  canManageMetrics,
  teams,
  members,
  categories = [],
  tags = [],
  defaultOwnerId,
  defaultTeamId,
}: ScorecardPageHeaderProps) {
  return (
    <PageHeader
      title="Scorecard"
      description="Track weekly measurables against targets across the last 13 weeks."
      actions={
        canManageMetrics ? (
          <CreateMetricDialog
            organizationId={organizationId}
            orgSlug={orgSlug}
            teamSlug={teamSlug}
            teams={teams}
            members={members}
            categories={categories}
            tags={tags}
            defaultOwnerId={defaultOwnerId}
            defaultTeamId={defaultTeamId}
          />
        ) : undefined
      }
    />
  );
}
