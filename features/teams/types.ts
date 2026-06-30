import type { Team } from "@/types/database";
import type { TeamRole } from "@/types/domain";

export interface TeamWithRole extends Team {
  role: TeamRole;
}

export type CreateTeamResult =
  | { success: true; slug: string }
  | { success: false; error: string };

export interface TeamMemberPerson {
  id: string;
  userId: string;
  teamRole: TeamRole;
  displayName: string;
  email: string | null;
  createdAt: string;
}

export interface OrgMemberOption {
  userId: string;
  orgRole: string;
  displayName: string;
  email: string | null;
}

export type TeamMemberMutationResult =
  | { success: true }
  | { success: false; error: string };
