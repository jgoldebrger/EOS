"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgPeopleWithManagers } from "@/features/people/queries";

export interface NavSearchRock {
  id: string;
  title: string;
  href: string;
}

export interface NavSearchIssue {
  id: string;
  title: string;
  href: string;
}

export interface NavSearchMeeting {
  id: string;
  title: string;
  href: string;
}

export interface NavSearchPerson {
  userId: string;
  displayName: string;
  href: string;
}

export interface NavSearchResults {
  rocks: NavSearchRock[];
  issues: NavSearchIssue[];
  meetings: NavSearchMeeting[];
  people: NavSearchPerson[];
}

export async function searchNavigationEntities(
  organizationId: string,
  orgSlug: string,
  query: string,
  limit = 8,
): Promise<NavSearchResults> {
  const q = query.trim();
  if (q.length < 2) {
    return { rocks: [], issues: [], meetings: [], people: [] };
  }

  const supabase = await createClient();
  const pattern = `%${q}%`;

  const [{ data: rocks }, { data: issues }, { data: meetings }, orgPeople] =
    await Promise.all([
      supabase
        .from("rocks")
        .select("id, title, teams(slug)")
        .eq("organization_id", organizationId)
        .is("archived_at", null)
        .ilike("title", pattern)
        .limit(limit),
      supabase
        .from("issues")
        .select("id, title, teams(slug)")
        .eq("organization_id", organizationId)
        .is("archived_at", null)
        .ilike("title", pattern)
        .limit(limit),
      supabase
        .from("meetings")
        .select("id, title, teams(slug)")
        .eq("organization_id", organizationId)
        .ilike("title", pattern)
        .order("created_at", { ascending: false })
        .limit(limit),
      getOrgPeopleWithManagers(organizationId),
    ]);

  const needle = q.toLowerCase();
  const people = orgPeople
    .filter(
      (person) =>
        person.displayName.toLowerCase().includes(needle) ||
        person.seatTitle?.toLowerCase().includes(needle),
    )
    .slice(0, limit)
    .map((person) => ({
      userId: person.userId,
      displayName: person.displayName,
      href: `/org/${orgSlug}/people`,
    }));

  return {
    rocks: (rocks ?? []).map((rock) => {
      const teamSlug = (rock.teams as { slug: string } | null)?.slug ?? "default";
      return {
        id: rock.id,
        title: rock.title,
        href: `/org/${orgSlug}/teams/${teamSlug}/rocks`,
      };
    }),
    issues: (issues ?? []).map((issue) => {
      const teamSlug = (issue.teams as { slug: string } | null)?.slug ?? "default";
      return {
        id: issue.id,
        title: issue.title,
        href: `/org/${orgSlug}/teams/${teamSlug}/issues`,
      };
    }),
    meetings: (meetings ?? []).map((meeting) => {
      const teamSlug = (meeting.teams as { slug: string } | null)?.slug ?? "default";
      return {
        id: meeting.id,
        title: meeting.title,
        href: `/org/${orgSlug}/teams/${teamSlug}/l10/${meeting.id}`,
      };
    }),
    people,
  };
}
