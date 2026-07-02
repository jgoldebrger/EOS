"use server";

import { createClient } from "@/lib/supabase/server";

export async function createInboxItem(input: {
  organizationId: string;
  assigneeId: string;
  title: string;
  body?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  actionUrl?: string | null;
}) {
  if (!input.assigneeId) {
    return;
  }

  const supabase = await createClient();
  await supabase.from("inbox_items" as never).insert({
    organization_id: input.organizationId,
    assignee_id: input.assigneeId,
    title: input.title,
    body: input.body ?? null,
    source_type: input.sourceType ?? null,
    source_id: input.sourceId ?? null,
    action_url: input.actionUrl ?? null,
  } as never);
}
