"use client";

import type { TeamContext } from "@/hooks/use-current-team.types";
import { useSelectedTeam } from "@/features/teams/components/team-context";

export type { TeamContext } from "@/hooks/use-current-team.types";

export function useCurrentTeam(): TeamContext | null {
  try {
    return useSelectedTeam();
  } catch {
    return null;
  }
}
