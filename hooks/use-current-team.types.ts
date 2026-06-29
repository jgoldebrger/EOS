import type { TeamRole } from "@/types/domain";

export interface TeamContext {
  teamId: string;
  teamSlug: string;
  role: TeamRole;
}
