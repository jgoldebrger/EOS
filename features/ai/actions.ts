"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createTodo } from "@/features/todos/actions";
import { archiveIssue, updateIssue } from "@/features/issues/actions";
import {
  approveSuggestionSchema,
  dismissSuggestionSchema,
  issueMergeSuggestionPayloadSchema,
  suggestionPayloadSchema,
  todoSuggestionPayloadSchema,
  type AiSuggestion,
} from "@/features/ai/schema";
import { getSuggestionById } from "@/features/ai/queries";
import type { AiSuggestionActionResult } from "@/features/ai/types";
import { AUDIT_ACTIONS } from "@/types/domain";
import type { Json } from "@/types/database";
import { logAuditEvent } from "@/lib/audit";

async function getActorContext(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in" } as const;
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You do not have access to this organization" } as const;
  }

  return { supabase, user } as const;
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  actorId: string,
  suggestionId: string,
  action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS],
  metadata: Json,
) {
  await logAuditEvent(supabase, {
    organizationId,
    actorId,
    action,
    entityType: "ai_suggestions",
    entityId: suggestionId,
    metadata,
  });
}

async function resolveSuggestionStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  suggestionId: string,
  actorId: string,
  status: "approved" | "dismissed",
  payload?: unknown,
) {
  const update: {
    status: "approved" | "dismissed";
    resolved_at: string;
    resolved_by: string;
    payload?: Json;
  } = {
    status,
    resolved_at: new Date().toISOString(),
    resolved_by: actorId,
  };

  if (payload !== undefined) {
    update.payload = payload as Json;
  }

  const { error } = await supabase
    .from("ai_suggestions")
    .update(update)
    .eq("organization_id", organizationId)
    .eq("id", suggestionId)
    .eq("status", "pending");

  return !error;
}

async function applyApprovedSuggestion(
  suggestion: AiSuggestion,
  actorId: string,
  editedPayload?: unknown,
): Promise<AiSuggestionActionResult> {
  const payloadResult = suggestionPayloadSchema.safeParse(
    editedPayload ?? suggestion.payload,
  );

  if (!payloadResult.success) {
    return {
      success: false,
      error: "Suggestion payload is invalid",
    };
  }

  const payload = payloadResult.data;

  switch (suggestion.suggestionType) {
    case "todo": {
      const todoPayload = todoSuggestionPayloadSchema.parse(payload);
      const result = await createTodo({
        organizationId: suggestion.organizationId,
        title: todoPayload.title,
        ownerId: todoPayload.ownerId ?? actorId,
        dueDate: todoPayload.dueDate ?? null,
        teamId: todoPayload.teamId ?? null,
        sourceType: todoPayload.sourceMeetingId ? "meeting" : "manual",
        sourceId: todoPayload.sourceMeetingId ?? null,
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, suggestionId: suggestion.id };
    }
    case "issue_merge": {
      const mergePayload = issueMergeSuggestionPayloadSchema.parse(payload);

      const updateResult = await updateIssue({
        organizationId: suggestion.organizationId,
        issueId: mergePayload.primaryIssueId,
        title: mergePayload.mergedTitle,
      });

      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }

      for (const issueId of mergePayload.mergeIssueIds) {
        if (issueId === mergePayload.primaryIssueId) {
          continue;
        }

        const archiveResult = await archiveIssue({
          organizationId: suggestion.organizationId,
          issueId,
        });

        if (!archiveResult.success) {
          return { success: false, error: archiveResult.error };
        }
      }

      return { success: true, suggestionId: suggestion.id };
    }
    case "meeting_summary":
    case "agenda_focus":
    case "scorecard_insight":
      return { success: true, suggestionId: suggestion.id };
    default:
      return { success: false, error: "Unsupported suggestion type" };
  }
}

export async function approveSuggestion(
  input: unknown,
): Promise<AiSuggestionActionResult> {
  const parsed = approveSuggestionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid approval request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const suggestion = await getSuggestionById(
    parsed.data.organizationId,
    parsed.data.suggestionId,
  );

  if (!suggestion || suggestion.status !== "pending") {
    return { success: false, error: "Suggestion not found or already resolved" };
  }

  const applyResult = await applyApprovedSuggestion(
    suggestion,
    actor.user.id,
    parsed.data.payload,
  );

  if (!applyResult.success) {
    return applyResult;
  }

  const resolved = await resolveSuggestionStatus(
    actor.supabase,
    parsed.data.organizationId,
    parsed.data.suggestionId,
    actor.user.id,
    "approved",
    parsed.data.payload ?? suggestion.payload,
  );

  if (!resolved) {
    return { success: false, error: "Unable to update suggestion status" };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    parsed.data.suggestionId,
    AUDIT_ACTIONS.UPDATE,
    {
      status: "approved",
      suggestionType: suggestion.suggestionType,
    } as Json,
  );

  const { data: orgRow } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (orgRow?.slug) {
    revalidatePath(`/org/${orgRow.slug}/todos`);
    revalidatePath(`/org/${orgRow.slug}/issues`);
    revalidatePath(`/org/${orgRow.slug}/meetings`);
    revalidatePath(`/org/${orgRow.slug}/scorecard`);
  }

  return { success: true, suggestionId: parsed.data.suggestionId };
}

export async function dismissSuggestion(
  input: unknown,
): Promise<AiSuggestionActionResult> {
  const parsed = dismissSuggestionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid dismiss request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const suggestion = await getSuggestionById(
    parsed.data.organizationId,
    parsed.data.suggestionId,
  );

  if (!suggestion || suggestion.status !== "pending") {
    return { success: false, error: "Suggestion not found or already resolved" };
  }

  const resolved = await resolveSuggestionStatus(
    actor.supabase,
    parsed.data.organizationId,
    parsed.data.suggestionId,
    actor.user.id,
    "dismissed",
  );

  if (!resolved) {
    return { success: false, error: "Unable to update suggestion status" };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    parsed.data.suggestionId,
    AUDIT_ACTIONS.UPDATE,
    {
      status: "dismissed",
      suggestionType: suggestion.suggestionType,
    } as Json,
  );

  return { success: true, suggestionId: parsed.data.suggestionId };
}
