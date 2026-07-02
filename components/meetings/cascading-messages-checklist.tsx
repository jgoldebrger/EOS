"use client";

import { useState, useTransition } from "react";
import { saveCascadingMessages } from "@/features/meetings/actions";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CascadingMessageItem {
  label: string;
  completed: boolean;
}

interface CascadingMessagesChecklistProps {
  organizationId: string;
  meetingId: string;
  templates: string[];
  initialMessages?: CascadingMessageItem[];
  canEdit: boolean;
}

export function CascadingMessagesChecklist({
  organizationId,
  meetingId,
  templates,
  initialMessages,
  canEdit,
}: CascadingMessagesChecklistProps) {
  const [messages, setMessages] = useState<CascadingMessageItem[]>(
    initialMessages ??
      templates.map((label) => ({
        label,
        completed: false,
      })),
  );
  const [isPending, startTransition] = useTransition();

  function toggle(index: number) {
    setMessages((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, completed: !item.completed } : item,
      ),
    );
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveCascadingMessages({
        organizationId,
        meetingId,
        messages,
      });
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      showSuccessToast("Cascading messages saved");
    });
  }

  return (
    <Card data-testid="cascading-messages-checklist">
      <CardHeader>
        <CardTitle className="text-base">Cascading messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {messages.map((message, index) => (
            <li key={message.label} className="flex items-start gap-2 text-sm">
              <input
                id={`cascade-${index}`}
                type="checkbox"
                checked={message.completed}
                onChange={() => toggle(index)}
                disabled={!canEdit || isPending}
                className="mt-1"
              />
              <label htmlFor={`cascade-${index}`}>{message.label}</label>
            </li>
          ))}
        </ul>
        {canEdit ? (
          <Button type="button" size="sm" disabled={isPending} onClick={handleSave}>
            Save checklist
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
