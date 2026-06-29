"use client";

import type { TeamRole } from "@/types/domain";

export interface TeamContext {
  teamId: string;
  teamSlug: string;
  role: TeamRole;
}

/** Team context wiring arrives in a later wave. */
export function useCurrentTeam(): TeamContext | null {
  return null;
}
