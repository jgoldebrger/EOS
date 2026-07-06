"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Target } from "lucide-react";
import { createSnapshot, toggleSectionVisibility } from "@/features/vto/actions";
import { downloadVtoPdf } from "@/features/vto/export-pdf";
import type { VtoSection, VtoSnapshot } from "@/features/vto/types";
import { VtoPageHeader } from "@/components/vto/vto-page-header";
import { VtoSectionEditor } from "@/components/vto/vto-section-editor";
import { VtoSnapshotHistory } from "@/components/vto/vto-snapshot-history";
import { VtoTractionPanel } from "@/components/vto/vto-traction-panel";
import type { VtoTractionData } from "@/features/vto/queries";
import { EmptyState } from "@/components/shared/empty-state";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VtoEditorProps {
  organizationId: string;
  orgSlug: string;
  canManage: boolean;
  sections: VtoSection[];
  snapshots: VtoSnapshot[];
  traction: VtoTractionData;
}

export function VtoEditor({
  organizationId,
  orgSlug,
  canManage,
  sections,
  snapshots,
  traction,
}: VtoEditorProps) {
  const [tab, setTab] = useState<"vision" | "traction" | "history">("vision");
  const [openSectionId, setOpenSectionId] = useState<string | null>(
    sections[0]?.id ?? null,
  );
  const [isSavingSnapshot, startSnapshot] = useTransition();

  function handleSaveSnapshot() {
    startSnapshot(async () => {
      const result = await createSnapshot({ organizationId });

      if (!result.success) {
        showErrorToast("Could not save snapshot", result.error);
        return;
      }

      showSuccessToast("Snapshot saved");
    });
  }

  async function handleVisibilityToggle(sectionId: string, visible: boolean) {
    const result = await toggleSectionVisibility({
      organizationId,
      sectionId,
      visible,
    });

    if (!result.success) {
      showErrorToast("Could not update visibility", result.error);
      return;
    }

    showSuccessToast(visible ? "Section is now visible" : "Section hidden");
  }

  return (
    <div className="space-y-8" data-testid="vto-editor">
      <VtoPageHeader
        canManage={canManage}
        onSaveSnapshot={handleSaveSnapshot}
        isSavingSnapshot={isSavingSnapshot}
        onExportPdf={() =>
          downloadVtoPdf({
            orgName: orgSlug,
            sections,
            traction,
          })
        }
      />

      <div className="flex gap-1 rounded-lg border p-1 w-fit">
        {(["vision", "traction", "history"] as const).map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={tab === key ? "secondary" : "ghost"}
            onClick={() => setTab(key)}
            data-testid={`vto-tab-${key}`}
          >
            {key === "vision" ? "Vision" : key === "traction" ? "Traction" : "History"}
          </Button>
        ))}
      </div>

      {sections.length === 0 ? (
        <EmptyState
          title="V/TO not initialized"
          description={
            canManage
              ? "Default sections will be created when an admin visits this page."
              : "An admin has not set up the Vision/Traction Organizer yet."
          }
          icon={<Target className="h-6 w-6" />}
        />
      ) : tab === "traction" ? (
        <VtoTractionPanel
          organizationId={organizationId}
          canManage={canManage}
          traction={traction}
        />
      ) : tab === "history" ? (
        <VtoSnapshotHistory
          organizationId={organizationId}
          snapshots={snapshots}
          canManage={canManage}
        />
      ) : (
        <div className="space-y-3" role="region" aria-label="V/TO sections">
          {sections.map((section) => {
            const isOpen = openSectionId === section.id;

            return (
              <div
                key={section.id}
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                  onClick={() => setOpenSectionId(isOpen ? null : section.id)}
                  aria-expanded={isOpen}
                  data-testid={`vto-accordion-${section.section_key}`}
                >
                  <span className="font-medium">{section.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen ? (
                  <div className="border-t px-5 py-5">
                    <VtoSectionEditor
                      key={section.id}
                      organizationId={organizationId}
                      section={section}
                      canManage={canManage}
                      showHiddenBadge={canManage}
                      onVisibilityToggle={(visible) =>
                        handleVisibilityToggle(section.id, visible)
                      }
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
