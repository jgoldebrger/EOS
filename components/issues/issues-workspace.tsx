"use client";

import { useMemo, useState } from "react";
import type {
  IssueFilters,
  IssueMemberOption,
  IssueTeamOption,
  IssueWithLinks,
} from "@/features/issues/types";
import { IssuesPageHeader } from "@/components/issues/issues-page-header";
import { IssueTable } from "@/components/issues/issue-table";
import type { OrgRole } from "@/types/domain";

interface IssuesWorkspaceProps {
  organizationId: string;
  orgSlug: string;
  orgRole: OrgRole;
  currentUserId: string;
  canCreate: boolean;
  issues: IssueWithLinks[];
  teams: IssueTeamOption[];
  members: IssueMemberOption[];
}

export function IssuesWorkspace({
  organizationId,
  orgSlug,
  orgRole,
  currentUserId,
  canCreate,
  issues,
  teams,
  members,
}: IssuesWorkspaceProps) {
  const [filters, setFilters] = useState<IssueFilters>({});

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (filters.status && issue.status !== filters.status) return false;
      if (filters.ownerId && issue.owner_id !== filters.ownerId) return false;
      if (filters.teamId && issue.team_id !== filters.teamId) return false;
      if (!filters.includeArchived) {
        if (issue.archived_at || issue.status === "archived") return false;
      }
      return true;
    });
  }, [issues, filters]);

  const rankedIssues = useMemo(
    () =>
      filteredIssues.map((issue, index) => ({
        ...issue,
        priorityRank: index + 1,
      })),
    [filteredIssues],
  );

  return (
    <div className="space-y-8">
      <IssuesPageHeader
        organizationId={organizationId}
        canCreate={canCreate}
        teams={teams}
        members={members}
        defaultOwnerId={currentUserId}
        filters={filters}
        onFiltersChange={setFilters}
      />
      <IssueTable
        organizationId={organizationId}
        orgSlug={orgSlug}
        orgRole={orgRole}
        issues={rankedIssues}
        canCreate={canCreate}
      />
    </div>
  );
}
