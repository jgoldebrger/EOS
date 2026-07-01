"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { SopDocument } from "@/features/process/schema";
import { SopBuilder } from "@/components/process/sop-builder";
import { Button } from "@/components/ui/button";

interface SopEditorShellProps {
  pageId: string;
  organizationId: string;
  orgSlug: string;
  teamId: string | null;
  teamSlug?: string;
  initialTitle: string;
  initialDocument: SopDocument | null;
  readOnly: boolean;
  backHref: string;
}

export function SopEditorShell({
  pageId,
  organizationId,
  orgSlug,
  teamId,
  teamSlug,
  initialTitle,
  initialDocument,
  readOnly,
  backHref,
}: SopEditorShellProps) {
  return (
    <div
      className="flex h-[calc(100vh-4rem)] flex-col"
      data-testid="sop-editor-shell"
    >
      <div className="border-b bg-background px-4 py-2 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
      </div>
      <SopBuilder
        pageId={pageId}
        organizationId={organizationId}
        orgSlug={orgSlug}
        teamId={teamId}
        teamSlug={teamSlug}
        initialTitle={initialTitle}
        initialDocument={initialDocument}
        readOnly={readOnly}
      />
    </div>
  );
}
