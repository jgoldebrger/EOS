import { createClient } from "@/lib/supabase/server";
import { sopDocumentSchema } from "@/features/process/schema";
import type {
  ProcessPageDetail,
  ProcessPageListItem,
  ProcessPageVersionListItem,
  ProcessTag,
} from "@/features/process/types";

export type {
  ProcessPageDetail,
  ProcessPageListItem,
  ProcessPageVersionListItem,
} from "@/features/process/types";

export interface ProcessListFilters {
  search?: string;
  includeArchived?: boolean;
  accountabilitySeatId?: string | null;
}

const LIST_COLUMNS =
  "id, title, content, content_format, category, parent_id, team_id, accountability_seat_id, archived_at, updated_at, created_at";

function mapListRow(
  row: Record<string, unknown>,
  tags: ProcessTag[] = [],
): ProcessPageListItem {
  return {
    id: row.id as string,
    title: row.title as string,
    content: (row.content as string) ?? "",
    content_format:
      (row.content_format as ProcessPageListItem["content_format"]) ?? "text",
    category: (row.category as string) ?? "General",
    parent_id: (row.parent_id as string | null) ?? null,
    team_id: (row.team_id as string | null) ?? null,
    accountability_seat_id: (row.accountability_seat_id as string | null) ?? null,
    archived_at: (row.archived_at as string | null) ?? null,
    updated_at: row.updated_at as string,
    created_at: row.created_at as string,
    tags,
  };
}

function mapDetailRow(
  row: Record<string, unknown>,
  tags: ProcessTag[] = [],
): ProcessPageDetail {
  const sopRaw = row.sop_document;
  const parsedSop =
    sopRaw && typeof sopRaw === "object"
      ? sopDocumentSchema.safeParse(sopRaw)
      : null;

  return {
    ...mapListRow(row, tags),
    organization_id: row.organization_id as string,
    sop_document: parsedSop?.success ? parsedSop.data : null,
  };
}

async function getTagsForPages(
  pageIds: string[],
): Promise<Record<string, ProcessTag[]>> {
  if (pageIds.length === 0) {
    return {};
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("process_page_tags")
    .select("process_page_id, tags(id, name, color)")
    .in("process_page_id", pageIds);

  if (error || !data) {
    return {};
  }

  const result: Record<string, ProcessTag[]> = {};

  for (const row of data) {
    const tagJoin = row.tags as {
      id: string;
      name: string;
      color: string | null;
    } | null;
    if (!tagJoin) {
      continue;
    }
    const pageId = row.process_page_id as string;
    const existing = result[pageId] ?? [];
    existing.push({
      id: tagJoin.id,
      name: tagJoin.name,
      color: tagJoin.color,
    });
    result[pageId] = existing;
  }

  for (const pageId of pageIds) {
    if (!result[pageId]) {
      result[pageId] = [];
    } else {
      result[pageId]!.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  return result;
}

function applyListFilters<
  T extends {
    is: (column: string, value: null) => T;
    not: (column: string, operator: string, value: null) => T;
    ilike: (column: string, pattern: string) => T;
    eq: (column: string, value: string) => T;
  },
>(query: T, filters?: ProcessListFilters): T {
  if (!filters?.includeArchived) {
    query = query.is("archived_at", null);
  }
  if (filters?.search?.trim()) {
    query = query.ilike("title", `%${filters.search.trim()}%`);
  }
  if (filters?.accountabilitySeatId) {
    query = query.eq("accountability_seat_id", filters.accountabilitySeatId);
  }
  return query;
}

export async function getProcessPagesForOrg(
  organizationId: string,
  filters?: ProcessListFilters,
): Promise<ProcessPageListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("process_pages")
    .select(LIST_COLUMNS)
    .eq("organization_id", organizationId)
    .is("team_id", null)
    .order("updated_at", { ascending: false });

  query = applyListFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    console.error("getProcessPagesForOrg:", error.message);
    return [];
  }

  const rows = data ?? [];
  const pageIds = rows.map((row) => row.id as string);
  const tagsByPage = await getTagsForPages(pageIds);

  return rows.map((row) =>
    mapListRow(row as Record<string, unknown>, tagsByPage[row.id as string] ?? []),
  );
}

export async function getProcessPagesForTeam(
  organizationId: string,
  teamId: string,
  filters?: ProcessListFilters,
): Promise<ProcessPageListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("process_pages")
    .select(LIST_COLUMNS)
    .eq("organization_id", organizationId)
    .eq("team_id", teamId)
    .order("display_order", { ascending: true });

  query = applyListFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    console.error("getProcessPagesForTeam:", error.message);
    return [];
  }

  const rows = data ?? [];
  const pageIds = rows.map((row) => row.id as string);
  const tagsByPage = await getTagsForPages(pageIds);

  return rows.map((row) =>
    mapListRow(row as Record<string, unknown>, tagsByPage[row.id as string] ?? []),
  );
}

export async function getProcessPageById(
  organizationId: string,
  pageId: string,
): Promise<ProcessPageDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("process_pages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", pageId)
    .maybeSingle();

  if (!data) return null;

  const tagsByPage = await getTagsForPages([pageId]);
  return mapDetailRow(
    data as Record<string, unknown>,
    tagsByPage[pageId] ?? [],
  );
}

export async function getProcessPageVersions(
  organizationId: string,
  pageId: string,
): Promise<ProcessPageVersionListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("process_page_versions")
    .select("id, process_page_id, version_number, note, created_at, created_by")
    .eq("organization_id", organizationId)
    .eq("process_page_id", pageId)
    .order("version_number", { ascending: false });

  if (error) {
    console.error("getProcessPageVersions:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    process_page_id: row.process_page_id,
    version_number: row.version_number,
    note: row.note,
    created_at: row.created_at,
    created_by: row.created_by,
  }));
}

export interface ProcessHealthMetrics {
  totalSeats: number;
  seatsWithSop: number;
  documentedPct: number;
  staleSopCount: number;
}

export async function getProcessHealthMetrics(
  organizationId: string,
): Promise<ProcessHealthMetrics> {
  const supabase = await createClient();
  const staleDays = 90;
  const staleBefore = new Date();
  staleBefore.setDate(staleBefore.getDate() - staleDays);

  const [seatsResult, pagesResult] = await Promise.all([
    supabase
      .from("accountability_seats")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("process_pages" as never)
      .select("accountability_seat_id, updated_at, archived_at")
      .eq("organization_id", organizationId)
      .is("archived_at", null),
  ]);

  const totalSeats = seatsResult.count ?? 0;
  const pages = (pagesResult.data ?? []) as Array<{
    accountability_seat_id: string | null;
    updated_at: string;
    archived_at: string | null;
  }>;
  const seatsWithSop = new Set(
    pages.map((page) => page.accountability_seat_id).filter((id): id is string => Boolean(id)),
  ).size;
  const staleSopCount = pages.filter(
    (page) => page.updated_at && new Date(page.updated_at) < staleBefore,
  ).length;

  return {
    totalSeats,
    seatsWithSop,
    documentedPct:
      totalSeats > 0 ? Math.round((seatsWithSop / totalSeats) * 100) : 0,
    staleSopCount,
  };
}
