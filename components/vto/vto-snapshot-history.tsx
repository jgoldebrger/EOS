"use client";

import { useState, useTransition } from "react";
import { Eye, History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { restoreSnapshot } from "@/features/vto/actions";
import type { VtoSnapshot, VtoSnapshotSection } from "@/features/vto/types";
import { formatSnapshotDate } from "@/features/vto/utils";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface VtoSnapshotHistoryProps {
  organizationId: string;
  snapshots: VtoSnapshot[];
  canManage: boolean;
}

export function VtoSnapshotHistory({
  organizationId,
  snapshots,
  canManage,
}: VtoSnapshotHistoryProps) {
  const [viewingSnapshot, setViewingSnapshot] = useState<VtoSnapshot | null>(null);
  const [restoringSnapshot, setRestoringSnapshot] = useState<VtoSnapshot | null>(null);
  const [isRestoring, startRestore] = useTransition();

  function getSnapshotSections(snapshot: VtoSnapshot): VtoSnapshotSection[] {
    const data = snapshot.snapshot_data as unknown;
    if (!Array.isArray(data)) {
      return [];
    }
    return data as VtoSnapshotSection[];
  }

  function handleRestore() {
    if (!restoringSnapshot) return;

    startRestore(async () => {
      const result = await restoreSnapshot({
        organizationId,
        snapshotId: restoringSnapshot.id,
      });

      if (!result.success) {
        showErrorToast("Could not restore snapshot", result.error);
        return;
      }

      showSuccessToast("Snapshot restored");
      setRestoringSnapshot(null);
      setViewingSnapshot(null);
    });
  }

  return (
    <>
      <Card data-testid="vto-snapshot-history">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-muted-foreground" />
            Version history
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground" role="status">
              No snapshots yet. Save a snapshot to capture the current V/TO state.
            </p>
          ) : (
            <ul className="space-y-2">
              {snapshots.map((snapshot) => (
                <li
                  key={snapshot.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  data-testid={`vto-snapshot-${snapshot.id}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {formatSnapshotDate(snapshot.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getSnapshotSections(snapshot).length} sections
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingSnapshot(snapshot)}
                      data-testid={`view-snapshot-${snapshot.id}`}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </Button>
                    {canManage ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoringSnapshot(snapshot)}
                        data-testid={`restore-snapshot-${snapshot.id}`}
                      >
                        <RotateCcw className="mr-1 h-4 w-4" />
                        Restore
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={restoringSnapshot !== null}
        onOpenChange={(open) => {
          if (!open) setRestoringSnapshot(null);
        }}
        title="Restore this snapshot?"
        description="This will overwrite current section content with the selected snapshot. This action cannot be undone automatically."
        confirmLabel="Restore snapshot"
        isLoading={isRestoring}
        onConfirm={handleRestore}
      />

      {viewingSnapshot ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vto-snapshot-view-title"
          data-testid="vto-snapshot-viewer"
        >
          <Card className="max-h-[85vh] w-full max-w-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b">
              <div>
                <CardTitle id="vto-snapshot-view-title">
                  Snapshot — {formatSnapshotDate(viewingSnapshot.created_at)}
                </CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingSnapshot(null)}
              >
                Close
              </Button>
            </CardHeader>
            <CardContent className="max-h-[60vh] space-y-4 overflow-y-auto pt-6">
              {getSnapshotSections(viewingSnapshot).map((section) => (
                <div key={section.section_key} className="space-y-1">
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {section.content.trim() || "—"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
