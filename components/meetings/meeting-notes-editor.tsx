"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { saveMeetingNote } from "@/features/meetings/actions";
import { showErrorToast } from "@/components/feedback/toast";

interface MeetingNotesEditorProps {
  organizationId: string;
  meetingId: string;
  sectionKey: string;
  sectionLabel: string;
  initialContent: string;
  canEdit: boolean;
}

export function MeetingNotesEditor({
  organizationId,
  meetingId,
  sectionKey,
  sectionLabel,
  initialContent,
  canEdit,
}: MeetingNotesEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  function scheduleSave(nextContent: string) {
    if (!canEdit) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await saveMeetingNote({
          organizationId,
          meetingId,
          sectionKey,
          content: nextContent,
        });

        if (!result.success) {
          showErrorToast(result.error);
        }
      });
    }, 800);
  }

  function handleChange(value: string) {
    setContent(value);
    scheduleSave(value);
  }

  return (
    <div className="space-y-2" data-testid="meeting-notes-editor">
      <Label htmlFor={`notes-${sectionKey}`}>{sectionLabel} notes</Label>
      <textarea
        id={`notes-${sectionKey}`}
        className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        value={content}
        onChange={(event) => handleChange(event.target.value)}
        disabled={!canEdit || isPending}
        placeholder={canEdit ? "Capture notes for this section…" : "No notes yet."}
      />
      {isPending ? (
        <p className="text-xs text-muted-foreground">Saving…</p>
      ) : null}
    </div>
  );
}
