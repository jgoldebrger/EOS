import type { Tables, RockStatusDb } from "@/types/database";

export type Rock = Tables<"rocks">;

export interface RockOwner {
  userId: string;
  label: string;
  email?: string | null;
}

export interface RockWithOwner extends Rock {
  owner: RockOwner;
  teamName: string | null;
}

export interface RockFilters {
  quarter?: string;
  ownerId?: string;
  status?: RockStatusDb;
  teamId?: string;
}

export interface RockTeamOption {
  id: string;
  name: string;
  slug: string;
}

export interface RockMemberOption {
  userId: string;
  orgRole: string;
  label: string;
}

export type RockActionResult =
  | { success: true }
  | { success: false; error: string };

export type CreateRockResult =
  | { success: true; rockId: string }
  | { success: false; error: string };
