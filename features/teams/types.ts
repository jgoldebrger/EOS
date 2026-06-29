import type { Team } from "@/types/database";
import type { TeamRole } from "@/types/domain";

export interface TeamWithRole extends Team {
  role: TeamRole;
}

export type CreateTeamResult =
  | { success: true; slug: string }
  | { success: false; error: string };
