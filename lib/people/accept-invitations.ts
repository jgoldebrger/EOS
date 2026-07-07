import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit";
import { AUDIT_ACTIONS, type OrgRole } from "@/types/domain";

export interface AcceptedInvitation {
  organizationId: string;
  orgSlug: string;
  orgRole: OrgRole;
}

export interface AcceptInvitationsResult {
  accepted: AcceptedInvitation[];
}

export async function acceptPendingInvitations(options: {
  userId: string;
  email: string;
  token?: string | null;
}): Promise<AcceptInvitationsResult> {
  const admin = createAdminClient();
  const normalizedEmail = options.email.trim().toLowerCase();
  const now = new Date().toISOString();

  let query = admin
    .from("invitations")
    .select("id, organization_id, email, org_role, invited_by, organizations(slug)")
    .eq("email", normalizedEmail)
    .is("accepted_at", null)
    .gt("expires_at", now);

  if (options.token) {
    query = query.eq("token", options.token);
  }

  const { data: invitations, error } = await query;
  if (error || !invitations?.length) {
    return { accepted: [] };
  }

  const accepted: AcceptedInvitation[] = [];

  for (const invite of invitations) {
    const { data: existing } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", invite.organization_id)
      .eq("user_id", options.userId)
      .maybeSingle();

    if (existing) {
      await admin
        .from("invitations")
        .update({ accepted_at: now })
        .eq("id", invite.id);
      continue;
    }

    const { error: insertError } = await admin.from("organization_members").insert({
      organization_id: invite.organization_id,
      user_id: options.userId,
      org_role: invite.org_role,
      created_by: invite.invited_by ?? options.userId,
    });

    if (insertError) {
      continue;
    }

    await admin
      .from("invitations")
      .update({ accepted_at: now })
      .eq("id", invite.id);

    const orgJoin = invite.organizations as { slug: string } | { slug: string }[] | null;
    const orgSlug = Array.isArray(orgJoin) ? orgJoin[0]?.slug : orgJoin?.slug;

    await logAuditEvent(admin, {
      organizationId: invite.organization_id,
      actorId: options.userId,
      action: AUDIT_ACTIONS.INVITE,
      entityType: "org_members",
      entityId: options.userId,
      metadata: {
        email: normalizedEmail,
        orgRole: invite.org_role,
        via: options.token ? "invite_token" : "invite_email",
      },
    });

    if (orgSlug) {
      accepted.push({
        organizationId: invite.organization_id,
        orgSlug,
        orgRole: invite.org_role as OrgRole,
      });
    }
  }

  return { accepted };
}
