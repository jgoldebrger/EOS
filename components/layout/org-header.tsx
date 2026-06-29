"use client";

import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface OrgHeaderProps {
  orgName: string;
  orgSlug: string;
}

export function OrgHeader({ orgName, orgSlug }: OrgHeaderProps) {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight">{orgName}</span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs text-muted-foreground">/{orgSlug}</span>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
