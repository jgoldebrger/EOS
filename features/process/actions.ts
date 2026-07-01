"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json, TablesUpdate } from "@/types/database";
import {
  createProcessPageSchema,
  deleteProcessPageSchema,
  sopDocumentSchema,
  updateProcessPageSchema,
  type SopDocument,
} from "@/features/process/schema";

export type ProcessActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

function revalidateProcessPaths(
  orgSlug: string,
  teamSlug?: string | null,
) {
  after(() => {
    revalidatePath(`/org/${orgSlug}/process`);
    if (teamSlug) {
      revalidatePath(`/org/${orgSlug}/teams/${teamSlug}/process`);
    }
  });
}

function createEmptySopDocument(pageId: string, title: string): SopDocument {
  return {
    id: pageId,
    title,
    department: "General",
    priority: "Medium",
    steps: [],
    lastModified: new Date().toISOString(),
  };
}

export async function createProcessPage(
  input: unknown,
): Promise<ProcessActionResult & { id?: string }> {
  const parsed = createProcessPageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid process page",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const { organizationId, orgSlug, teamId, teamSlug, title } = parsed.data;

  const { data, error } = await supabase
    .from("process_pages")
    .insert({
      organization_id: organizationId,
      team_id: teamId ?? null,
      title,
      content: "",
      content_format: "sop",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Could not create SOP" };
  }

  const pageId = data.id;
  const sopDocument = createEmptySopDocument(pageId, title);

  const { error: updateError } = await supabase
    .from("process_pages")
    .update({
      sop_document: sopDocument as unknown as Json,
    })
    .eq("id", pageId);

  if (updateError) {
    return { success: false, error: "Could not initialize SOP document" };
  }

  revalidateProcessPaths(orgSlug, teamSlug);
  return { success: true, id: pageId };
}

export async function updateProcessPage(
  input: unknown,
): Promise<ProcessActionResult> {
  const parsed = updateProcessPageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid update",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const {
    id,
    organizationId,
    orgSlug,
    teamId,
    teamSlug,
    title,
    contentMarkdown,
    sopDocument,
  } = parsed.data;

  const updates: TablesUpdate<"process_pages"> = {};
  if (title !== undefined) updates.title = title;
  if (contentMarkdown !== undefined) updates.content = contentMarkdown;
  if (sopDocument !== undefined) {
    const doc = sopDocumentSchema.parse(sopDocument);
    updates.sop_document = doc as unknown as Json;
    updates.content_format = "sop";
    if (title === undefined) {
      updates.title = doc.title;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, error: "Nothing to update" };
  }

  let query = supabase
    .from("process_pages")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (teamId === null) {
    query = query.is("team_id", null);
  } else if (teamId) {
    query = query.eq("team_id", teamId);
  }

  const { error } = await query;

  if (error) {
    return { success: false, error: "Could not update SOP" };
  }

  revalidateProcessPaths(orgSlug, teamSlug);
  revalidatePath(`/org/${orgSlug}/process/${id}`);
  revalidatePath(`/org/${orgSlug}/process/${id}/edit`);
  if (teamSlug) {
    revalidatePath(`/org/${orgSlug}/teams/${teamSlug}/process/${id}`);
    revalidatePath(`/org/${orgSlug}/teams/${teamSlug}/process/${id}/edit`);
  }

  return { success: true };
}

export async function deleteProcessPage(
  input: unknown,
): Promise<ProcessActionResult> {
  const parsed = deleteProcessPageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid delete request",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const { id, organizationId, orgSlug, teamId, teamSlug } = parsed.data;

  let query = supabase
    .from("process_pages")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (teamId === null) {
    query = query.is("team_id", null);
  } else if (teamId) {
    query = query.eq("team_id", teamId);
  }

  const { error } = await query;

  if (error) {
    return { success: false, error: "Could not delete SOP" };
  }

  revalidateProcessPaths(orgSlug, teamSlug);
  return { success: true };
}
