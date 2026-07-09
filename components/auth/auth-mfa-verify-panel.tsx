"use client";

import { useRouter } from "next/navigation";
import { MfaVerifyForm } from "@/components/auth/mfa-verify-form";

interface AuthMfaVerifyPanelProps {
  factorId?: string;
  redirectTo: string;
}

export function AuthMfaVerifyPanel({ factorId, redirectTo }: AuthMfaVerifyPanelProps) {
  const router = useRouter();

  return (
    <MfaVerifyForm
      factorId={factorId}
      onSuccess={() => {
        router.replace(redirectTo);
        router.refresh();
      }}
    />
  );
}
