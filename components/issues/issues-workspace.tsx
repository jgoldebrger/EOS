"use client";

import { useMemo, useState, useTransition } from "react";
import type {
  IssueFilters,
  IssueMemberOption,
  IssueTeamOption,
  IssueWithLinks,
} from "@/features/issues/types";
import { saveIdsSession } from "@/features/meetings/actions";
import type { IdsSession } from "@/features/meetings/ids-session";
import { ensureIdsFocusStarted } from "@/features/meetings/ids-session";
import { IdsTop3Timer } from "@/components/meetings/ids-top3-timer";
import { IssuesPageHeader } from "@/components/issues/issues-page-header";
import { IssuesDedupePanel } from "@/components/issues/issues-dedupe-panel";
import { IssueTable } from "@/components/issues/issue-table";
import { IssueMeetingList } from "@/components/issues/issue-meeting-list";
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
  meetingId?: string;
  initialIdsSession?: IdsSession;
  canEditMeeting?: boolean;
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
  meetingId,
  initialIdsSession,
  canEditMeeting = false,
}: IssuesWorkspaceProps) {
  const [filters, setFilters] = useState<IssueFilters>({});
  const [idsSession, setIdsSession] = useState<IdsSession>(
    initialIdsSession ?? {
      pinnedIssueIds: [],
      focusIndex: 0,
      focusStartedAt: null,
      focusMinutesPerIssue: 5,
      focusExtraSeconds: 0,
      focusLog: [],
    },
  );
  const [, startTransition] = useTransition();
  const pinnedIssueIds = useMemo(
    () => (variant === "meeting" ? idsSession.pinnedIssueIds : []),
    [idsSession.pinnedIssueIds, variant],
  );
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

  const activeIssues = useMemo(
    () => filteredIssues.filter((issue) => !issue.is_parking_lot),
    [filteredIssues],
  );

  const parkingLotIssues = useMemo(
    () => filteredIssues.filter((issue) => issue.is_parking_lot),
    [filteredIssues],
  );

  const rankedIssues = useMemo(() => {
    const ranked = activeIssues.map((issue, index) => ({
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
  }, [activeIssues, pinnedIssueIds, top3Only, variant]);

  function togglePin(issueId: string) {
    if (variant !== "meeting" || !meetingId) {
      return;
    }

    const nextPinned = pinnedIssueIds.includes(issueId)
      ? pinnedIssueIds.filter((id) => id !== issueId)
      : pinnedIssueIds.length >= 3
        ? [...pinnedIssueIds.slice(1), issueId]
        : [...pinnedIssueIds, issueId];

    const nextSession = ensureIdsFocusStarted({
      ...idsSession,
      pinnedIssueIds: nextPinned,
      focusIndex: Math.min(idsSession.focusIndex, Math.max(nextPinned.length - 1, 0)),
      focusStartedAt: nextPinned.length === 0 ? null : idsSession.focusStartedAt,
    });

    setIdsSession(nextSession);
    startTransition(async () => {
      await saveIdsSession({
        organizationId,
        meetingId,
        session: nextSession,
      });
    });
  }

  const issueTitlesById = useMemo(
    () => new Map(issues.map((issue) => [issue.id, issue.title])),
    [issues],
  );

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
          <IdsTop3Timer
            organizationId={organizationId}
            meetingId={meetingId ?? ""}
            session={idsSession}
            issueTitlesById={issueTitlesById}
            canEdit={canEditMeeting}
            onSessionChange={setIdsSession}
          />
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
      {variant === "meeting" ? (
        <IssueMeetingList
          organizationId={organizationId}
          orgSlug={orgSlug}
          orgRole={orgRole}
          activeIssues={rankedIssues}
          parkingLotIssues={parkingLotIssues}
          pinnedIssueIds={pinnedIssueIds}
          onTogglePin={togglePin}
        />
      ) : (
        <IssueTable
          organizationId={organizationId}
          orgSlug={orgSlug}
          orgRole={orgRole}
          issues={rankedIssues}
          canCreate={canCreate}
        />
      )}
    </div>
  );
}
