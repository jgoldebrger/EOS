import { createClient } from "@/lib/supabase/server";
import type { ProcessPageContentFormatDb } from "@/types/database";
import { sopDocumentSchema, type SopDocument } from "@/features/process/schema";

export interface ProcessPageListItem {
  id: string;
  title: string;
  content: string;
  content_format: ProcessPageContentFormatDb;
  parent_id: string | null;
  team_id: string | null;
  updated_at: string;
  created_at: string;
}

export interface ProcessPageDetail extends ProcessPageListItem {
  sop_document: SopDocument | null;
  organization_id: string;
}

function mapListRow(row: Record<string, unknown>): ProcessPageListItem {
  return {
    id: row.id as string,
    title: row.title as string,
    content: (row.content as string) ?? "",
    content_format: (row.content_format as ProcessPageContentFormatDb) ?? "text",
    parent_id: (row.parent_id as string | null) ?? null,
    team_id: (row.team_id as string | null) ?? null,
    updated_at: row.updated_at as string,
    created_at: row.created_at as string,
  };
}

function mapDetailRow(row: Record<string, unknown>): ProcessPageDetail {
  const sopRaw = row.sop_document;
  const parsedSop =
    sopRaw && typeof sopRaw === "object"
      ? sopDocumentSchema.safeParse(sopRaw)
      : null;

  return {
    ...mapListRow(row),
    organization_id: row.organization_id as string,
    sop_document: parsedSop?.success ? parsedSop.data : null,
  };
}

export async function getProcessPagesForOrg(
  organizationId: string,
): Promise<ProcessPageListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("process_pages")
    .select(
      "id, title, content, content_format, parent_id, team_id, updated_at, created_at",
    )
    .eq("organization_id", organizationId)
    .is("team_id", null)
    .order("updated_at", { ascending: false });

  return (data ?? []).map((row) => mapListRow(row as Record<string, unknown>));
}

export async function getProcessPagesForTeam(
  organizationId: string,
  teamId: string,
): Promise<ProcessPageListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("process_pages")
    .select(
      "id, title, content, content_format, parent_id, team_id, updated_at, created_at",
    )
    .eq("organization_id", organizationId)
    .eq("team_id", teamId)
    .order("display_order", { ascending: true });

  return (data ?? []).map((row) => mapListRow(row as Record<string, unknown>));
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
  return mapDetailRow(data as Record<string, unknown>);
}
