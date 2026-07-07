import { Suspense } from "react";
import { RocksWorkspace } from "@/components/rocks/rocks-workspace";
import { IssuesWorkspace } from "@/components/issues/issues-workspace";
import { TodosWorkspace } from "@/components/todos/todos-workspace";
import { HeadlinesWorkspace } from "@/components/headlines/headlines-workspace";
import { ScorecardMetricTableSection } from "@/components/scorecard/scorecard-metric-table-section";
import { TableLoadingSkeleton } from "@/components/shared/loading-skeleton";
import { getHeadlinesForTeam } from "@/features/headlines/actions";
import {
  getIssuesForOrg,
  getOrgMembersForIssues,
  getOrgTeamsForIssues,
} from "@/features/issues/queries";
import { getMeetingById } from "@/features/meetings/queries";
import { parseIdsSession } from "@/features/meetings/ids-session";
import {
  getOrgMembersForRocks,
  getOrgTeamsForRocks,
  getRocksForOrg,
} from "@/features/rocks/queries";
import {
  getCategoriesForOrg,
  getMetricsForOrg,
  getOrgMembersForScorecard,
  getOrgTeamsForScorecard,
  getTagsForOrg,
} from "@/features/scorecard/queries";
import {
  getOrgMembersForTodos,
  getOrgTeamsForTodos,
  getTodosForOrg,
} from "@/features/todos/queries";
import { getPeriodColumns } from "@/features/scorecard/utils";
import { canManageTeamScorecard } from "@/lib/permissions/checks";
import type { OrgRole } from "@/types/domain";

interface L10SectionPanelProps {
  sectionKey: string;
  organizationId: string;
  orgSlug: string;
  teamSlug: string;
  teamId: string;
  orgRole: OrgRole;
  userId: string;
  isTeamLeader: boolean;
  meetingId: string;
  canCreate: boolean;
}

const EMBED_SECTIONS = new Set([
  "scorecard",
  "rocks",
  "headlines",
  "todos",
  "issues",
]);

export function hasL10EmbedSection(sectionKey: string): boolean {
  return EMBED_SECTIONS.has(sectionKey);
}

export async function L10SectionPanel({
  sectionKey,
  organizationId,
  orgSlug,
  teamSlug,
  teamId,
  orgRole,
  userId,
  isTeamLeader,
  meetingId,
  canCreate,
}: L10SectionPanelProps) {
  if (!hasL10EmbedSection(sectionKey)) {
    return null;
  }

  switch (sectionKey) {
    case "scorecard": {
      const periods = getPeriodColumns("weekly", 13);
      const [metrics, teams, members, categories, tags] = await Promise.all([
        getMetricsForOrg(organizationId, {
          teamId,
          periodType: "weekly",
          state: "active",
        }),
        getOrgTeamsForScorecard(organizationId),
        getOrgMembersForScorecard(organizationId),
        getCategoriesForOrg(organizationId, teamId),
        getTagsForOrg(organizationId),
      ]);

      const isOnTeam = isTeamLeader || orgRole === "member";
      const canManageMetrics = canManageTeamScorecard(
        orgRole,
        isOnTeam ? (isTeamLeader ? "leader" : "member") : null,
      );

      return (
        <div data-testid={`l10-section-${sectionKey}`}>
          <Suspense
            fallback={
              <TableLoadingSkeleton
                rows={Math.max(metrics.length, 4)}
                columns={Math.min(periods.length + 4, 12)}
              />
            }
          >
            <ScorecardMetricTableSection
              organizationId={organizationId}
              orgSlug={orgSlug}
              teamSlug={teamSlug}
              orgRole={orgRole}
              currentUserId={userId}
              isTeamLeader={isTeamLeader}
              canManageMetrics={canManageMetrics}
              metrics={metrics}
              teams={teams}
              members={members}
              categories={categories}
              tags={tags}
              weeks={periods}
              groupBy="owner"
              periodType="weekly"
              variant="meeting"
            />
          </Suspense>
        </div>
      );
    }

    case "rocks": {
      const [rocks, teams, members] = await Promise.all([
        getRocksForOrg(organizationId, { teamId }),
        getOrgTeamsForRocks(organizationId),
        getOrgMembersForRocks(organizationId),
      ]);

      return (
        <div data-testid={`l10-section-${sectionKey}`}>
          <RocksWorkspace
            organizationId={organizationId}
            orgRole={orgRole}
            currentUserId={userId}
            isTeamLeader={isTeamLeader}
            canCreate={canCreate}
            rocks={rocks}
            teams={teams}
            members={members}
            variant="meeting"
          />
        </div>
      );
    }

    case "headlines": {
      const headlines = await getHeadlinesForTeam(organizationId, teamId);
      const supabase = await (await import("@/lib/supabase/server")).createClient();
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name")
        .eq("organization_id", organizationId)
        .neq("id", teamId);

      return (
        <div data-testid={`l10-section-${sectionKey}`}>
          <HeadlinesWorkspace
            organizationId={organizationId}
            orgSlug={orgSlug}
            teamId={teamId}
            canCreate={canCreate}
            headlines={headlines}
            targetTeams={teams ?? []}
            variant="meeting"
            meetingId={meetingId}
          />
        </div>
      );
    }

    case "todos": {
      const [todos, teams, members] = await Promise.all([
        getTodosForOrg(organizationId, { teamId }),
        getOrgTeamsForTodos(organizationId),
        getOrgMembersForTodos(organizationId),
      ]);

      return (
        <div data-testid={`l10-section-${sectionKey}`}>
          <TodosWorkspace
            organizationId={organizationId}
            orgRole={orgRole}
            currentUserId={userId}
            isTeamLeader={isTeamLeader}
            canEdit={canCreate}
            todos={todos}
            teams={teams}
            members={members}
            variant="meeting"
          />
        </div>
      );
    }

    case "issues": {
      const [issues, teams, members, meeting] = await Promise.all([
        getIssuesForOrg(organizationId, { teamId }),
        getOrgTeamsForIssues(organizationId),
        getOrgMembersForIssues(organizationId),
        getMeetingById(organizationId, meetingId),
      ]);

      const idsSession = parseIdsSession(meeting?.metadata);

      return (
        <div data-testid={`l10-section-${sectionKey}`}>
          <IssuesWorkspace
            organizationId={organizationId}
            orgSlug={orgSlug}
            orgRole={orgRole}
            currentUserId={userId}
            canCreate={canCreate}
            issues={issues}
            teams={teams}
            members={members}
            defaultTeamId={teamId}
            linkedMeetingId={meetingId}
            meetingId={meetingId}
            initialIdsSession={idsSession}
            canEditMeeting={canCreate}
            variant="meeting"
          />
        </div>
      );
    }

    default:
      return null;
  }
}
