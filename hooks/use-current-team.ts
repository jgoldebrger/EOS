"use client";

import type { TeamRole } from "@/types/domain";

export interface TeamContext {
  teamId: string;
  teamSlug: string;
  role: TeamRole;
}

export function useCurrentTeam(): TeamContext | null {
  throw new Error("useCurrentTeam: not implemented (Wave 1b)");
}
