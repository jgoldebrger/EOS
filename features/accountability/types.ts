import type { OrgRoleDb, Tables } from "@/types/database";

export type AccountabilitySeat = Tables<"accountability_seats">;

export interface SeatAssignee {
  userId: string;
  label: string;
  email: string | null;
}

export interface SeatWithAssignee extends AccountabilitySeat {
  assignee: SeatAssignee | null;
}

export interface SeatNode extends SeatWithAssignee {
  children: SeatNode[];
}

export interface SeatMemberOption {
  userId: string;
  orgRole: OrgRoleDb;
  label: string;
}

export type SeatActionResult =
  | { success: true }
  | { success: false; error: string };

export type CreateSeatResult =
  | { success: true; seatId: string }
  | { success: false; error: string };
