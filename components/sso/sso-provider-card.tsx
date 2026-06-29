"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SsoStatusBadge } from "@/components/sso/sso-status-badge";
import type { OrganizationSsoSettings, SsoProviderType } from "@/features/sso/types";

interface SsoProviderCardProps {
  settings: OrganizationSsoSettings | null;
  callbackUrl: string;
  canManage: boolean;
  onTestSso?: () => void;
}

const providerLabels: Record<SsoProviderType, string> = {
  oauth: "OAuth 2.0",
  saml: "SAML 2.0",
};

export function SsoProviderCard({
  settings,
  callbackUrl,
  canManage,
  onTestSso,
}: SsoProviderCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyCallbackUrl() {
    await navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Identity provider</CardTitle>
          <CardDescription>
            Configure your enterprise identity provider to enable single sign-on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No SSO provider is configured yet. Complete the setup steps below to connect
            your organization.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            {settings.provider_name}
            <SsoStatusBadge settings={settings} />
          </CardTitle>
          <CardDescription>
            {providerLabels[settings.provider_type]} · Domain: {settings.domain}
          </CardDescription>
        </div>
        <Badge variant="secondary" className="capitalize">
          {settings.provider_type}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="mb-2 text-sm font-medium">Callback URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">
              {callbackUrl}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyCallbackUrl}
              aria-label="Copy callback URL"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Add this URL to your identity provider&apos;s allowed redirect URIs.
          </p>
        </div>

        {canManage && onTestSso && (
          <Button type="button" variant="outline" onClick={onTestSso}>
            <ExternalLink className="mr-2 size-4" />
            Test SSO
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
