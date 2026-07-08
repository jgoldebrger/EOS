"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { challengeAndVerifyTotp } from "@/lib/auth/mfa-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MfaVerifyFormProps {
  title?: string;
  description?: string;
  submitLabel?: string;
  factorId?: string;
  onSuccess: () => void | Promise<void>;
  onCancel?: () => void;
}

export function MfaVerifyForm({
  title = "Authenticator verification",
  description = "Enter the 6-digit code from your authenticator app.",
  submitLabel = "Verify",
  factorId,
  onSuccess,
  onCancel,
}: MfaVerifyFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const result = await challengeAndVerifyTotp(supabase, code, factorId);

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    await onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="mfa-verify-form">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mfa-verify-code">Authentication code</Label>
        <Input
          id="mfa-verify-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          data-testid="mfa-verify-code-input"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting || code.length !== 6}>
          {isSubmitting ? "Verifying…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
