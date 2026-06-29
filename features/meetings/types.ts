import type {
  MeetingStatusDb,
  MeetingTypeDb,
  Tables,
} from "@/types/database";

export type Meeting = Tables<"meetings">;
export type MeetingNote = Tables<"meeting_notes">;
export type Decision = Tables<"decisions">;

export interface AgendaStep {
  key: string;
  label: string;
  durationMinutes: number;
  required: boolean;
}

export type L10AgendaTemplate = AgendaStep[];

export interface MeetingDecision extends Decision {
  deciderLabel: string;
}

export interface MeetingWithNotes extends Meeting {
  teamName: string | null;
  notes: MeetingNote[];
  decisions: MeetingDecision[];
  agenda: L10AgendaTemplate;
}

export interface MeetingListItem extends Meeting {
  teamName: string | null;
}

export interface MeetingTeamOption {
  id: string;
  name: string;
  slug: string;
}

export type MeetingActionResult =
  | { success: true }
  | { success: false; error: string };

export type CreateMeetingResult =
  | { success: true; meetingId: string }
  | { success: false; error: string };

export type { MeetingStatusDb, MeetingTypeDb };
