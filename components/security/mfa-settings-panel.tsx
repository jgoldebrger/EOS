"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, KeyRound, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  enrollTotpFactor,
  loadMfaStatus,
  unenrollTotpFactor,
  verifyNewTotpEnrollment,
  type MfaFactorSummary,
} from "@/lib/auth/mfa-client";
import { MfaVerifyForm } from "@/components/auth/mfa-verify-form";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrgRole } from "@/types/domain";

interface MfaSettingsPanelProps {
  orgSlug: string;
  orgRole: OrgRole;
  initialVerifiedFactor: MfaFactorSummary | null;
  initialNeedsStepUp: boolean;
}

interface EnrollmentState {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function MfaSettingsPanel({
  orgSlug,
  orgRole,
  initialVerifiedFactor,
  initialNeedsStepUp,
}: MfaSettingsPanelProps) {
  const router = useRouter();
  const [verifiedFactor, setVerifiedFactor] = useState<MfaFactorSummary | null>(
    initialVerifiedFactor,
  );
  const [needsStepUp, setNeedsStepUp] = useState(initialNeedsStepUp);
  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPrivileged = orgRole === "owner" || orgRole === "admin";

  const refreshStatus = useCallback(async () => {
    const supabase = createClient();
    const status = await loadMfaStatus(supabase);

    if ("error" in status) {
      showErrorToast("Could not load MFA status", status.error);
      return;
    }

    setVerifiedFactor(status.verifiedFactor);
    setNeedsStepUp(status.needsStepUp);
  }, []);

  function handleStartEnrollment() {
    startTransition(async () => {
      const supabase = createClient();
      const result = await enrollTotpFactor(supabase);

      if (!result.success) {
        showErrorToast("Could not start enrollment", result.error);
        return;
      }

      setEnrollment({
        factorId: result.factorId,
        qrCode: result.qrCode,
        secret: result.secret,
      });
      setEnrollCode("");
    });
  }

  function handleCancelEnrollment() {
    setEnrollment(null);
    setEnrollCode("");
  }

  function handleCompleteEnrollment() {
    if (!enrollment) {
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const result = await verifyNewTotpEnrollment(
        supabase,
        enrollment.factorId,
        enrollCode,
      );

      if (!result.success) {
        showErrorToast("Verification failed", result.error);
        return;
      }

      showSuccessToast("Authenticator enrolled", "Multi-factor authentication is now active.");
      setEnrollment(null);
      setEnrollCode("");
      await refreshStatus();
      router.refresh();
    });
  }

  async function handleRemoveFactor() {
    if (!verifiedFactor) {
      return;
    }

    const supabase = createClient();
    const result = await unenrollTotpFactor(supabase, verifiedFactor.id);

    if (!result.success) {
      showErrorToast("Could not remove authenticator", result.error);
      return;
    }

    showSuccessToast("Authenticator removed");
    setRemoveOpen(false);
    await refreshStatus();
    router.refresh();
  }

  async function copySecret() {
    if (!enrollment?.secret) {
      return;
    }

    try {
      await navigator.clipboard.writeText(enrollment.secret);
      showSuccessToast("Secret copied");
    } catch {
      showErrorToast("Could not copy secret");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8" data-testid="mfa-settings-panel">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={`/org/${orgSlug}/settings/security`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Security
          </Link>
        </Button>

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Multi-factor authentication</h1>
          <p className="text-muted-foreground">
            Protect your account with a time-based code from an authenticator app such as Google
            Authenticator, 1Password, or Microsoft Authenticator.
          </p>
        </div>
      </div>

      {isPrivileged && !verifiedFactor ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recommended for {orgRole}s</CardTitle>
            <CardDescription>
              Owners and admins who enroll MFA must verify with their authenticator before changing
              SSO settings, inviting members, or creating accounts.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {needsStepUp && verifiedFactor ? (
        <Card data-testid="mfa-step-up-card">
          <CardHeader>
            <CardTitle className="text-lg">Verify your session</CardTitle>
            <CardDescription>
              Your authenticator is enrolled, but this session has not been verified yet. Complete
              verification to unlock privileged admin actions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MfaVerifyForm
              factorId={verifiedFactor.id}
              onSuccess={async () => {
                showSuccessToast("Session verified");
                await refreshStatus();
                router.refresh();
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            Authenticator app
          </CardTitle>
          <CardDescription>
            {verifiedFactor
              ? "Your account requires a code from your authenticator when signing in."
              : "Add an extra layer of security beyond your password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {verifiedFactor && !enrollment ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Enabled</Badge>
                <span className="text-sm text-muted-foreground">
                  {verifiedFactor.friendlyName ?? "Authenticator app"}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setRemoveOpen(true)}
                disabled={needsStepUp}
                data-testid="mfa-remove-button"
              >
                Remove authenticator
              </Button>
            </div>
          ) : enrollment ? (
            <div className="space-y-6" data-testid="mfa-enrollment-flow">
              <div className="space-y-3">
                <p className="text-sm font-medium">1. Scan this QR code</p>
                <div
                  className="inline-block rounded-lg border bg-white p-4"
                  // Supabase returns a trusted SVG QR payload for TOTP enrollment.
                  dangerouslySetInnerHTML={{ __html: enrollment.qrCode }}
                  data-testid="mfa-qr-code"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Or enter this secret manually</p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 text-xs">{enrollment.secret}</code>
                  <Button type="button" variant="outline" size="sm" onClick={copySecret}>
                    Copy secret
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfa-enroll-code">2. Enter the 6-digit verification code</Label>
                <Input
                  id="mfa-enroll-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={enrollCode}
                  onChange={(event) =>
                    setEnrollCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  data-testid="mfa-enroll-code-input"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleCompleteEnrollment}
                  disabled={isPending || enrollCode.length !== 6}
                  data-testid="mfa-enroll-verify-button"
                >
                  {isPending ? "Verifying…" : "Enable MFA"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEnrollment}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <KeyRound className="h-4 w-4" />
                Not enrolled
              </div>
              <Button
                type="button"
                onClick={handleStartEnrollment}
                disabled={isPending}
                data-testid="mfa-enroll-start-button"
              >
                {isPending ? "Starting…" : "Set up authenticator"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove authenticator?"
        description="You will only need your password to sign in. Privileged admin actions will no longer require MFA step-up."
        confirmLabel="Remove"
        isLoading={isPending}
        onConfirm={handleRemoveFactor}
      />
    </div>
  );
}
