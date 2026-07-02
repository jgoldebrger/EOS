import { createClient } from "@/lib/supabase/server";
import {
  ownerLabelFromProfiles,
  resolveOwnerProfiles,
} from "@/lib/users/owner-labels";
import {
  parseAgendaTemplate,
} from "@/features/meetings/utils";
import type {
  MeetingDecision,
  MeetingListItem,
  MeetingTeamOption,
  MeetingWithNotes,
  L10AgendaTemplate,
} from "@/features/meetings/types";
import { getDefaultL10Agenda, resolveL10AgendaFromSettings } from "@/features/meetings/utils";

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

export async function getMeetingsForTeam(
  organizationId: string,
  teamId: string,
): Promise<MeetingListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meetings")
    .select("*, teams(name)")
    .eq("organization_id", organizationId)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapMeetingListRow(row));
}

export async function getInProgressMeetingForTeam(
  organizationId: string,
  teamId: string,
): Promise<MeetingListItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meetings")
    .select("*, teams(name)")
    .eq("organization_id", organizationId)
    .eq("team_id", teamId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMeetingListRow(data);
}

export async function getMeetingById(
  organizationId: string,
  meetingId: string,
): Promise<MeetingWithNotes | null> {
  const supabase = await createClient();

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

  const deciderProfiles = await resolveOwnerProfiles(
    (decisions ?? []).map((decision) => decision.decided_by),
  );

  const { teams: teamJoin, ...meetingRow } = meeting as {
    teams: { name: string } | null;
  } & MeetingWithNotes;

  const mappedDecisions: MeetingDecision[] = (decisions ?? []).map((decision) => ({
    ...decision,
    deciderLabel: decision.decided_by
      ? ownerLabelFromProfiles(deciderProfiles, decision.decided_by)
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

export async function getOrgL10AgendaTemplate(
  organizationId: string,
): Promise<L10AgendaTemplate> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return getDefaultL10Agenda();
  }

  return resolveL10AgendaFromSettings(data.settings);
}

export interface MeetingRecapData {
  meeting: MeetingWithNotes;
  headlines: Array<{ id: string; title: string; body: string; headline_type: string }>;
  todos: Array<{ id: string; title: string; status: string }>;
  issues: Array<{ id: string; title: string; status: string }>;
  pendingSuggestions: Awaited<ReturnType<typeof import("@/features/ai/queries").getPendingSuggestions>>;
}

export async function getMeetingRecapData(
  organizationId: string,
  meetingId: string,
): Promise<MeetingRecapData | null> {
  const meeting = await getMeetingById(organizationId, meetingId);
  if (!meeting) {
    return null;
  }

  const supabase = await createClient();
  const { getPendingSuggestions } = await import("@/features/ai/queries");

  const [headlinesResult, todosResult, issuesResult, pendingSuggestions] =
    await Promise.all([
      supabase
        .from("headlines" as never)
        .select("id, title, body, headline_type")
        .eq("organization_id", organizationId)
        .eq("meeting_id", meetingId)
        .is("archived_at", null),
      supabase
        .from("todos")
        .select("id, title, status")
        .eq("organization_id", organizationId)
        .eq("source_type", "meeting")
        .eq("source_id", meetingId),
      supabase
        .from("issues")
        .select("id, title, status")
        .eq("organization_id", organizationId)
        .eq("linked_meeting_id", meetingId),
      getPendingSuggestions({ organizationId, meetingId }),
    ]);

  return {
    meeting,
    headlines: (headlinesResult.data ?? []) as MeetingRecapData["headlines"],
    todos: todosResult.data ?? [],
    issues: issuesResult.data ?? [],
    pendingSuggestions,
  };
}
