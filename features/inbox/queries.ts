import { createClient } from "@/lib/supabase/server";

export async function getInboxForUser(organizationId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inbox_items" as never)
    .select("*")
    .eq("organization_id", organizationId)
    .eq("assignee_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []) as Array<{
    id: string;
    title: string;
    body: string | null;
    action_url: string | null;
    read_at: string | null;
    created_at: string;
  }>;
}
