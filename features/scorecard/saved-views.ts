"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionActor } from "@/lib/auth/get-action-actor";

const bookmarkSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().min(1),
  teamSlug: z.string().min(1),
  teamId: z.string().uuid().optional(),
  filters: z.object({
    period: z.string(),
    groupBy: z.string(),
    state: z.string(),
    category: z.string(),
    range: z.string(),
    q: z.string().optional(),
  }),
});

export type ScorecardBookmarkResult =
  | { success: true; bookmarked: boolean }
  | { success: false; error: string };

export async function toggleScorecardBookmark(
  input: unknown,
): Promise<ScorecardBookmarkResult> {
  const parsed = bookmarkSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid bookmark request" };
  }

  const actor = await getActionActor(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error };
  }

  let existingQuery = actor.supabase
    .from("saved_scorecard_views")
    .select("id")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", actor.user.id)
    .eq("is_bookmarked", true);

  if (parsed.data.teamId) {
    existingQuery = existingQuery.eq("team_id", parsed.data.teamId);
  } else {
    existingQuery = existingQuery.is("team_id", null);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    const { error } = await actor.supabase
      .from("saved_scorecard_views")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return { success: false, error: "Could not remove bookmark" };
    }

    revalidatePath(
      `/org/${parsed.data.orgSlug}/teams/${parsed.data.teamSlug}/scorecard`,
    );
    return { success: true, bookmarked: false };
  }

  const { error } = await actor.supabase.from("saved_scorecard_views").insert({
    organization_id: parsed.data.organizationId,
    user_id: actor.user.id,
    team_id: parsed.data.teamId ?? null,
    name: "Bookmarked view",
    filters: parsed.data.filters,
    is_bookmarked: true,
  });

  if (error) {
    return { success: false, error: "Could not save bookmark" };
  }

  revalidatePath(
    `/org/${parsed.data.orgSlug}/teams/${parsed.data.teamSlug}/scorecard`,
  );
  return { success: true, bookmarked: true };
}

export type ScorecardViewFilters = {
  period: string;
  groupBy: string;
  state: string;
  category: string;
  range: string;
  q?: string;
};

export function scorecardFiltersToSearchParams(
  filters: ScorecardViewFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("period", filters.period || "weekly");
  params.set("groupBy", filters.groupBy || "owner");
  params.set("state", filters.state || "active");
  params.set("range", filters.range || "13");
  if (filters.category && filters.category !== "all") {
    params.set("category", filters.category);
  }
  if (filters.q?.trim()) {
    params.set("q", filters.q.trim());
  }
  return params;
}

export function scorecardFiltersFromSearchParams(
  searchParams: URLSearchParams,
): ScorecardViewFilters {
  return {
    period: searchParams.get("period") ?? "weekly",
    groupBy: searchParams.get("groupBy") ?? "owner",
    state: searchParams.get("state") ?? "active",
    category: searchParams.get("category") ?? "all",
    range: searchParams.get("range") ?? "13",
    q: searchParams.get("q") ?? "",
  };
}

export function scorecardFiltersMatch(
  saved: ScorecardViewFilters,
  current: ScorecardViewFilters,
): boolean {
  return (
    saved.period === current.period &&
    saved.groupBy === current.groupBy &&
    saved.state === current.state &&
    saved.category === current.category &&
    saved.range === current.range &&
    (saved.q ?? "") === (current.q ?? "")
  );
}

export async function getScorecardBookmark(
  organizationId: string,
  teamId: string | undefined,
): Promise<ScorecardViewFilters | null> {
  const actor = await getActionActor(organizationId);
  if ("error" in actor) {
    return null;
  }

  let query = actor.supabase
    .from("saved_scorecard_views")
    .select("filters")
    .eq("organization_id", organizationId)
    .eq("user_id", actor.user.id)
    .eq("is_bookmarked", true);

  if (teamId) {
    query = query.eq("team_id", teamId);
  } else {
    query = query.is("team_id", null);
  }

  const { data } = await query.maybeSingle();
  if (!data?.filters || typeof data.filters !== "object" || Array.isArray(data.filters)) {
    return null;
  }

  const raw = data.filters as Record<string, unknown>;
  return {
    period: typeof raw.period === "string" ? raw.period : "weekly",
    groupBy: typeof raw.groupBy === "string" ? raw.groupBy : "owner",
    state: typeof raw.state === "string" ? raw.state : "active",
    category: typeof raw.category === "string" ? raw.category : "all",
    range: typeof raw.range === "string" ? raw.range : "13",
    q: typeof raw.q === "string" ? raw.q : "",
  };
}
