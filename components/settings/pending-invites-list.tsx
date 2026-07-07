"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  cancelInvitation,
  resendInvitationEmail,
} from "@/features/people/actions";
import type { PendingInvitationRow } from "@/features/people/queries";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PendingInvitesListProps {
  organizationId: string;
  orgSlug: string;
  invitations: PendingInvitationRow[];
}

function formatExpiry(expiresAt: string): string {
  const date = new Date(expiresAt);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PendingInvitesList({
  organizationId,
  orgSlug,
  invitations,
}: PendingInvitesListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (invitations.length === 0) {
    return null;
  }

  async function handleCancel(invitationId: string) {
    setPendingId(invitationId);
    const result = await cancelInvitation({ organizationId, orgSlug, invitationId });
    setPendingId(null);
    if (!result.success) {
      showErrorToast(result.error);
      return;
    }
    showSuccessToast("Invitation cancelled");
    router.refresh();
  }

  async function handleResend(invitationId: string) {
    setPendingId(invitationId);
    const result = await resendInvitationEmail({
      organizationId,
      orgSlug,
      invitationId,
    });
    setPendingId(null);
    if (!result.success) {
      showErrorToast(result.error);
      return;
    }
    showSuccessToast(
      result.emailSent ? "Invite email resent" : "Could not send email — check Resend config",
    );
    router.refresh();
  }

  return (
    <Card data-testid="pending-invites-list">
      <CardHeader>
        <CardTitle className="text-base">Pending invitations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {invitations.map((invite) => (
          <div
            key={invite.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"
          >
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium">{invite.email}</p>
              <p className="text-xs text-muted-foreground">
                Expires {formatExpiry(invite.expiresAt)}
                {invite.invitedByName ? ` · invited by ${invite.invitedByName}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {invite.orgRole}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pendingId === invite.id}
                onClick={() => handleResend(invite.id)}
              >
                Resend
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pendingId === invite.id}
                onClick={() => handleCancel(invite.id)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
