import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditAction, AuditEntityType } from "@/types/domain";
import type { Database, Json } from "@/types/database";

export interface LogAuditEventInput {
  organizationId: string;
  actorId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Json | null;
}

export async function logAuditEvent(
  supabase: SupabaseClient<Database>,
  input: LogAuditEventInput,
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    organization_id: input.organizationId,
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? null,
  });

  if (error) {
    console.error(
      `audit_logs insert failed (${input.entityType}/${input.action}):`,
      error.message,
    );
  }
}
