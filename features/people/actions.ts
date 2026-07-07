"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findAuthUserByEmail } from "@/lib/users/find-by-email";
import { buildFullName } from "@/lib/users/display-name";
import { canManageOrg } from "@/lib/permissions/checks";
import { logAuditEvent } from "@/lib/audit";
import { toSafeAuthError } from "@/lib/auth/errors";
import {
  addOrgMemberSchema,
  addPersonToOrgSchema,
  createOrgUserAccountSchema,
  inviteOrgMemberSchema,
  cancelInvitationSchema,
  resendInvitationSchema,
} from "@/features/people/schema";
import { AUDIT_ACTIONS, type OrgRole } from "@/types/domain";
import { acceptPendingInvitations } from "@/lib/people/accept-invitations";

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

  const { organizationId, orgSlug, firstName, lastName, email, password, orgRole } =
    parsed.data;
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
  const fullName = buildFullName(firstName, lastName);
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: fullName,
      },
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

export async function upsertPeopleReview(input: unknown): Promise<PeopleActionResult> {
  const { upsertPeopleReviewSchema } = await import("@/features/people/schema");
  const parsed = upsertPeopleReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid review" };
  }

  const user = await getServerSessionUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { success: false, error: "No access" };
  }

  const orgRole = membership.org_role as OrgRole;
  const reviewerUserId = parsed.data.reviewerUserId ?? user.id;

  if (!canManageOrg(orgRole) && reviewerUserId !== user.id) {
    return { success: false, error: "Permission denied" };
  }

  const { error } = await supabase.from("people_reviews" as never).upsert(
    {
      organization_id: parsed.data.organizationId,
      subject_user_id: parsed.data.subjectUserId,
      reviewer_user_id: reviewerUserId,
      seat_id: parsed.data.seatId ?? null,
      get_it: parsed.data.getIt,
      want_it: parsed.data.wantIt,
      capacity: parsed.data.capacity,
      core_values_scores: parsed.data.coreValuesScores ?? {},
      notes: parsed.data.notes ?? "",
      quarter: parsed.data.quarter,
    } as never,
    { onConflict: "organization_id,subject_user_id,reviewer_user_id,quarter" },
  );

  if (error) {
    return { success: false, error: "Could not save review" };
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateOrgMemberRole(input: unknown): Promise<PeopleActionResult> {
  const { updateOrgMemberRoleSchema } = await import("@/features/people/schema");
  const parsed = updateOrgMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const access = await assertCanManageOrgMembers(parsed.data.organizationId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_members")
    .update({ org_role: parsed.data.orgRole })
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", parsed.data.userId);

  if (error) {
    return { success: false, error: "Could not update member role" };
  }

  await logAuditEvent(supabase, {
    organizationId: parsed.data.organizationId,
    actorId: access.userId,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: "org_members",
    entityId: parsed.data.userId,
    metadata: { orgRole: parsed.data.orgRole },
  });

  revalidatePeoplePath(parsed.data.orgSlug);
  return { success: true };
}

export async function removeOrgMember(input: unknown): Promise<PeopleActionResult> {
  const { removeOrgMemberSchema } = await import("@/features/people/schema");
  const parsed = removeOrgMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  if (parsed.data.userId === (await getServerSessionUser())?.id) {
    return { success: false, error: "You cannot remove yourself" };
  }

  const access = await assertCanManageOrgMembers(parsed.data.organizationId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", parsed.data.userId);

  if (error) {
    return { success: false, error: "Could not remove member" };
  }

  revalidatePeoplePath(parsed.data.orgSlug);
  return { success: true };
}

export async function sendPeopleReviewReminders(input: {
  organizationId: string;
  orgSlug: string;
  quarter: string;
}): Promise<PeopleActionResult & { remindedCount?: number }> {
  const access = await assertCanManageOrgMembers(input.organizationId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const supabase = await createClient();
  const { data: managers } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .in("org_role", ["owner", "admin", "member"]);

  const { data: reviews } = await supabase
    .from("people_reviews" as never)
    .select("reviewer_user_id, subject_user_id")
    .eq("organization_id", input.organizationId)
    .eq("quarter", input.quarter);

  const completedPairs = new Set(
    ((reviews ?? []) as Array<{ reviewer_user_id: string; subject_user_id: string }>).map(
      (row) => `${row.reviewer_user_id}:${row.subject_user_id}`,
    ),
  );

  const { data: people } = await supabase
    .from("organization_members")
    .select("user_id, reports_to_user_id")
    .eq("organization_id", input.organizationId);

  const { createInboxItem } = await import("@/features/inbox/actions");
  const { queueNotification } = await import("@/lib/notifications/send");

  let remindedCount = 0;
  const actionUrl = `/org/${input.orgSlug}/people/analyzer`;

  for (const manager of managers ?? []) {
    const subordinates = (people ?? []).filter(
      (person) => person.reports_to_user_id === manager.user_id,
    );

    for (const subordinate of subordinates) {
      const key = `${manager.user_id}:${subordinate.user_id}`;
      if (completedPairs.has(key)) {
        continue;
      }

      await createInboxItem({
        organizationId: input.organizationId,
        assigneeId: manager.user_id,
        title: `Complete People Analyzer review for ${input.quarter}`,
        body: "Quarterly GWC and core values review is due for a direct report.",
        sourceType: "people_review",
        sourceId: subordinate.user_id,
        actionUrl,
      });

      await queueNotification({
        userId: manager.user_id,
        type: "people_review_reminder",
        subject: `People Analyzer review due (${input.quarter})`,
        body: "A quarterly People Analyzer review is waiting for your direct report.",
        actionUrl,
      });

      remindedCount += 1;
    }
  }

  revalidatePath(`/org/${input.orgSlug}/inbox`);
  return { success: true, remindedCount };
}

export type AcceptInvitationsActionResult =
  | { success: true; acceptedCount: number; redirectSlug?: string }
  | { success: false; error: string };

export async function acceptPendingInvitationsForCurrentUser(
  token?: string | null,
): Promise<AcceptInvitationsActionResult> {
  const user = await getServerSessionUser();
  if (!user?.email) {
    return { success: false, error: "You must be signed in with an email address." };
  }

  const { accepted } = await acceptPendingInvitations({
    userId: user.id,
    email: user.email,
    token,
  });

  for (const invite of accepted) {
    after(() => {
      revalidatePath(`/org/${invite.orgSlug}/people`);
      revalidatePath(`/org/${invite.orgSlug}/settings/members`);
    });
  }

  return {
    success: true,
    acceptedCount: accepted.length,
    redirectSlug: accepted[0]?.orgSlug,
  };
}

export async function acceptInvitationByToken(
  input: unknown,
): Promise<AcceptInvitationsActionResult> {
  const { acceptInvitationByTokenSchema } = await import("@/features/people/schema");
  const parsed = acceptInvitationByTokenSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid invitation token",
    };
  }

  return acceptPendingInvitationsForCurrentUser(parsed.data.token);
}

export async function cancelInvitation(input: unknown): Promise<PeopleActionResult> {
  const parsed = cancelInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request",
    };
  }

  const access = await assertCanManageOrgMembers(parsed.data.organizationId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", parsed.data.invitationId)
    .eq("organization_id", parsed.data.organizationId)
    .is("accepted_at", null);

  if (error) {
    return { success: false, error: "Unable to cancel invitation." };
  }

  after(() => {
    revalidatePath(`/org/${parsed.data.orgSlug}/settings/members`);
    revalidatePath(`/org/${parsed.data.orgSlug}/people`);
  });

  return { success: true };
}

export async function resendInvitationEmail(input: unknown): Promise<
  | { success: true; emailSent: boolean }
  | { success: false; error: string }
> {
  const parsed = resendInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request",
    };
  }

  const access = await assertCanManageOrgMembers(parsed.data.organizationId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, email, token, expires_at")
    .eq("id", parsed.data.invitationId)
    .eq("organization_id", parsed.data.organizationId)
    .is("accepted_at", null)
    .maybeSingle();

  if (!invitation) {
    return { success: false, error: "Invitation not found or already accepted." };
  }

  if (invitation.expires_at <= now) {
    return { success: false, error: "Invitation has expired. Create a new invite." };
  }

  try {
    const admin = createAdminClient();
    const redirectTo = await getInviteRedirectUrl();
    const { error: emailError } = await admin.auth.admin.inviteUserByEmail(
      invitation.email,
      {
        redirectTo,
        data: {
          invitation_token: invitation.token,
          organization_id: parsed.data.organizationId,
        },
      },
    );

    return { success: true, emailSent: !emailError };
  } catch {
    return { success: true, emailSent: false };
  }
}
