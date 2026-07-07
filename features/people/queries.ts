import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { resolveUserEmails } from "@/lib/users/resolve-emails";
import type { CoreValueRating } from "@/features/people/utils";
import { parseCoreValuesFromVto } from "@/features/people/utils";
import { getVtoSections } from "@/features/vto/queries";

export interface OrgPersonWithManager {
  userId: string;
  orgRole: string;
  reportsToUserId: string | null;
  displayName: string;
  managerName: string | null;
  seatTitle: string | null;
}

export async function getOrgPeopleWithManagers(
  organizationId: string,
): Promise<OrgPersonWithManager[]> {
  return getOrgPeopleWithManagersCached(organizationId);
}

const getOrgPeopleWithManagersCached = cache(
  async (organizationId: string): Promise<OrgPersonWithManager[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_members")
      .select("user_id, org_role, reports_to_user_id, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });

    if (error || !data) {
      return [];
    }

    const seatByUser = await getSeatTitlesByUser(organizationId);
    const userIds = data.flatMap((row) =>
      [row.user_id, row.reports_to_user_id].filter((id): id is string => Boolean(id)),
    );
    const resolved = await resolveUserEmails(userIds);

    return data.map((row) => {
      const person = resolved.get(row.user_id);
      const manager = row.reports_to_user_id
        ? resolved.get(row.reports_to_user_id)
        : null;

      return {
        userId: row.user_id,
        orgRole: row.org_role,
        reportsToUserId: row.reports_to_user_id,
        displayName: person?.displayName ?? row.user_id.slice(0, 8),
        managerName: manager?.displayName ?? null,
        seatTitle: seatByUser.get(row.user_id) ?? null,
      };
    });
  },
);

export async function getSubordinateUserIds(
  organizationId: string,
  managerUserId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("reports_to_user_id", managerUserId);

  if (error || !data) {
    return [];
  }

  return data.map((row) => row.user_id);
}

export interface PeopleReviewRow {
  id: string;
  subjectUserId: string;
  reviewerUserId: string;
  seatId: string | null;
  seatTitle: string | null;
  getIt: number;
  wantIt: number;
  capacity: number;
  coreValuesScores: Record<string, CoreValueRating>;
  notes: string;
  quarter: string;
  subjectName: string;
  reviewerName: string;
}

export interface PendingInvitationRow {
  id: string;
  email: string;
  orgRole: string;
  expiresAt: string;
  createdAt: string;
  invitedByName: string | null;
}

export async function getPendingOrgInvitations(
  organizationId: string,
): Promise<PendingInvitationRow[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("invitations")
    .select("id, email, org_role, expires_at, created_at, invited_by")
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const inviterIds = data
    .map((row) => row.invited_by)
    .filter((id): id is string => Boolean(id));
  const resolved = await resolveUserEmails(inviterIds);

  return data.map((row) => ({
    id: row.id,
    email: row.email,
    orgRole: row.org_role,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    invitedByName: row.invited_by
      ? (resolved.get(row.invited_by)?.displayName ?? null)
      : null,
  }));
}

export async function getCoreValuesForOrg(organizationId: string): Promise<string[]> {
  const sections = await getVtoSections(organizationId);
  const coreValuesSection = sections.find((section) => section.section_key === "core_values");
  if (!coreValuesSection?.content) {
    return [];
  }
  return parseCoreValuesFromVto(coreValuesSection.content);
}

export async function getSeatTitlesByUser(
  organizationId: string,
): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accountability_seats")
    .select("title, assigned_user_id")
    .eq("organization_id", organizationId)
    .not("assigned_user_id", "is", null);

  const result = new Map<string, string>();
  for (const seat of data ?? []) {
    if (seat.assigned_user_id) {
      result.set(seat.assigned_user_id, seat.title);
    }
  }
  return result;
}

export async function getPeopleReviewsForOrg(
  organizationId: string,
  quarter: string,
): Promise<PeopleReviewRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people_reviews" as never)
    .select("*")
    .eq("organization_id", organizationId)
    .eq("quarter", quarter);

  if (error || !data) {
    return [];
  }

  const rows = data as Array<{
    id: string;
    subject_user_id: string;
    reviewer_user_id: string;
    seat_id: string | null;
    get_it: number;
    want_it: number;
    capacity: number;
    core_values_scores: Record<string, CoreValueRating> | null;
    notes: string;
    quarter: string;
  }>;

  const seatIds = rows.map((row) => row.seat_id).filter((id): id is string => Boolean(id));
  const seatTitles = new Map<string, string>();
  if (seatIds.length > 0) {
    const { data: seats } = await supabase
      .from("accountability_seats")
      .select("id, title")
      .in("id", seatIds);
    for (const seat of seats ?? []) {
      seatTitles.set(seat.id, seat.title);
    }
  }

  const userIds = rows.flatMap((row) => [row.subject_user_id, row.reviewer_user_id]);
  const resolved = await resolveUserEmails(userIds);

  return rows.map((row) => ({
    id: row.id,
    subjectUserId: row.subject_user_id,
    reviewerUserId: row.reviewer_user_id,
    seatId: row.seat_id,
    seatTitle: row.seat_id ? (seatTitles.get(row.seat_id) ?? null) : null,
    getIt: row.get_it,
    wantIt: row.want_it,
    capacity: row.capacity,
    coreValuesScores: row.core_values_scores ?? {},
    notes: row.notes,
    quarter: row.quarter,
    subjectName:
      resolved.get(row.subject_user_id)?.displayName ?? row.subject_user_id.slice(0, 8),
    reviewerName:
      resolved.get(row.reviewer_user_id)?.displayName ?? row.reviewer_user_id.slice(0, 8),
  }));
}

export async function getPeopleReviewsForTeam(
  organizationId: string,
  teamId: string,
  quarter: string,
): Promise<PeopleReviewRow[]> {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId);

  const memberIds = (members ?? []).map((row) => row.user_id);
  if (memberIds.length === 0) {
    return [];
  }

  const reviews = await getPeopleReviewsForOrg(organizationId, quarter);
  return reviews.filter((review) => memberIds.includes(review.subjectUserId));
}
