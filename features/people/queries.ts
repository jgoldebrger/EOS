import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { resolveUserEmails } from "@/lib/users/resolve-emails";

export interface OrgPersonWithManager {
  userId: string;
  orgRole: string;
  reportsToUserId: string | null;
  displayName: string;
  managerName: string | null;
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
  getIt: number;
  wantIt: number;
  capacity: number;
  notes: string;
  quarter: string;
  subjectName: string;
  reviewerName: string;
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
    get_it: number;
    want_it: number;
    capacity: number;
    notes: string;
    quarter: string;
  }>;

  const userIds = rows.flatMap((row) => [row.subject_user_id, row.reviewer_user_id]);
  const resolved = await resolveUserEmails(userIds);

  return rows.map((row) => ({
    id: row.id,
    subjectUserId: row.subject_user_id,
    reviewerUserId: row.reviewer_user_id,
    getIt: row.get_it,
    wantIt: row.want_it,
    capacity: row.capacity,
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
