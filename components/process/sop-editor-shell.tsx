"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { updateProcessPage } from "@/features/process/actions";
import type { SopDocument } from "@/features/process/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface SopEditorShellProps {
  pageId: string;
  organizationId: string;
  orgSlug: string;
  teamId: string | null;
  teamSlug?: string;
  initialTitle: string;
  initialDocument: SopDocument | null;
  readOnly: boolean;
  backHref: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function SopEditorShell({
  pageId,
  organizationId,
  orgSlug,
  teamId,
  teamSlug,
  initialTitle,
  initialDocument,
  readOnly,
  backHref,
}: SopEditorShellProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [iframeReady, setIframeReady] = useState(false);
  const [, startTransition] = useTransition();
  const pendingSaveRef = useRef<{
    document: SopDocument;
    markdown: string;
    title: string;
  } | null>(null);

  const sendLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !iframeReady) return;

    const documentPayload =
      initialDocument ??
      ({
        id: pageId,
        title: initialTitle,
        department: "General",
        priority: "Medium",
        steps: [],
      } satisfies SopDocument);

    iframe.contentWindow.postMessage(
      {
        type: "sop-designer:load",
        pageId,
        title: initialTitle,
        document: documentPayload,
        readOnly,
      },
      window.location.origin,
    );
  }, [iframeReady, initialDocument, initialTitle, pageId, readOnly]);

  useEffect(() => {
    sendLoad();
  }, [sendLoad]);

  const persistSave = useCallback(
    (payload: { document: SopDocument; markdown: string; title: string }) => {
      startTransition(async () => {
        setSaveState("saving");
        const result = await updateProcessPage({
          id: pageId,
          organizationId,
          orgSlug,
          teamId,
          teamSlug,
          title: payload.title,
          contentMarkdown: payload.markdown,
          sopDocument: payload.document,
        });

        if (!result.success) {
          setSaveState("error");
          showErrorToast("Could not save SOP", result.error);
          return;
        }

        setTitle(payload.title);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      });
    },
    [organizationId, orgSlug, pageId, teamId, teamSlug],
  );

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "sop-designer:ready") {
        setIframeReady(true);
      }

      if (data.type === "sop-designer:save" && !readOnly) {
        pendingSaveRef.current = {
          document: data.document as SopDocument,
          markdown: data.markdown as string,
          title: data.title as string,
        };
        persistSave(pendingSaveRef.current);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [persistSave, readOnly]);

  function handleManualSave() {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: "sop-designer:request-save" },
      window.location.origin,
    );
    showSuccessToast("Saving…");
  }

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "Auto-save on";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col" data-testid="sop-editor-shell">
      <div className="flex flex-wrap items-center gap-3 border-b bg-background px-4 py-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="max-w-md font-medium"
          readOnly
          aria-label="SOP title"
        />
        <span className="text-sm text-muted-foreground">{saveLabel}</span>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={handleManualSave}>
            Save now
          </Button>
        )}
        {!iframeReady && (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading editor…
          </span>
        )}
      </div>
      <iframe
        ref={iframeRef}
        src="/sop-designer/index.html?embed=1"
        title="SOP Designer"
        className="min-h-0 flex-1 w-full border-0"
        data-testid="sop-designer-iframe"
      />
    </div>
  );
}
