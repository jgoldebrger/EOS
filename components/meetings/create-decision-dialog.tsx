"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDecision } from "@/features/meetings/actions";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface CreateDecisionDialogProps {
  organizationId: string;
  meetingId: string;
  canEdit: boolean;
}

export function CreateDecisionDialog({
  organizationId,
  meetingId,
  canEdit,
}: CreateDecisionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!canEdit) {
    return null;
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createDecision({
        organizationId,
        meetingId,
        title: title.trim(),
        description: description.trim() || null,
      });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      showSuccessToast("Decision recorded");
      setTitle("");
      setDescription("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="add-decision-button">
          Add decision
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record decision</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="decision-title">Title</Label>
            <Input
              id="decision-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-testid="decision-title-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="decision-description">Description (optional)</Label>
            <textarea
              id="decision-description"
              className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={isPending || !title.trim()}
            data-testid="create-decision-submit"
          >
            {isPending ? "Saving…" : "Save decision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
