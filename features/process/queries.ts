import { createClient } from "@/lib/supabase/server";

export async function getProcessPagesForTeam(
  organizationId: string,
  teamId: string,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("process_pages" as never)
    .select("*")
    .eq("organization_id", organizationId)
    .eq("team_id", teamId)
    .order("display_order", { ascending: true });

  return (data ?? []) as Array<{
    id: string;
    title: string;
    content: string;
    parent_id: string | null;
  }>;
}
