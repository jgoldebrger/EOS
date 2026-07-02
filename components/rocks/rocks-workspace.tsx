"use client";

import { useMemo, useState } from "react";
import { getCurrentQuarter } from "@/features/rocks/utils";
import type {
  RockFilters,
  RockMemberOption,
  RockTeamOption,
  RockWithOwner,
} from "@/features/rocks/types";
import { RocksPageHeader } from "@/components/rocks/rocks-page-header";
import { RockTable } from "@/components/rocks/rock-table";
import type { OrgRole } from "@/types/domain";

interface RocksWorkspaceProps {
  organizationId: string;
  orgRole: OrgRole;
  currentUserId: string;
  isTeamLeader: boolean;
  canCreate: boolean;
  rocks: RockWithOwner[];
  teams: RockTeamOption[];
  members: RockMemberOption[];
  variant?: "page" | "meeting";
  scope?: "company" | "team";
}

export function RocksWorkspace({
  organizationId,
  orgRole,
  currentUserId,
  isTeamLeader,
  canCreate,
  rocks,
  teams,
  members,
  variant = "page",
  scope = "team",
}: RocksWorkspaceProps) {
  const defaultQuarter = getCurrentQuarter();
  const [filters, setFilters] = useState<RockFilters>({
    quarter: defaultQuarter,
    ...(scope === "company" ? { rockType: "company" as const } : {}),
  });

  const quarters = useMemo(() => {
    const unique = new Set(rocks.map((rock) => rock.quarter));
    unique.add(defaultQuarter);
    return Array.from(unique).sort().reverse();
  }, [rocks, defaultQuarter]);

  const filteredRocks = useMemo(() => {
    return rocks.filter((rock) => {
      if (filters.quarter && rock.quarter !== filters.quarter) return false;
      if (filters.ownerId && rock.owner_id !== filters.ownerId) return false;
      if (filters.status && rock.status !== filters.status) return false;
      if (filters.teamId && rock.team_id !== filters.teamId) return false;
      if (filters.rockType && rock.rock_type !== filters.rockType) return false;
      return true;
    });
  }, [rocks, filters]);

  return (
    <div className={variant === "meeting" ? "space-y-4" : "space-y-8"}>
      <RocksPageHeader
        organizationId={organizationId}
        canCreate={canCreate}
        teams={teams}
        members={members}
        defaultOwnerId={currentUserId}
        defaultQuarter={defaultQuarter}
        quarters={quarters}
        filters={filters}
        onFiltersChange={setFilters}
        meetingMode={variant === "meeting"}
        defaultRockType={scope === "company" ? "company" : "team"}
        pageTitle={scope === "company" ? "Company rocks" : undefined}
        pageDescription={
          scope === "company"
            ? "Quarterly company-level priorities visible across the organization."
            : undefined
        }
        hideTeamFilter={scope === "company"}
      />
      <RockTable
        organizationId={organizationId}
        orgRole={orgRole}
        currentUserId={currentUserId}
        isTeamLeader={isTeamLeader}
        rocks={filteredRocks}
        canCreate={canCreate}
      />
    </div>
  );
}
