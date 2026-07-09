import { createClient } from "@/lib/supabase/server";

export interface InboxItem {
  id: string;
  title: string;
  body: string | null;
  source_type: string | null;
  source_id: string | null;
  action_url: string | null;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
}

export async function getInboxForUser(
  organizationId: string,
  userId: string,
  options?: { includeArchived?: boolean },
) {
  const supabase = await createClient();
  let query = supabase
    .from("inbox_items")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("assignee_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!options?.includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data } = await query;
  return (data ?? []) as InboxItem[];
}

export async function getUnreadInboxCount(
  organizationId: string,
  userId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("inbox_items")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("assignee_id", userId)
    .is("read_at", null)
    .is("archived_at", null);

  return count ?? 0;
}
