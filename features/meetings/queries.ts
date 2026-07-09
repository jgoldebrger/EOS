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
import { getDefaultL10Agenda, resolveL10AgendaFromSettings, parseSeguePrompts, parseCascadingMessageTemplates } from "@/features/meetings/utils";

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
    organizationId,
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

export async function getOrgSeguePrompts(organizationId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .maybeSingle();

  return parseSeguePrompts(data?.settings);
}

export async function getOrgCascadingTemplates(organizationId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .maybeSingle();

  return parseCascadingMessageTemplates(data?.settings);
}

export interface TeamRatingTrendPoint {
  meetingId: string;
  title: string;
  endedAt: string;
  averageRating: number;
  ratingCount: number;
}

export async function getTeamMeetingRatingTrend(
  organizationId: string,
  teamId: string,
  limit = 8,
): Promise<TeamRatingTrendPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meetings")
    .select("id, title, ended_at, metadata")
    .eq("organization_id", organizationId)
    .eq("team_id", teamId)
    .eq("status", "completed")
    .order("ended_at", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .map((meeting) => {
      const metadata =
        typeof meeting.metadata === "object" &&
        meeting.metadata !== null &&
        !Array.isArray(meeting.metadata)
          ? (meeting.metadata as Record<string, unknown>)
          : {};
      const ratings = Array.isArray(metadata.ratings)
        ? (metadata.ratings as Array<{ rating?: number }>)
        : [];
      const numeric = ratings
        .map((entry) => entry.rating)
        .filter((value): value is number => typeof value === "number");
      const averageRating =
        numeric.length > 0
          ? Math.round((numeric.reduce((sum, value) => sum + value, 0) / numeric.length) * 10) / 10
          : 0;

      return {
        meetingId: meeting.id,
        title: meeting.title,
        endedAt: meeting.ended_at ?? "",
        averageRating,
        ratingCount: numeric.length,
      };
    })
    .reverse();
}

export interface MeetingRecapIssue {
  id: string;
  title: string;
  status: string;
  ids_notes: string | null;
  is_parking_lot: boolean;
  priorityRank: number | null;
}

export interface MeetingRecapData {
  meeting: MeetingWithNotes;
  headlines: Array<{ id: string; title: string; body: string; headline_type: string }>;
  todos: Array<{ id: string; title: string; status: string }>;
  issues: MeetingRecapIssue[];
  idsRecap: import("@/features/meetings/ids-session").IdsRecapSummary | null;
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
  const { parseIdsSession, buildIdsRecapSummary } = await import(
    "@/features/meetings/ids-session"
  );

  const [headlinesResult, todosResult, issuesResult, pendingSuggestions] =
    await Promise.all([
      supabase
        .from("headlines")
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
        .select("id, title, status, ids_notes, is_parking_lot")
        .eq("organization_id", organizationId)
        .eq("linked_meeting_id", meetingId),
      getPendingSuggestions({ organizationId, meetingId }),
    ]);

  const meetingMetadata =
    typeof meeting.metadata === "object" &&
    meeting.metadata !== null &&
    !Array.isArray(meeting.metadata)
      ? (meeting.metadata as Record<string, unknown>)
      : {};

  const idsSession = parseIdsSession(meetingMetadata);
  const storedRecap = meetingMetadata.idsRecap;
  const issueRows = (issuesResult.data ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    ids_notes: string | null;
    is_parking_lot: boolean;
  }>;

  const idsRecap =
    typeof storedRecap === "object" &&
    storedRecap !== null &&
    !Array.isArray(storedRecap)
      ? (storedRecap as import("@/features/meetings/ids-session").IdsRecapSummary)
      : buildIdsRecapSummary(idsSession, issueRows);

  const pinnedRank = new Map(
    idsRecap.pinnedIssueIds.map((issueId, index) => [issueId, index + 1]),
  );

  return {
    meeting,
    headlines: (headlinesResult.data ?? []) as MeetingRecapData["headlines"],
    todos: todosResult.data ?? [],
    issues: issueRows.map((issue) => ({
      ...issue,
      priorityRank: pinnedRank.get(issue.id) ?? null,
    })),
    idsRecap,
    pendingSuggestions,
  };
}
