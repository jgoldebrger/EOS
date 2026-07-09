import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Server-only inbox insert — not callable from the browser. */
export async function insertInboxItem(
  supabase: SupabaseClient<Database>,
  input: {
    organizationId: string;
    assigneeId: string;
    title: string;
    body?: string | null;
    sourceType?: string | null;
    sourceId?: string | null;
    actionUrl?: string | null;
  },
): Promise<void> {
  if (!input.assigneeId) {
    return;
  }

  await supabase.from("inbox_items").insert({
    organization_id: input.organizationId,
    assignee_id: input.assigneeId,
    title: input.title,
    body: input.body ?? null,
    source_type: input.sourceType ?? null,
    source_id: input.sourceId ?? null,
    action_url: input.actionUrl ?? null,
  });
}
