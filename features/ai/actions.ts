"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { requireActionRateLimit } from "@/lib/security/action-rate-limit";
import { createTodo } from "@/features/todos/actions";
import { archiveIssue, updateIssue } from "@/features/issues/actions";
import { createHeadline } from "@/features/headlines/actions";
import { saveMeetingNote } from "@/features/meetings/actions";
import {
  approveSuggestionSchema,
  dismissSuggestionSchema,
  issueMergeSuggestionPayloadSchema,
  suggestionPayloadSchema,
  meetingSummaryPayloadSchema,
  scorecardInsightPayloadSchema,
  todoSuggestionPayloadSchema,
  type AiSuggestion,
} from "@/features/ai/schema";
import { getSuggestionById } from "@/features/ai/queries";
import type { AiSuggestionActionResult } from "@/features/ai/types";
import { AUDIT_ACTIONS } from "@/types/domain";
import type { Json } from "@/types/database";
import { logAuditEvent } from "@/lib/audit";

import { requireEditableActor } from "@/lib/auth/get-action-actor";

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
    case "meeting_summary": {
      const summaryPayload = meetingSummaryPayloadSchema.parse(payload);
      const sections: string[] = [summaryPayload.summary];

      if (summaryPayload.keyDecisions.length > 0) {
        sections.push(
          `Key decisions:\n${summaryPayload.keyDecisions.map((item) => `• ${item}`).join("\n")}`,
        );
      }
      if (summaryPayload.actionItems.length > 0) {
        sections.push(
          `Action items:\n${summaryPayload.actionItems.map((item) => `• ${item}`).join("\n")}`,
        );
      }

      const noteResult = await saveMeetingNote({
        organizationId: suggestion.organizationId,
        meetingId: summaryPayload.meetingId,
        sectionKey: "conclude",
        content: sections.join("\n\n"),
      });

      if (!noteResult.success) {
        return { success: false, error: noteResult.error };
      }

      return { success: true, suggestionId: suggestion.id };
    }
    case "scorecard_insight": {
      const insightPayload = scorecardInsightPayloadSchema.parse(payload);
      const headlineResult = await createHeadline({
        organizationId: suggestion.organizationId,
        teamId: null,
        title: `${insightPayload.metricName}: ${insightPayload.trend}`,
        body: insightPayload.insight,
        headlineType: "employee",
      });

      if (!headlineResult.success) {
        return { success: false, error: headlineResult.error };
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
    case "agenda_focus":
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

  const actor = await requireEditableActor(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const rateLimit = requireActionRateLimit(
    actor.user.id,
    "ai-approve",
    60,
    60 * 60 * 1000,
  );
  if (rateLimit) {
    return { success: false, error: rateLimit.error };
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

  const actor = await requireEditableActor(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const rateLimit = requireActionRateLimit(
    actor.user.id,
    "ai-dismiss",
    60,
    60 * 60 * 1000,
  );
  if (rateLimit) {
    return { success: false, error: rateLimit.error };
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
