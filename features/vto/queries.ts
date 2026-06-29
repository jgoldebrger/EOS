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
