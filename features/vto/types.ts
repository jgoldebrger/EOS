import type { Tables } from "@/types/database";

export type VtoSection = Tables<"vto_sections">;
export type VtoSnapshot = Tables<"vto_snapshots">;

export interface VtoSnapshotSection {
  section_key: string;
  title: string;
  content: string;
  display_order: number;
  visible: boolean;
}

export type VtoActionResult =
  | { success: true }
  | { success: false; error: string };

export type BootstrapVtoResult =
  | { success: true; seeded: boolean }
  | { success: false; error: string };

export type CreateSnapshotResult =
  | { success: true; snapshotId: string }
  | { success: false; error: string };
