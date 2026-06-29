import { PageHeader } from "@/components/shared/page-header";

interface VtoPageHeaderProps {
  canManage: boolean;
  onSaveSnapshot?: () => void;
  isSavingSnapshot?: boolean;
}

export function VtoPageHeader({
  canManage,
  onSaveSnapshot,
  isSavingSnapshot = false,
}: VtoPageHeaderProps) {
  return (
    <PageHeader
      title="Vision / Traction Organizer"
      description="Capture your company's vision, traction, and long-range plan in one living document. Leadership edits sections and saves version snapshots over time."
      actions={
        canManage && onSaveSnapshot ? (
          <button
            type="button"
            data-testid="save-vto-snapshot"
            onClick={onSaveSnapshot}
            disabled={isSavingSnapshot}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isSavingSnapshot ? "Saving…" : "Save snapshot"}
          </button>
        ) : undefined
      }
    />
  );
}
