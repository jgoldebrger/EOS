"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeOrgMember, updateOrgMemberRole } from "@/features/people/actions";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface OrgMemberRow {
  userId: string;
  displayName: string;
  orgRole: string;
}

interface OrgMembersSettingsProps {
  organizationId: string;
  orgSlug: string;
  members: OrgMemberRow[];
  currentUserId: string;
  canManage: boolean;
}

const selectClassName =
  "h-9 rounded-md border px-2 text-sm";

export function OrgMembersSettings({
  organizationId,
  orgSlug,
  members,
  currentUserId,
  canManage,
}: OrgMembersSettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRoleChange(userId: string, orgRole: string) {
    startTransition(async () => {
      const result = await updateOrgMemberRole({
        organizationId,
        orgSlug,
        userId,
        orgRole: orgRole as "admin" | "member" | "viewer",
      });
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      showSuccessToast("Role updated");
      router.refresh();
    });
  }

  function handleRemove(userId: string) {
    startTransition(async () => {
      const result = await removeOrgMember({ organizationId, orgSlug, userId });
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      showSuccessToast("Member removed");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3" data-testid="org-members-settings">
      {members.map((member) => (
        <Card key={member.userId}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="space-y-1">
              <p className="font-medium">{member.displayName}</p>
              {member.userId === currentUserId ? (
                <Badge variant="outline">You</Badge>
              ) : null}
            </div>
            {canManage && member.userId !== currentUserId ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={selectClassName}
                  value={member.orgRole}
                  disabled={isPending}
                  onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                  aria-label={`Role for ${member.displayName}`}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => handleRemove(member.userId)}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <Badge variant="secondary" className="capitalize">
                {member.orgRole}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
