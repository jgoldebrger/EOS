"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { TeamWithRole } from "@/features/teams/types";
import type { TeamRole } from "@/types/domain";
import { useOrgContext } from "@/features/organizations/components/org-context";

export interface TeamContextValue {
  teamId: string;
  teamSlug: string;
  role: TeamRole;
}

interface TeamProviderState {
  teams: TeamWithRole[];
  selectedTeamId: string | null;
  setSelectedTeamId: (teamId: string) => void;
}

const TeamContext = createContext<TeamProviderState | null>(null);

function storageKey(orgSlug: string) {
  return `eos:selected-team:${orgSlug}`;
}

function resolveInitialTeamId(orgSlug: string, teams: TeamWithRole[]): string | null {
  if (teams.length === 0) {
    return null;
  }

  if (typeof window === "undefined") {
    return teams[0].id;
  }

  const stored = window.localStorage.getItem(storageKey(orgSlug));
  return teams.find((team) => team.id === stored)?.id ?? teams[0].id;
}

export function TeamProvider({
  teams,
  children,
}: {
  teams: TeamWithRole[];
  children: React.ReactNode;
}) {
  const { orgSlug } = useOrgContext();
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(() =>
    resolveInitialTeamId(orgSlug, teams),
  );

  const setSelectedTeamId = useCallback(
    (teamId: string) => {
      setSelectedTeamIdState(teamId);
      window.localStorage.setItem(storageKey(orgSlug), teamId);
    },
    [orgSlug],
  );

  const value = useMemo(
    () => ({ teams, selectedTeamId, setSelectedTeamId }),
    [teams, selectedTeamId, setSelectedTeamId],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeamContext(): TeamProviderState {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeamContext must be used within TeamProvider");
  }
  return context;
}

export function useSelectedTeam(): TeamContextValue | null {
  const { teams, selectedTeamId } = useTeamContext();
  const team = teams.find((entry) => entry.id === selectedTeamId);
  if (!team) {
    return null;
  }

  return {
    teamId: team.id,
    teamSlug: team.slug,
    role: team.role,
  };
}
