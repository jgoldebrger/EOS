"use client";

import { useMemo, useState } from "react";
import type {
  IssueFilters,
  IssueMemberOption,
  IssueTeamOption,
  IssueWithLinks,
} from "@/features/issues/types";
import { IssuesPageHeader } from "@/components/issues/issues-page-header";
import { IssuesDedupePanel } from "@/components/issues/issues-dedupe-panel";
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
  defaultTeamId?: string;
  linkedMeetingId?: string;
  variant?: "page" | "meeting";
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
  defaultTeamId,
  linkedMeetingId,
  variant = "page",
}: IssuesWorkspaceProps) {
  const [filters, setFilters] = useState<IssueFilters>({});
  const [pinnedIssueIds, setPinnedIssueIds] = useState<string[]>([]);
  const [top3Only, setTop3Only] = useState(false);

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

  const rankedIssues = useMemo(() => {
    const ranked = filteredIssues.map((issue, index) => ({
      ...issue,
      priorityRank: index + 1,
    }));

    if (variant !== "meeting" || pinnedIssueIds.length === 0) {
      return top3Only ? ranked.slice(0, 3) : ranked;
    }

    const pinned = pinnedIssueIds
      .map((id) => ranked.find((issue) => issue.id === id))
      .filter(
        (issue): issue is (typeof ranked)[number] => Boolean(issue),
      );
    const rest = ranked.filter((issue) => !pinnedIssueIds.includes(issue.id));

    const merged = [...pinned, ...rest].map((issue, index) => ({
      ...issue,
      priorityRank: index + 1,
    }));

    return top3Only ? merged.slice(0, 3) : merged;
  }, [filteredIssues, pinnedIssueIds, top3Only, variant]);

  function togglePin(issueId: string) {
    setPinnedIssueIds((current) => {
      if (current.includes(issueId)) {
        return current.filter((id) => id !== issueId);
      }
      if (current.length >= 3) {
        return [...current.slice(1), issueId];
      }
      return [...current, issueId];
    });
  }

  return (
    <div className={variant === "meeting" ? "space-y-4" : "space-y-8"}>
      <IssuesPageHeader
        organizationId={organizationId}
        canCreate={canCreate}
        teams={teams}
        members={members}
        defaultOwnerId={currentUserId}
        defaultTeamId={defaultTeamId}
        linkedMeetingId={linkedMeetingId}
        filters={filters}
        onFiltersChange={setFilters}
        meetingMode={variant === "meeting"}
      />
      {variant === "meeting" ? (
        <>
          <div className="flex items-center gap-2">
            <input
              id="issues-top3-only"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={top3Only}
              onChange={(event) => setTop3Only(event.target.checked)}
            />
            <label htmlFor="issues-top3-only" className="text-sm text-muted-foreground">
              Show top 3 only
            </label>
          </div>
          <IssuesDedupePanel
            organizationId={organizationId}
            issues={rankedIssues}
            canUseAi={canCreate}
          />
        </>
      ) : null}
      <IssueTable
        organizationId={organizationId}
        orgSlug={orgSlug}
        orgRole={orgRole}
        issues={rankedIssues}
        canCreate={canCreate}
        meetingMode={variant === "meeting"}
        pinnedIssueIds={pinnedIssueIds}
        onTogglePin={variant === "meeting" ? togglePin : undefined}
      />
    </div>
  );
}
