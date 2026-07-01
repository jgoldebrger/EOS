"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findAuthUserByEmail } from "@/lib/users/find-by-email";
import { canManageOrg } from "@/lib/permissions/checks";
import { logAuditEvent } from "@/lib/audit";
import { toSafeAuthError } from "@/lib/auth/errors";
import {
  addOrgMemberSchema,
  addPersonToOrgSchema,
  createOrgUserAccountSchema,
  inviteOrgMemberSchema,
} from "@/features/people/schema";
import { AUDIT_ACTIONS, type OrgRole } from "@/types/domain";

export type PeopleActionResult =
  | { success: true }
  | { success: false; error: string };

export type AddOrgMemberResult =
  | { success: true }
  | { success: false; error: string };

export type InviteOrgMemberResult =
  | { success: true; mode: "added" | "invited"; emailSent?: boolean }
  | { success: false; error: string };

export type CreateOrgUserAccountResult =
  | { success: true }
  | { success: false; error: string };

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const updateReportsToSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  reportsToUserId: z.string().uuid().nullable(),
  orgSlug: z.string().trim().min(1).optional(),
});

async function assertCanManageOrgMembers(
  organizationId: string,
): Promise<
  | { ok: true; userId: string; orgRole: OrgRole }
  | { ok: false; error: string }
> {
  const user = await getServerSessionUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !canManageOrg(membership.org_role as OrgRole)) {
    return {
      ok: false,
      error: "Only organization admins can manage people.",
    };
  }

  return {
    ok: true,
    userId: user.id,
    orgRole: membership.org_role as OrgRole,
  };
}

function revalidatePeoplePath(orgSlug: string | undefined) {
  if (!orgSlug) return;
  after(() => {
    revalidatePath(`/org/${orgSlug}/people`);
  });
}

async function getInviteRedirectUrl(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  return `${origin}/auth/callback?next=/onboarding`;
}

async function markInvitationsAccepted(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  email: string,
) {
  await supabase
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("email", email)
    .is("accepted_at", null);
}

export async function addOrgMember(input: unknown): Promise<AddOrgMemberResult> {
  const parsed = addOrgMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request",
    };
  }

  const { organizationId, userId, orgRole, orgSlug } = parsed.data;
  const access = await assertCanManageOrgMembers(organizationId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const supabase = await createClient();

  const { data: existingMember } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMember) {
    return {
      success: false,
      error: "This person is already in the organization.",
    };
  }

  const { error } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: userId,
    org_role: orgRole,
    created_by: access.userId,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "This person is already in the organization.",
      };
    }
    return {
      success: false,
      error: "Unable to add organization member. Please try again.",
    };
  }

  await logAuditEvent(supabase, {
    organizationId,
    actorId: access.userId,
    action: AUDIT_ACTIONS.INVITE,
    entityType: "org_members",
    entityId: userId,
    metadata: { orgRole, userId },
  });

  revalidatePeoplePath(orgSlug);

  return { success: true };
}

export async function addPersonToOrg(
  input: unknown,
): Promise<AddOrgMemberResult> {
  const parsed = addPersonToOrgSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request",
    };
  }

  const { organizationId, orgSlug, email, orgRole } = parsed.data;
  const access = await assertCanManageOrgMembers(organizationId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const existingUser = await findAuthUserByEmail(email);
  if (!existingUser) {
    return {
      success: false,
      error:
        "No account with this email. Use Invite person for someone who hasn't signed up yet.",
    };
  }

  const supabase = await createClient();
  const addResult = await addOrgMember({
    organizationId,
    orgSlug,
    userId: existingUser.id,
    orgRole,
  });

  if (addResult.success) {
    await markInvitationsAccepted(supabase, organizationId, email);
  }

  return addResult;
}

