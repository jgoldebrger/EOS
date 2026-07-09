"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateOrgSecuritySettings } from "@/features/organizations/security-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface OrgMfaPolicyPanelProps {
  organizationId: string;
  orgSlug: string;
  initialMfaRequired: boolean;
  canManage: boolean;
}

export function OrgMfaPolicyPanel({
  organizationId,
  orgSlug,
  initialMfaRequired,
  canManage,
}: OrgMfaPolicyPanelProps) {
  const [mfaRequired, setMfaRequired] = useState(initialMfaRequired);
  const [isPending, startTransition] = useTransition();

  function onSave() {
    startTransition(async () => {
      const result = await updateOrgSecuritySettings({
        organizationId,
        orgSlug,
        mfaRequired,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Security policy updated");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization MFA policy</CardTitle>
        <CardDescription>
          Require every member to enroll an authenticator app before accessing this
          organization. Owners and admins are always required to use MFA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={mfaRequired}
            disabled={!canManage || isPending}
            onChange={(event) => setMfaRequired(event.target.checked)}
            data-testid="org-mfa-policy-toggle"
          />
          <Label className="font-normal">Require MFA for all members</Label>
        </label>
        {canManage ? (
          <Button onClick={onSave} disabled={isPending} data-testid="org-mfa-policy-save">
            {isPending ? "Saving..." : "Save policy"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only organization admins can change this policy.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
