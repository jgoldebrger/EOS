"use client";

import { useState } from "react";
import { updateSeguePrompts } from "@/features/meetings/actions";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SeguePromptsSettingsFormProps {
  organizationId: string;
  orgSlug: string;
  initialPrompts: string[];
  canEdit: boolean;
}

export function SeguePromptsSettingsForm({
  organizationId,
  orgSlug,
  initialPrompts,
  canEdit,
}: SeguePromptsSettingsFormProps) {
  const [prompts, setPrompts] = useState(initialPrompts.join("\n"));
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const lines = prompts
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      showErrorToast("Add at least one prompt");
      return;
    }

    setIsSaving(true);
    const result = await updateSeguePrompts({
      organizationId,
      orgSlug,
      prompts: lines,
    });
    setIsSaving(false);

    if (!result.success) {
      showErrorToast(result.error);
      return;
    }

    showSuccessToast("Segue prompts saved");
  }

  return (
    <div className="space-y-3" data-testid="segue-prompts-settings">
      <div className="space-y-2">
        <Label htmlFor="segue-prompts">Rotating segue questions (one per line)</Label>
        <textarea
          id="segue-prompts"
          className="min-h-[140px] w-full rounded-md border px-3 py-2 text-sm"
          value={prompts}
          onChange={(e) => setPrompts(e.target.value)}
          disabled={!canEdit || isSaving}
        />
      </div>
      {canEdit ? (
        <Button type="button" size="sm" disabled={isSaving} onClick={handleSave}>
          {isSaving ? "Saving…" : "Save prompts"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">Only admins can edit segue prompts.</p>
      )}
      <Input className="hidden" aria-hidden tabIndex={-1} />
    </div>
  );
}
