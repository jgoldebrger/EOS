"use client";

import { useEffect, useState, useTransition } from "react";
import { History, Loader2, RotateCcw } from "lucide-react";
import {
  listProcessPageVersions,
  restoreProcessPageVersion,
} from "@/features/process/actions";
import type { SopDocument } from "@/features/process/schema";
import type { ProcessPageVersionListItem } from "@/features/process/types";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface SopVersionPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: string;
  organizationId: string;
  orgSlug: string;
  teamId: string | null;
  teamSlug?: string;
  readOnly: boolean;
  onRestored: (document: SopDocument) => void;
}

function formatVersionDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SopVersionPanel({
  open,
  onOpenChange,
  pageId,
  organizationId,
  orgSlug,
  teamId,
  teamSlug,
  readOnly,
  onRestored,
}: SopVersionPanelProps) {
  const [versions, setVersions] = useState<ProcessPageVersionListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    void listProcessPageVersions({
      processPageId: pageId,
      organizationId,
    }).then((result) => {
      if (cancelled) return;
      setIsLoading(false);
      if (!result.success) {
        setLoadError(result.error);
        setVersions([]);
        return;
      }
      setVersions(result.versions);
    });

    return () => {
      cancelled = true;
    };
  }, [open, organizationId, pageId]);

  function handleRestore(versionId: string) {
    if (readOnly) return;

    startTransition(async () => {
      const result = await restoreProcessPageVersion({
        versionId,
        pageId,
        organizationId,
        orgSlug,
        teamId,
        teamSlug,
      });

      if (!result.success) {
        showErrorToast("Could not restore version", result.error);
        return;
      }

      if (result.document) {
        onRestored(result.document);
      }

      showSuccessToast("Version restored");
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md" data-testid="sop-version-panel">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="size-5" />
            Version history
          </SheetTitle>
          <SheetDescription>
            Restore a previous auto-saved snapshot of this SOP.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading versions…
            </div>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved versions yet. Versions are created when you save changes.
            </p>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">v{version.version_number}</Badge>
                    <span className="text-sm font-medium">
                      {formatVersionDate(version.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {version.note ?? "Saved version"}
                  </p>
                </div>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleRestore(version.id)}
                  >
                    <RotateCcw className="mr-2 size-4" />
                    Restore
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
