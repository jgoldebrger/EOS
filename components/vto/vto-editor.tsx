"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Target } from "lucide-react";
import { createSnapshot, toggleSectionVisibility } from "@/features/vto/actions";
import type { VtoSection, VtoSnapshot } from "@/features/vto/types";
import { VtoPageHeader } from "@/components/vto/vto-page-header";
import { VtoSectionEditor } from "@/components/vto/vto-section-editor";
import { VtoSnapshotHistory } from "@/components/vto/vto-snapshot-history";
import { EmptyState } from "@/components/shared/empty-state";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { cn } from "@/lib/utils";

interface VtoEditorProps {
  organizationId: string;
  canManage: boolean;
  sections: VtoSection[];
  snapshots: VtoSnapshot[];
}

export function VtoEditor({
  organizationId,
  canManage,
  sections,
  snapshots,
}: VtoEditorProps) {
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
      />

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
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
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
                    onClick={() =>
                      setOpenSectionId(isOpen ? null : section.id)
                    }
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

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <VtoSnapshotHistory
              organizationId={organizationId}
              snapshots={snapshots}
              canManage={canManage}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