export async function createOrgUserAccount(
  input: unknown,
): Promise<CreateOrgUserAccountResult> {
  const parsed = createOrgUserAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid account details",
    };
  }

  const { organizationId, orgSlug, email, password, orgRole } = parsed.data;
  const access = await assertCanManageOrgMembers(organizationId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const existingUser = await findAuthUserByEmail(email);
  if (existingUser) {
    return {
      success: false,
      error:
        "An account with this email already exists. Use Add person instead.",
    };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError || !created.user?.id) {
    return {
      success: false,
      error: toSafeAuthError(createError),
    };
  }

  const supabase = await createClient();
  const addResult = await addOrgMember({
    organizationId,
    orgSlug,
    userId: created.user.id,
    orgRole,
  });

  if (!addResult.success) {
    return addResult;
  }

  await markInvitationsAccepted(supabase, organizationId, email);

  await logAuditEvent(supabase, {
    organizationId,
    actorId: access.userId,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "users",
    entityId: created.user.id,
    metadata: { email, orgRole },
  });

  revalidatePeoplePath(orgSlug);

  return { success: true };
}

export async function inviteOrgMember(
  input: unknown,
): Promise<InviteOrgMemberResult> {
  const parsed = inviteOrgMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid invite details",
    };
  }

  const { organizationId, orgSlug, email, orgRole, sendEmail } = parsed.data;
  const access = await assertCanManageOrgMembers(organizationId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const supabase = await createClient();
  const existingUser = await findAuthUserByEmail(email);

  if (existingUser) {
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (existingMember) {
      return {
        success: false,
        error: "This person is already in the organization.",
      };
    }

    const addResult = await addOrgMember({
      organizationId,
      orgSlug,
      userId: existingUser.id,
      orgRole,
    });

    if (!addResult.success) {
      return addResult;
    }

    await markInvitationsAccepted(supabase, organizationId, email);

    return { success: true, mode: "added" };
  }

  const now = new Date();
  const { data: pendingInvite } = await supabase
    .from("invitations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("email", email)
    .is("accepted_at", null)
    .gt("expires_at", now.toISOString())
    .maybeSingle();

  if (pendingInvite) {
    return {
      success: false,
      error: "An invite is already pending for this email.",
    };
  }

  const token = randomUUID();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS).toISOString();

  const { data: invitation, error: inviteError } = await supabase
    .from("invitations")
    .insert({
      organization_id: organizationId,
      email,
      org_role: orgRole,
      token,
      expires_at: expiresAt,
      invited_by: access.userId,
    })
    .select("id")
    .single();

  if (inviteError || !invitation) {
    if (inviteError?.code === "23505") {
      return {
        success: false,
        error: "An invite is already pending for this email.",
      };
    }
    return {
      success: false,
      error: "Unable to create invite. Please try again.",
    };
  }

  await logAuditEvent(supabase, {
    organizationId,
    actorId: access.userId,
    action: AUDIT_ACTIONS.INVITE,
    entityType: "org_members",
    entityId: invitation.id,
    metadata: { email, orgRole },
  });

  let emailSent = false;
  if (sendEmail) {
    try {
      const admin = createAdminClient();
      const redirectTo = await getInviteRedirectUrl();
      const { error: emailError } = await admin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo,
          data: {
            invitation_token: token,
            organization_id: organizationId,
          },
        },
      );
      emailSent = !emailError;
    } catch {
      emailSent = false;
    }
  }

  revalidatePeoplePath(orgSlug);

  return { success: true, mode: "invited", emailSent };
}

export async function updateReportsTo(input: unknown): Promise<PeopleActionResult> {
  const parsed = updateReportsToSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request",
    };
  }

  const supabase = await createClient();
  const user = await getServerSessionUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !canManageOrg(membership.org_role as OrgRole)) {
    return {
      success: false,
      error: "Only organization admins can set reporting lines",
    };
  }

  if (parsed.data.reportsToUserId === parsed.data.userId) {
    return { success: false, error: "A person cannot report to themselves" };
  }

  const { error } = await supabase
    .from("organization_members")
    .update({ reports_to_user_id: parsed.data.reportsToUserId })
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", parsed.data.userId);

  if (error) {
    const message = error.message.includes("cycle")
      ? "This would create a reporting cycle"
      : error.message.includes("same organization")
        ? "Manager must be a member of this organization"
        : "Unable to update reporting line";

    return { success: false, error: message };
  }

  revalidatePeoplePath(parsed.data.orgSlug);

  return { success: true };
}
