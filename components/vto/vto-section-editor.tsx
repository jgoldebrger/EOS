"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateSection } from "@/features/vto/actions";
import type { VtoSection } from "@/features/vto/types";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface VtoSectionEditorProps {
  organizationId: string;
  section: VtoSection;
  canManage: boolean;
  showHiddenBadge?: boolean;
  onVisibilityToggle?: (visible: boolean) => void;
}

export function VtoSectionEditor({
  organizationId,
  section,
  canManage,
  showHiddenBadge = false,
  onVisibilityToggle,
}: VtoSectionEditorProps) {
  const [content, setContent] = useState(section.content);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateSection({
        organizationId,
        sectionId: section.id,
        content,
      });

      if (!result.success) {
        showErrorToast("Could not save section", result.error);
        return;
      }

      setIsDirty(false);
      showSuccessToast("Section saved");
    });
  }

  return (
    <div className="space-y-3" data-testid={`vto-section-${section.section_key}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`vto-content-${section.id}`} className="text-base font-medium">
            {section.title}
          </Label>
          {showHiddenBadge && !section.visible ? (
            <Badge variant="secondary">Hidden</Badge>
          ) : null}
        </div>
        {canManage && onVisibilityToggle ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onVisibilityToggle(!section.visible)}
            data-testid={`toggle-visibility-${section.section_key}`}
          >
            {section.visible ? "Hide section" : "Show section"}
          </Button>
        ) : null}
      </div>
      <textarea
        id={`vto-content-${section.id}`}
        className="min-h-[180px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm leading-relaxed shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
          setIsDirty(true);
        }}
        disabled={!canManage || isPending}
        placeholder={
          canManage
            ? `Document your ${section.title.toLowerCase()}…`
            : "No content yet."
        }
      />
      {canManage ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Markdown-friendly plain text. Use line breaks for structure.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isPending}
            data-testid={`save-section-${section.section_key}`}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : isDirty ? (
              "Save section"
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Saved
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
