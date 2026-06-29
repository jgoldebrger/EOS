"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { OrganizationSsoRoleMapping, SsoMappableRole } from "@/features/sso/types";

interface SsoRoleMappingTableProps {
  mappings: OrganizationSsoRoleMapping[];
  canManage: boolean;
  onAdd: (providerGroup: string, orgRole: SsoMappableRole) => Promise<void>;
  onRemove: (mappingId: string) => Promise<void>;
}

export function SsoRoleMappingTable({
  mappings,
  canManage,
  onAdd,
  onRemove,
}: SsoRoleMappingTableProps) {
  const [providerGroup, setProviderGroup] = useState("");
  const [orgRole, setOrgRole] = useState<SsoMappableRole>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!providerGroup.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd(providerGroup.trim(), orgRole);
      setProviderGroup("");
      setOrgRole("member");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(mappingId: string) {
    setRemovingId(mappingId);
    try {
      await onRemove(mappingId);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role mappings</CardTitle>
        <CardDescription>
          Map identity provider groups to organization roles. Owner role cannot be
          assigned via SSO.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mappings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No role mappings configured. New SSO users receive the default organization
            role.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider group</TableHead>
                <TableHead>Organization role</TableHead>
                {canManage && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-mono text-sm">{mapping.provider_group}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {mapping.org_role}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(mapping.id)}
                        disabled={removingId === mapping.id}
                        aria-label={`Remove mapping for ${mapping.provider_group}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {canManage ? (
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 space-y-1">
              <label htmlFor="provider-group" className="text-sm font-medium">
                Provider group
              </label>
              <Input
                id="provider-group"
                value={providerGroup}
                onChange={(event) => setProviderGroup(event.target.value)}
                placeholder="Engineering-Admins"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="org-role" className="text-sm font-medium">
                Role
              </label>
              <select
                id="org-role"
                value={orgRole}
                onChange={(event) => setOrgRole(event.target.value as SsoMappableRole)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <Button type="submit" disabled={isSubmitting || !providerGroup.trim()}>
              Add mapping
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only organization owners can manage role mappings.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
