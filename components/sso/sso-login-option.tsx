"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatSsoError } from "@/features/sso/utils";

interface SsoLoginOptionProps {
  discoverUrl?: string;
}

export function SsoLoginOption({
  discoverUrl = "/functions/v1/discover-sso-provider",
}: SsoLoginOptionProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  async function discoverProvider(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setProviderName(null);
    setIsDiscovering(true);

    try {
      const response = await fetch(discoverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as {
        providerName?: string;
        error?: string;
      };

      if (!response.ok || !payload.providerName) {
        setError(formatSsoError(payload.error ?? "not_found"));
        return;
      }

      setProviderName(payload.providerName);
    } catch {
      setError(formatSsoError("configuration_error"));
    } finally {
      setIsDiscovering(false);
    }
  }

  return (
    <div data-testid="sso-login-option" className="space-y-3">
      <form onSubmit={discoverProvider} className="space-y-3">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          aria-label="Work email for SSO"
          autoComplete="email"
        />
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={isDiscovering || !email.trim()}
        >
          {isDiscovering ? "Looking up SSO…" : "Continue with SSO"}
        </Button>
      </form>

      {error && (
        <p className="text-sm text-destructive" role="alert" data-testid="sso-error">
          {error}
        </p>
      )}

      {providerName && (
        <p className="text-sm text-muted-foreground" data-testid="sso-provider-found">
          Sign in with {providerName}
        </p>
      )}
    </div>
  );
}
