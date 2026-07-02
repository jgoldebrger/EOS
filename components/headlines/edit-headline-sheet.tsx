"use client";

import { useState, useTransition } from "react";
import { Archive, Pencil } from "lucide-react";
import { archiveHeadline, updateHeadline } from "@/features/headlines/actions";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface HeadlineItem {
  id: string;
  title: string;
  body: string;
  headline_type: string;
  created_at: string;
}

interface EditHeadlineSheetProps {
  headline: HeadlineItem | null;
  organizationId: string;
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (headline: HeadlineItem) => void;
  onArchived: (headlineId: string) => void;
}

export function EditHeadlineSheet({
  headline,
  organizationId,
  canEdit,
  open,
  onOpenChange,
  onUpdated,
  onArchived,
}: EditHeadlineSheetProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<"customer" | "employee">("customer");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && headline) {
      setTitle(headline.title);
      setBody(headline.body);
      setType(headline.headline_type as "customer" | "employee");
    }
    onOpenChange(nextOpen);
  }

  function handleSave() {
    if (!headline || !title.trim()) return;

    startTransition(async () => {
      const result = await updateHeadline({
        organizationId,
        headlineId: headline.id,
        title: title.trim(),
        body: body.trim(),
        headlineType: type,
      });

      if (!result.success) {
        showErrorToast("Could not update headline", result.error);
        return;
      }

      showSuccessToast("Headline updated");
      onUpdated({
        ...headline,
        title: title.trim(),
        body: body.trim(),
        headline_type: type,
      });
      onOpenChange(false);
    });
  }

  function handleArchive() {
    if (!headline) return;

    startTransition(async () => {
      const result = await archiveHeadline({
        organizationId,
        headlineId: headline.id,
      });

      if (!result.success) {
        showErrorToast("Could not archive headline", result.error);
        return;
      }

      showSuccessToast("Headline archived");
      onArchived(headline.id);
      setArchiveOpen(false);
      onOpenChange(false);
    });
  }

  if (!headline) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit headline</SheetTitle>
            <SheetDescription>Update the title, body, or type.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-1">
              <label htmlFor="edit-headline-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="edit-headline-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEdit || isPending}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-headline-body" className="text-sm font-medium">
                Body
              </label>
              <textarea
                id="edit-headline-body"
                className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={!canEdit || isPending}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-headline-type" className="text-sm font-medium">
                Type
              </label>
              <select
                id="edit-headline-type"
                className="h-9 w-full rounded-md border px-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as "customer" | "employee")}
                disabled={!canEdit || isPending}
              >
                <option value="customer">Customer</option>
                <option value="employee">Employee</option>
              </select>
            </div>

            {canEdit ? (
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button type="button" onClick={handleSave} disabled={isPending}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setArchiveOpen(true)}
                  disabled={isPending}
                >
                  <Archive className="mr-2 h-4 w-4" aria-hidden />
                  Archive
                </Button>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this headline?"
        description="Archived headlines are hidden from the list."
        confirmLabel="Archive"
        isLoading={isPending}
        onConfirm={handleArchive}
      />
    </>
  );
}
