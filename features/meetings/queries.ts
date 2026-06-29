import { createClient } from "@/lib/supabase/server";
import { formatOwnerLabel } from "@/features/scorecard/utils";
import {
  parseAgendaTemplate,
} from "@/features/meetings/utils";
import type {
  MeetingDecision,
  MeetingListItem,
  MeetingTeamOption,
  MeetingWithNotes,
} from "@/features/meetings/types";

function mapMeetingListRow(row: Record<string, unknown>): MeetingListItem {
  const { teams: teamJoin, ...meeting } = row as unknown as {
    teams: { name: string } | null;
  } & MeetingListItem;

  return {
    ...meeting,
    teamName: teamJoin?.name ?? null,
  };
}

export async function getMeetingsForOrg(
  organizationId: string,
): Promise<MeetingListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meetings")
    .select("*, teams(name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapMeetingListRow(row));
}

export async function getMeetingById(
  organizationId: string,
  meetingId: string,
): Promise<MeetingWithNotes | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentEmail = user?.email ?? null;

  const { data: meeting, error } = await supabase
    .from("meetings")
    .select("*, teams(name)")
    .eq("organization_id", organizationId)
    .eq("id", meetingId)
    .maybeSingle();

  if (error || !meeting) {
    return null;
  }

  const { data: notes } = await supabase
    .from("meeting_notes")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("section_key", { ascending: true });

  const { data: decisions } = await supabase
    .from("decisions")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });

  const { teams: teamJoin, ...meetingRow } = meeting as {
    teams: { name: string } | null;
  } & MeetingWithNotes;

  const mappedDecisions: MeetingDecision[] = (decisions ?? []).map((decision) => ({
    ...decision,
    deciderLabel: decision.decided_by
      ? user?.id === decision.decided_by
        ? formatOwnerLabel(decision.decided_by, currentEmail)
        : formatOwnerLabel(decision.decided_by)
      : "Unassigned",
  }));

  return {
    ...meetingRow,
    teamName: teamJoin?.name ?? null,
    notes: notes ?? [],
    decisions: mappedDecisions,
    agenda: parseAgendaTemplate(meeting.agenda_template),
  };
}

export async function getOrgTeamsForMeetings(
  organizationId: string,
): Promise<MeetingTeamOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("id, name, slug")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}
