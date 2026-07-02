"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeOrgMember, updateOrgMemberRole } from "@/features/people/actions";
import type { OrgPersonWithManager } from "@/features/people/queries";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface MembersManagementProps {
  organizationId: string;
  orgSlug: string;
  members: OrgPersonWithManager[];
  currentUserId: string;
}

export function MembersManagement({
  organizationId,
  orgSlug,
  members,
  currentUserId,
}: MembersManagementProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleRoleChange(userId: string, orgRole: "admin" | "member" | "viewer") {
    setPendingId(userId);
    const result = await updateOrgMemberRole({
      organizationId,
      orgSlug,
      userId,
      orgRole,
    });
    setPendingId(null);
    if (!result.success) {
      showErrorToast(result.error);
      return;
    }
    showSuccessToast("Member role updated");
    router.refresh();
  }

  async function handleRemove(userId: string) {
    setPendingId(userId);
    const result = await removeOrgMember({ organizationId, orgSlug, userId });
    setPendingId(null);
    if (!result.success) {
      showErrorToast(result.error);
      return;
    }
    showSuccessToast("Member removed");
    router.refresh();
  }

  return (
    <ul className="space-y-2" data-testid="members-management">
      {members.map((member) => (
        <Card key={member.userId}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium">{member.displayName}</p>
              {member.seatTitle ? (
                <p className="text-xs text-muted-foreground">Seat: {member.seatTitle}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border px-2 text-sm capitalize"
                value={member.orgRole}
                disabled={pendingId === member.userId || member.userId === currentUserId}
                onChange={(e) =>
                  handleRoleChange(
                    member.userId,
                    e.target.value as "admin" | "member" | "viewer",
                  )
                }
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <Badge variant="secondary" className="capitalize">
                {member.orgRole}
              </Badge>
              {member.userId !== currentUserId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pendingId === member.userId}
                  onClick={() => handleRemove(member.userId)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </ul>
  );
}
