"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { z } from "zod";

const inboxItemSchema = z.object({
  organizationId: z.string().uuid(),
  itemId: z.string().uuid(),
});

const inboxOrgSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().min(1),
});

export type InboxActionResult =
  | { success: true }
  | { success: false; error: string };

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

export async function markInboxRead(input: unknown): Promise<InboxActionResult> {
  const parsed = inboxItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const user = await getServerSessionUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_items" as never)
    .update({ read_at: new Date().toISOString() } as never)
    .eq("id", parsed.data.itemId)
    .eq("organization_id", parsed.data.organizationId)
    .eq("assignee_id", user.id);

  if (error) {
    return { success: false, error: "Could not mark as read" };
  }

  revalidatePath("/");
  return { success: true };
}

export async function markAllInboxRead(input: unknown): Promise<InboxActionResult> {
  const parsed = inboxOrgSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const user = await getServerSessionUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_items" as never)
    .update({ read_at: new Date().toISOString() } as never)
    .eq("organization_id", parsed.data.organizationId)
    .eq("assignee_id", user.id)
    .is("read_at", null)
    .is("archived_at", null);

  if (error) {
    return { success: false, error: "Could not mark all as read" };
  }

  revalidatePath(`/org/${parsed.data.orgSlug}/inbox`);
  return { success: true };
}

export async function archiveInboxItem(input: unknown): Promise<InboxActionResult> {
  const parsed = inboxItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const user = await getServerSessionUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_items" as never)
    .update({ archived_at: new Date().toISOString() } as never)
    .eq("id", parsed.data.itemId)
    .eq("organization_id", parsed.data.organizationId)
    .eq("assignee_id", user.id);

  if (error) {
    return { success: false, error: "Could not archive item" };
  }

  revalidatePath("/");
  return { success: true };
}
