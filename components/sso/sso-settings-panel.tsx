"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Shield, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SsoProviderCard } from "@/components/sso/sso-provider-card";
import { SsoEnforcementDialog } from "@/components/sso/sso-enforcement-dialog";
import { SsoRoleMappingTable } from "@/components/sso/sso-role-mapping-table";
import { SsoLoginOption } from "@/components/sso/sso-login-option";
import {
  addRoleMapping,
  addVerifiedDomain,
  confirmVerifiedDomain,
  removeRoleMapping,
  removeVerifiedDomain,
  updateSsoSettings,
} from "@/features/sso/actions";
import type {
  OrganizationSsoRoleMapping,
  OrganizationSsoSettings,
  OrganizationVerifiedDomain,
  SsoMappableRole,
  SsoProviderType,
} from "@/features/sso/types";
import type { OrgRole } from "@/types/domain";

interface SsoSettingsPanelProps {
  orgSlug: string;
  role: OrgRole;
  settings: OrganizationSsoSettings | null;
  roleMappings: OrganizationSsoRoleMapping[];
  verifiedDomains: OrganizationVerifiedDomain[];
  callbackUrl: string;
}

export function SsoSettingsPanel({
  orgSlug,
  role,
  settings,
  roleMappings,
  verifiedDomains,
  callbackUrl,
}: SsoSettingsPanelProps) {
  const isOwner = role === "owner";
  const canView = role === "owner" || role === "admin";
  const [isPending, startTransition] = useTransition();
  const [showEnforceDialog, setShowEnforceDialog] = useState(false);

  const [providerType, setProviderType] = useState<SsoProviderType>(
    settings?.provider_type ?? "oauth",
  );
  const [providerName, setProviderName] = useState(settings?.provider_name ?? "");
  const [domain, setDomain] = useState(settings?.domain ?? "");
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(settings?.auto_join_enabled ?? false);
  const [defaultOrgRole, setDefaultOrgRole] = useState<SsoMappableRole>(
    settings?.default_org_role ?? "member",
  );
  const [allowEmailPassword, setAllowEmailPassword] = useState(
    settings?.allow_email_password_login ?? true,
  );
  const [newDomain, setNewDomain] = useState("");

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access restricted</CardTitle>
          <CardDescription>
            SSO settings are visible to organization admins and owners only.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function saveSettings(overrides?: {
    enforced?: boolean;
    autoJoinEnabled?: boolean;
    allowEmailPasswordLogin?: boolean;
  }) {
    startTransition(async () => {
      const result = await updateSsoSettings({
        orgSlug,
        providerType,
        providerName,
        domain,
        autoJoinEnabled: overrides?.autoJoinEnabled ?? autoJoinEnabled,
        defaultOrgRole,
        allowEmailPasswordLogin:
          overrides?.allowEmailPasswordLogin ?? allowEmailPassword,
        enforced: overrides?.enforced ?? settings?.enforced,
      });

      if (result.success) {
        toast.success("SSO settings saved");
        setShowEnforceDialog(false);
      } else {
        toast.error(result.error ?? "Unable to save SSO settings");
      }
    });
  }

  function handleAddMapping(providerGroup: string, orgRole: SsoMappableRole) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await addRoleMapping({ orgSlug, providerGroup, orgRole });
        if (result.success) {
          toast.success("Role mapping added");
        } else {
          toast.error(result.error ?? "Unable to add role mapping");
        }
        resolve();
      });
    });
  }

  function handleRemoveMapping(mappingId: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await removeRoleMapping({ orgSlug, mappingId });
        if (result.success) {
          toast.success("Role mapping removed");
        } else {
          toast.error(result.error ?? "Unable to remove role mapping");
        }
        resolve();
      });
    });
  }

  function handleAddDomain(event: React.FormEvent) {
    event.preventDefault();
    if (!newDomain.trim()) return;

    startTransition(async () => {
      const result = await addVerifiedDomain({
        orgSlug,
        domain: newDomain,
      });

      if (result.success) {
        toast.success("Domain added — add the DNS TXT record, then confirm");
        setNewDomain("");
      } else {
        toast.error(result.error ?? "Unable to add domain");
      }
    });
  }

  function handleConfirmDomain(domainId: string) {
    startTransition(async () => {
      const result = await confirmVerifiedDomain({ orgSlug, domainId });
      if (result.success) {
        toast.success("Domain verified via DNS");
      } else {
        toast.error(result.error ?? "Unable to confirm domain");
      }
    });
  }

  function handleRemoveDomain(domainId: string) {
    startTransition(async () => {
      const result = await removeVerifiedDomain({ orgSlug, domainId });
      if (result.success) {
        toast.success("Domain removed");
      } else {
        toast.error(result.error ?? "Unable to remove domain");
      }
    });
  }

  function handleTestSso() {
    if (!settings) {
      toast.error("Configure SSO before testing");
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=/org/${orgSlug}/dashboard`;
    window.location.href = redirectTo;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/org/${orgSlug}/settings/security`} className="hover:text-foreground">
            Security
          </Link>
          <ChevronRight className="size-4" />
          <span className="text-foreground">SSO</span>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="size-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Single sign-on</h1>
            <p className="text-muted-foreground">
              Configure enterprise SSO, verified domains, and role mappings.
            </p>
          </div>
        </div>
        {!isOwner && (
          <Badge variant="secondary">View only — owner permissions required to edit</Badge>
        )}
      </div>

      <SsoProviderCard
        settings={settings}
        callbackUrl={callbackUrl}
        canManage={isOwner}
        onTestSso={handleTestSso}
      />

      <Card>
        <CardHeader>
          <CardTitle>Setup steps</CardTitle>
          <CardDescription>
            Follow these steps to connect your identity provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Register the callback URL with your identity provider.</li>
            <li>Enter your provider details and primary domain below.</li>
            <li>Verify ownership of email domains used for auto-join.</li>
            <li>Test SSO before enabling enforcement.</li>
          </ol>

          {isOwner ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="provider-type" className="text-sm font-medium">
                  Provider type
                </label>
                <select
                  id="provider-type"
                  value={providerType}
                  onChange={(event) =>
                    setProviderType(event.target.value as SsoProviderType)
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="oauth">OAuth 2.0</option>
                  <option value="saml">SAML 2.0</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="provider-name" className="text-sm font-medium">
                  Provider name
                </label>
                <Input
                  id="provider-name"
                  value={providerName}
                  onChange={(event) => setProviderName(event.target.value)}
                  placeholder="Okta, Azure AD, Google Workspace…"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="sso-domain" className="text-sm font-medium">
                  Primary domain
                </label>
                <Input
                  id="sso-domain"
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="company.com"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="default-role" className="text-sm font-medium">
                  Default role for auto-join
                </label>
                <select
                  id="default-role"
                  value={defaultOrgRole}
                  onChange={(event) =>
                    setDefaultOrgRole(event.target.value as SsoMappableRole)
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex flex-col justify-end gap-3 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoJoinEnabled}
                    onChange={(event) => setAutoJoinEnabled(event.target.checked)}
                  />
                  Enable auto-join for verified domain users
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allowEmailPassword}
                    onChange={(event) => setAllowEmailPassword(event.target.checked)}
                  />
                  Allow email and password login when SSO is configured
                </label>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Contact an organization owner to configure SSO settings.
            </p>
          )}

          {isOwner && (
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => saveSettings()} disabled={isPending}>
                {isPending ? "Saving…" : "Save settings"}
              </Button>
              {settings && !settings.enforced && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowEnforceDialog(true)}
                  disabled={isPending}
                >
                  Enforce SSO
                </Button>
              )}
              {settings?.enforced && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => saveSettings({ enforced: false })}
                  disabled={isPending}
                >
                  Disable enforcement
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verified domains</CardTitle>
          <CardDescription>
            Auto-join requires a DNS-verified domain. Add a TXT record, then confirm
            verification before enabling auto-join.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verifiedDomains.length === 0 ? (
            <p className="text-sm text-muted-foreground">No verified domains yet.</p>
          ) : (
            <ul className="space-y-2">
              {verifiedDomains.map((item) => {
                const isVerified = Boolean(item.verified_at);
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm">{item.domain}</p>
                        <Badge variant={isVerified ? "default" : "secondary"}>
                          {isVerified ? "Verified" : "Pending DNS"}
                        </Badge>
                      </div>
                      {isVerified ? (
                        <p className="text-xs text-muted-foreground">
                          Verified via {item.verification_method}
                        </p>
                      ) : item.verification_token ? (
                        <p className="break-all text-xs text-muted-foreground">
                          Add TXT record:{" "}
                          <span className="font-mono">{item.verification_token}</span>
                        </p>
                      ) : null}
                    </div>
                    {isOwner && (
                      <div className="flex shrink-0 gap-2">
                        {!isVerified ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfirmDomain(item.id)}
                            disabled={isPending}
                          >
                            Confirm DNS
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDomain(item.id)}
                          disabled={isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {isOwner && (
            <form onSubmit={handleAddDomain} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1 space-y-1">
                <label htmlFor="verify-domain" className="text-sm font-medium">
                  Domain
                </label>
                <Input
                  id="verify-domain"
                  value={newDomain}
                  onChange={(event) => setNewDomain(event.target.value)}
                  placeholder="company.com"
                />
              </div>
              <Button type="submit" disabled={isPending || !newDomain.trim()}>
                Add domain
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <SsoRoleMappingTable
        mappings={roleMappings}
        canManage={isOwner}
        onAdd={handleAddMapping}
        onRemove={handleRemoveMapping}
      />

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Test SSO discovery</CardTitle>
          <CardDescription>
            Preview the pre-login SSO discovery flow used on the sign-in page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SsoLoginOption />
        </CardContent>
      </Card>

      <SsoEnforcementDialog
        open={showEnforceDialog}
        onOpenChange={setShowEnforceDialog}
        onConfirm={() => saveSettings({ enforced: true })}
        isSubmitting={isPending}
      />
    </div>
  );
}
