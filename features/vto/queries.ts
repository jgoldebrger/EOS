import { createClient } from "@/lib/supabase/server";
import type { VtoSection, VtoSnapshot } from "@/features/vto/types";
import { sortVtoSections } from "@/features/vto/utils";

export async function getVtoSections(
  organizationId: string,
  options?: { includeHidden?: boolean },
): Promise<VtoSection[]> {
  const supabase = await createClient();

  let query = supabase
    .from("vto_sections")
    .select("*")
    .eq("organization_id", organizationId);

  if (!options?.includeHidden) {
    query = query.eq("visible", true);
  }

  const { data, error } = await query
    .order("display_order", { ascending: true })
    .order("title", { ascending: true });

  if (error || !data) {
    return [];
  }

  return sortVtoSections(data);
}

export async function getVtoSectionCount(organizationId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("vto_sections")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getSnapshots(organizationId: string): Promise<VtoSnapshot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vto_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

export interface VtoLinkRow {
  id: string;
  entityType: "rock" | "issue" | "metric";
  entityId: string;
  sectionKey: string;
  title: string;
}

export async function getVtoLinks(organizationId: string): Promise<VtoLinkRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vto_links")
    .select("*")
    .eq("organization_id", organizationId);

  if (error || !data) {
    return [];
  }

  const links = data as Array<{
    id: string;
    entity_type: "rock" | "issue" | "metric";
    entity_id: string;
    section_key: string;
  }>;

  const results: VtoLinkRow[] = [];

  for (const link of links) {
    let title = link.entity_id.slice(0, 8);
    if (link.entity_type === "rock") {
      const { data: rock } = await supabase
        .from("rocks")
        .select("title")
        .eq("id", link.entity_id)
        .maybeSingle();
      title = rock?.title ?? title;
    } else if (link.entity_type === "issue") {
      const { data: issue } = await supabase
        .from("issues")
        .select("title")
        .eq("id", link.entity_id)
        .maybeSingle();
      title = issue?.title ?? title;
    } else {
      const { data: metric } = await supabase
        .from("scorecard_metrics")
        .select("name")
        .eq("id", link.entity_id)
        .maybeSingle();
      title = metric?.name ?? title;
    }

    results.push({
      id: link.id,
      entityType: link.entity_type,
      entityId: link.entity_id,
      sectionKey: link.section_key,
      title,
    });
  }

  return results;
}

export interface VtoTractionData {
  companyRocks: Array<{ id: string; title: string; status: string; quarter: string }>;
  openIssues: Array<{ id: string; title: string; status: string }>;
  metrics: Array<{ id: string; name: string; goal: string | null }>;
  links: VtoLinkRow[];
}

export async function getVtoTractionData(organizationId: string): Promise<VtoTractionData> {
  const supabase = await createClient();
  const [rocksResult, issuesResult, metricsResult, links] = await Promise.all([
    supabase
      .from("rocks")
      .select("id, title, status, quarter")
      .eq("organization_id", organizationId)
      .eq("rock_type", "company")
      .is("archived_at", null)
      .order("quarter", { ascending: false }),
    supabase
      .from("issues")
      .select("id, title, status")
      .eq("organization_id", organizationId)
      .is("team_id", null)
      .in("status", ["open", "discussing"])
      .order("priority", { ascending: false }),
    supabase
      .from("scorecard_metrics")
      .select("id, name, display_target")
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .is("team_id", null)
      .order("name", { ascending: true })
      .limit(20),
    getVtoLinks(organizationId),
  ]);

  return {
    companyRocks: (rocksResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      quarter: row.quarter,
    })),
    openIssues: (issuesResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
    })),
    metrics: (metricsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      goal: row.display_target,
    })),
    links,
  };
}
