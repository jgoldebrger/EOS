"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json, TablesUpdate } from "@/types/database";
import {
  archiveProcessPageSchema,
  createProcessPageSchema,
  deleteProcessPageSchema,
  restoreProcessPageVersionSchema,
  setProcessPageTagsSchema,
  sopDocumentSchema,
  updateProcessPageSchema,
  type SopDocument,
} from "@/features/process/schema";
import {
  getProcessPageById,
  getProcessPageVersions,
} from "@/features/process/queries";
import type { ProcessPageVersionListItem } from "@/features/process/types";

export type ProcessActionResult =
  | { success: true; id?: string; document?: SopDocument }
  | { success: false; error: string };

const MAX_VERSIONS_PER_PAGE = 20;

function revalidateProcessPaths(
  orgSlug: string,
  teamSlug?: string | null,
  pageId?: string,
) {
  after(() => {
    revalidatePath(`/org/${orgSlug}/process`);
    if (teamSlug) {
      revalidatePath(`/org/${orgSlug}/teams/${teamSlug}/process`);
    }
    if (pageId) {
      revalidatePath(`/org/${orgSlug}/process/${pageId}`);
      revalidatePath(`/org/${orgSlug}/process/${pageId}/edit`);
      if (teamSlug) {
        revalidatePath(`/org/${orgSlug}/teams/${teamSlug}/process/${pageId}`);
        revalidatePath(`/org/${orgSlug}/teams/${teamSlug}/process/${pageId}/edit`);
      }
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

function applyTeamScope<T extends { is: (column: string, value: null) => T; eq: (column: string, value: string) => T }>(
  query: T,
  teamId: string | null | undefined,
): T {
  if (teamId === null) {
    return query.is("team_id", null) as T;
  }
  if (teamId) {
    return query.eq("team_id", teamId) as T;
  }
  return query;
}

async function saveProcessPageVersion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  page: {
    id: string;
    organization_id: string;
    title: string;
    content: string;
    sop_document: Json | null;
  },
  userId: string,
): Promise<{ error?: string }> {
  const { data: maxRow } = await supabase
    .from("process_page_versions")
    .select("version_number")
    .eq("process_page_id", page.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (maxRow?.version_number ?? 0) + 1;

  const { error: insertError } = await supabase
    .from("process_page_versions")
    .insert({
      process_page_id: page.id,
      organization_id: page.organization_id,
      sop_document: page.sop_document,
      content: page.content ?? "",
      version_number: nextVersion,
      note: `Before update (v${nextVersion})`,
      created_by: userId,
    });

  if (insertError) {
    return { error: "Could not save version snapshot" };
  }

  const { data: staleVersions } = await supabase
    .from("process_page_versions")
    .select("id")
    .eq("process_page_id", page.id)
    .order("version_number", { ascending: false })
    .range(MAX_VERSIONS_PER_PAGE, MAX_VERSIONS_PER_PAGE + 99);

  if (staleVersions?.length) {
    await supabase
      .from("process_page_versions")
      .delete()
      .in(
        "id",
        staleVersions.map((row) => row.id),
      );
  }

  return {};
}

async function replaceProcessPageTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  pageId: string,
  tagIds: string[],
): Promise<{ error?: string }> {
  if (tagIds.length > 0) {
    const { data: validTags, error: tagError } = await supabase
      .from("tags")
      .select("id")
      .eq("organization_id", organizationId)
      .in("id", tagIds);

    if (tagError) {
      return { error: "Unable to validate tags" };
    }

    if ((validTags ?? []).length !== tagIds.length) {
      return { error: "One or more tags are invalid" };
    }
  }

  const { error: deleteError } = await supabase
    .from("process_page_tags")
    .delete()
    .eq("process_page_id", pageId);

  if (deleteError) {
    return { error: "Unable to update page tags" };
  }

  if (tagIds.length === 0) {
    return {};
  }

  const { error: insertError } = await supabase.from("process_page_tags").insert(
    tagIds.map((tagId) => ({
      process_page_id: pageId,
      tag_id: tagId,
    })),
  );

  if (insertError) {
    return { error: "Unable to update page tags" };
  }

  return {};
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

  const {
    organizationId,
    orgSlug,
    teamId,
    teamSlug,
    title,
    category,
    parentId,
  } = parsed.data;

  const { data, error } = await supabase
    .from("process_pages")
    .insert({
      organization_id: organizationId,
      team_id: teamId ?? null,
      parent_id: parentId ?? null,
      title,
      category: category ?? "General",
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
    category,
    parentId,
    contentMarkdown,
    sopDocument,
    tagIds,
  } = parsed.data;

  let currentQuery = supabase
    .from("process_pages")
    .select("id, organization_id, title, content, sop_document")
    .eq("id", id)
    .eq("organization_id", organizationId);

  currentQuery = applyTeamScope(currentQuery, teamId);

  const { data: currentPage } = await currentQuery.maybeSingle();

  if (!currentPage) {
    return { success: false, error: "SOP not found" };
  }

  const updates: TablesUpdate<"process_pages"> = {};
  if (title !== undefined) updates.title = title;
  if (category !== undefined) updates.category = category;
  if (parentId !== undefined) updates.parent_id = parentId;
  if (contentMarkdown !== undefined) updates.content = contentMarkdown;
  if (sopDocument !== undefined) {
    const doc = sopDocumentSchema.parse(sopDocument);
    updates.sop_document = doc as unknown as Json;
    updates.content_format = "sop";
    if (title === undefined) {
      updates.title = doc.title;
    }
  }

  if (Object.keys(updates).length === 0 && tagIds === undefined) {
    return { success: false, error: "Nothing to update" };
  }

  if (Object.keys(updates).length > 0) {
    const versionResult = await saveProcessPageVersion(
      supabase,
      currentPage,
      user.id,
    );
    if (versionResult.error) {
      return { success: false, error: versionResult.error };
    }
  }

  if (Object.keys(updates).length > 0) {
    let query = supabase
      .from("process_pages")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", organizationId);

    query = applyTeamScope(query, teamId);

    const { error } = await query;

    if (error) {
      return { success: false, error: "Could not update SOP" };
    }
  }

  if (tagIds !== undefined) {
    const tagResult = await replaceProcessPageTags(
      supabase,
      organizationId,
      id,
      [...new Set(tagIds)],
    );
    if (tagResult.error) {
      return { success: false, error: tagResult.error };
    }
  }

  revalidateProcessPaths(orgSlug, teamSlug, id);
  return { success: true };
}

export async function listProcessPageVersions(input: {
  organizationId: string;
  processPageId: string;
}): Promise<
  | { success: true; versions: ProcessPageVersionListItem[] }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const versions = await getProcessPageVersions(
    input.organizationId,
    input.processPageId,
  );
  return { success: true, versions };
}

export async function loadProcessPageSopDocument(
  organizationId: string,
  pageId: string,
): Promise<SopDocument | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const page = await getProcessPageById(organizationId, pageId);
  return page?.sop_document ?? null;
}

export async function restoreProcessPageVersion(
  input: unknown,
): Promise<ProcessActionResult> {
  const parsed = restoreProcessPageVersionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid restore request",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const { organizationId, orgSlug, teamId, teamSlug, pageId, versionId } =
    parsed.data;

  let pageQuery = supabase
    .from("process_pages")
    .select("id, organization_id, title, content, sop_document")
    .eq("id", pageId)
    .eq("organization_id", organizationId);

  pageQuery = applyTeamScope(pageQuery, teamId);

  const { data: currentPage } = await pageQuery.maybeSingle();

  if (!currentPage) {
    return { success: false, error: "SOP not found" };
  }

  const { data: version } = await supabase
    .from("process_page_versions")
    .select("id, sop_document, content, version_number")
    .eq("id", versionId)
    .eq("process_page_id", pageId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!version) {
    return { success: false, error: "Version not found" };
  }

  const versionResult = await saveProcessPageVersion(
    supabase,
    currentPage,
    user.id,
  );
  if (versionResult.error) {
    return { success: false, error: versionResult.error };
  }

  const restoredDoc =
    version.sop_document && typeof version.sop_document === "object"
      ? sopDocumentSchema.parse(version.sop_document)
      : null;

  const updates: TablesUpdate<"process_pages"> = {
    content: version.content ?? "",
  };

  if (restoredDoc) {
    updates.sop_document = restoredDoc as unknown as Json;
    updates.content_format = "sop";
    updates.title = restoredDoc.title;
  }

  let updateQuery = supabase
    .from("process_pages")
    .update(updates)
    .eq("id", pageId)
    .eq("organization_id", organizationId);

  updateQuery = applyTeamScope(updateQuery, teamId);

  const { error } = await updateQuery;

  if (error) {
    return { success: false, error: "Could not restore version" };
  }

  revalidateProcessPaths(orgSlug, teamSlug, pageId);
  return { success: true };
}

export async function setProcessPageTags(
  input: unknown,
): Promise<ProcessActionResult> {
  const parsed = setProcessPageTagsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid tag assignment",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const { organizationId, orgSlug, teamId, teamSlug, pageId, tagIds } =
    parsed.data;

  let pageQuery = supabase
    .from("process_pages")
    .select("id")
    .eq("id", pageId)
    .eq("organization_id", organizationId);

  pageQuery = applyTeamScope(pageQuery, teamId);

  const { data: page } = await pageQuery.maybeSingle();

  if (!page) {
    return { success: false, error: "SOP not found" };
  }

  const tagResult = await replaceProcessPageTags(
    supabase,
    organizationId,
    pageId,
    [...new Set(tagIds)],
  );

  if (tagResult.error) {
    return { success: false, error: tagResult.error };
  }

  revalidateProcessPaths(orgSlug, teamSlug, pageId);
  return { success: true };
}

export async function archiveProcessPage(
  input: unknown,
): Promise<ProcessActionResult> {
  const parsed = archiveProcessPageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid archive request",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const { id, organizationId, orgSlug, teamId, teamSlug, archived } =
    parsed.data;

  let query = supabase
    .from("process_pages")
    .update({
      archived_at: archived ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("organization_id", organizationId);

  query = applyTeamScope(query, teamId);

  const { error } = await query;

  if (error) {
    return { success: false, error: "Could not update archive status" };
  }

  revalidateProcessPaths(orgSlug, teamSlug, id);
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

  query = applyTeamScope(query, teamId);

  const { error } = await query;

  if (error) {
    return { success: false, error: "Could not delete SOP" };
  }

  revalidateProcessPaths(orgSlug, teamSlug);
  return { success: true };
}

const SOP_IMAGES_BUCKET = "sop-images";
const MAX_SOP_IMAGE_UPLOAD_BYTES = 600_000;

export async function uploadSopStepImageAction(
  formData: FormData,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const organizationId = formData.get("organizationId");
  const pageId = formData.get("pageId");
  const file = formData.get("file");

  if (
    typeof organizationId !== "string" ||
    typeof pageId !== "string" ||
    !(file instanceof File)
  ) {
    return { success: false, error: "Invalid upload request" };
  }

  if (file.size === 0 || file.size > MAX_SOP_IMAGE_UPLOAD_BYTES) {
    return {
      success: false,
      error: "Image file is missing or too large",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const page = await getProcessPageById(organizationId, pageId);
  if (!page) {
    return { success: false, error: "SOP not found" };
  }

  const path = `${organizationId}/${pageId}/${crypto.randomUUID()}.jpg`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(SOP_IMAGES_BUCKET)
    .upload(path, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  const { data } = supabase.storage.from(SOP_IMAGES_BUCKET).getPublicUrl(path);
  return { success: true, url: data.publicUrl };
}
