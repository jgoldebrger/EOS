"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  History,
  LayoutTemplate,
  Loader2,
  Plus,
  Printer,
} from "lucide-react";
import { updateProcessPage } from "@/features/process/actions";
import {
  downloadJson,
  downloadSopCsv,
  downloadSopDocx,
  downloadSopMarkdown,
  downloadSopPdf,
  printSop,
  sopToMarkdown,
} from "@/features/process/export";
import {
  createEmptyStep,
  deleteStepAt,
  duplicateStep,
  moveStep,
} from "@/features/process/sop-steps";
import type { SopDocument } from "@/features/process/schema";
import {
  applyTemplate,
  SOP_DEPARTMENTS,
  SOP_PRIORITIES,
  SOP_TEMPLATES,
} from "@/features/process/templates";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import {
  estimateSopDocumentBytes,
  resolveSopDocumentImages,
} from "@/features/process/sop-image";
import { SopStepCard } from "@/components/process/sop-step-card";
import { SopVersionPanel } from "@/components/process/sop-version-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SopBuilderProps {
  pageId: string;
  organizationId: string;
  orgSlug: string;
  teamId: string | null;
  teamSlug?: string;
  initialTitle: string;
  initialDocument: SopDocument | null;
  readOnly: boolean;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const AUTO_SAVE_DELAY_MS = 2500;
const MAX_SAVE_BYTES = 900_000;

const selectClassName =
  "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function buildInitialDocument(
  pageId: string,
  title: string,
  initialDocument: SopDocument | null,
): SopDocument {
  return (
    initialDocument ?? {
      id: pageId,
      title,
      department: "General",
      priority: "Medium",
      steps: [],
      lastModified: new Date().toISOString(),
    }
  );
}

export function SopBuilder({
  pageId,
  organizationId,
  orgSlug,
  teamId,
  teamSlug,
  initialTitle,
  initialDocument,
  readOnly,
}: SopBuilderProps) {
  const [document, setDocument] = useState<SopDocument>(() =>
    buildInitialDocument(pageId, initialTitle, initialDocument),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const documentRef = useRef(document);
  const isSavingRef = useRef(false);
  const queuedSaveRef = useRef<SopDocument | null>(null);
  const lastSavedSnapshotRef = useRef(
    JSON.stringify(buildInitialDocument(pageId, initialTitle, initialDocument)),
  );
  const persistSaveRef = useRef<
    (doc: SopDocument, options?: { showToast?: boolean }) => Promise<void>
  >(async () => {});

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const persistSave = useCallback(
    async (doc: SopDocument, options?: { showToast?: boolean }) => {
      if (readOnly) return;

      if (isSavingRef.current) {
        queuedSaveRef.current = doc;
        return;
      }

      const snapshot = JSON.stringify(doc);
      if (snapshot === lastSavedSnapshotRef.current && !options?.showToast) {
        setIsDirty(false);
        return;
      }

      isSavingRef.current = true;
      setSaveState("saving");

      let payloadDoc = doc;
      try {
        payloadDoc = await resolveSopDocumentImages(doc, organizationId, pageId);
        if (payloadDoc !== doc) {
          setDocument(payloadDoc);
        }
      } catch (error) {
        isSavingRef.current = false;
        setSaveState("error");
        showErrorToast(
          "Could not upload step images",
          error instanceof Error ? error.message : "Image upload failed",
        );
        return;
      }

      const payloadBytes = estimateSopDocumentBytes(payloadDoc);
      if (payloadBytes > MAX_SAVE_BYTES) {
        isSavingRef.current = false;
        setSaveState("error");
        showErrorToast(
          "SOP is too large to save",
          "Remove large embedded images or shorten step content, then try Save now.",
        );
        return;
      }

      const markdown = sopToMarkdown(payloadDoc);
      const payload = {
        ...payloadDoc,
        lastModified: new Date().toISOString(),
      };

      let result: Awaited<ReturnType<typeof updateProcessPage>>;
      try {
        result = await updateProcessPage({
          id: pageId,
          organizationId,
          orgSlug,
          teamId,
          teamSlug,
          title: payload.title,
          contentMarkdown: markdown,
          sopDocument: payload,
        });
      } catch (error) {
        isSavingRef.current = false;
        setSaveState("error");
        showErrorToast(
          "Could not save SOP",
          error instanceof Error
            ? error.message
            : "The server rejected this save (it may be too large).",
        );
        return;
      }

      isSavingRef.current = false;

      if (!result.success) {
        setSaveState("error");
        showErrorToast("Could not save SOP", result.error);
        return;
      }

      lastSavedSnapshotRef.current = JSON.stringify(payloadDoc);

      const queued = queuedSaveRef.current;
      queuedSaveRef.current = null;
      const latest = documentRef.current;
      const latestSnapshot = JSON.stringify(latest);

      if (queued && JSON.stringify(queued) !== JSON.stringify(payloadDoc)) {
        setIsDirty(true);
        setSaveState("idle");
        void persistSaveRef.current(queued);
        return;
      }

      if (latestSnapshot !== JSON.stringify(payloadDoc)) {
        setIsDirty(true);
        setSaveState("idle");
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
          void persistSaveRef.current(latest);
        }, AUTO_SAVE_DELAY_MS);
        return;
      }

      setIsDirty(false);
      setSaveState("saved");
      if (options?.showToast) {
        showSuccessToast("SOP saved");
      }
      setTimeout(() => setSaveState("idle"), 2000);
    },
    [organizationId, orgSlug, pageId, readOnly, teamId, teamSlug],
  );

  useEffect(() => {
    persistSaveRef.current = persistSave;
  });

  const scheduleSave = useCallback(
    (doc: SopDocument) => {
      if (readOnly) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void persistSave(doc);
      }, AUTO_SAVE_DELAY_MS);
    },
    [persistSave, readOnly],
  );

  function updateDocument(updater: (current: SopDocument) => SopDocument) {
    setDocument((current) => {
      const next = updater(current);
      setIsDirty(true);
      scheduleSave(next);
      return next;
    });
  }

  function handleManualSave() {
    if (readOnly) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    void persistSave(documentRef.current, { showToast: true });
  }

  function handleApplyTemplate(templateId: string) {
    const template = SOP_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    updateDocument((current) => {
      const applied = applyTemplate(template, pageId);
      return {
        ...applied,
        title: current.title.trim() ? current.title : applied.title,
      };
    });
    setTemplateOpen(false);
    showSuccessToast(`Applied “${template.name}” template`);
  }

  function handleExportMarkdown() {
    downloadSopMarkdown(document);
  }

  function handleExportCsv() {
    downloadSopCsv(document);
  }

  function handleExportJson() {
    downloadJson(document);
  }

  async function handleExportPdf() {
    setExporting("pdf");
    try {
      await downloadSopPdf(document);
    } catch {
      showErrorToast("Could not export PDF", "Please try again.");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportDocx() {
    setExporting("docx");
    try {
      await downloadSopDocx(document);
    } catch {
      showErrorToast("Could not export Word document", "Please try again.");
    } finally {
      setExporting(null);
    }
  }

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : isDirty
            ? "Unsaved changes"
            : readOnly
              ? "View only"
              : "Up to date";

  const saveBadgeVariant =
    saveState === "error"
      ? "destructive"
      : saveState === "saved"
        ? "default"
        : "secondary";

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      data-testid="sop-builder"
    >
      <div className="sop-builder-toolbar flex flex-wrap items-end gap-3 border-b bg-background px-4 py-3 print:hidden">
        <div className="min-w-[200px] flex-1 space-y-2">
          <Label htmlFor="sop-title">Title</Label>
          <Input
            id="sop-title"
            value={document.title}
            onChange={(event) =>
              updateDocument((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            readOnly={readOnly}
            className="font-medium"
            aria-label="SOP title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sop-department">Department</Label>
          <select
            id="sop-department"
            className={selectClassName}
            value={document.department}
            onChange={(event) =>
              updateDocument((current) => ({
                ...current,
                department: event.target.value,
              }))
            }
            disabled={readOnly}
          >
            {SOP_DEPARTMENTS.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sop-priority">Priority</Label>
          <select
            id="sop-priority"
            className={selectClassName}
            value={document.priority}
            onChange={(event) =>
              updateDocument((current) => ({
                ...current,
                priority: event.target.value,
              }))
            }
            disabled={readOnly}
          >
            {SOP_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          <Badge variant={saveBadgeVariant}>{saveLabel}</Badge>
          {saveState === "saving" ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : null}

          {!readOnly ? (
            <Button type="button" size="sm" variant="outline" onClick={handleManualSave}>
              Save now
            </Button>
          ) : null}

          {!readOnly ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setTemplateOpen(true)}
            >
              <LayoutTemplate className="mr-2 size-4" />
              Templates
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline">
                <Download className="mr-2 size-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={exporting !== null}
                onClick={() => void handleExportPdf()}
              >
                PDF (.pdf)
                {exporting === "pdf" ? (
                  <Loader2 className="ml-auto size-4 animate-spin" />
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={exporting !== null}
                onClick={() => void handleExportDocx()}
              >
                Word (.docx)
                {exporting === "docx" ? (
                  <Loader2 className="ml-auto size-4 animate-spin" />
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportMarkdown}>
                Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>CSV (.csv)</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJson}>JSON (.json)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => printSop()}>
                <Printer className="mr-2 size-4" />
                Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setVersionPanelOpen(true)}
          >
            <History className="mr-2 size-4" />
            History
          </Button>
        </div>
      </div>

      <div className="sop-builder-print-header hidden border-b px-8 py-6 print:block">
        <h1 className="text-2xl font-semibold tracking-tight">{document.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Department: {document.department} · Priority: {document.priority}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 print:overflow-visible">
        <div className="mx-auto max-w-4xl space-y-4">
          {document.steps.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {readOnly
                  ? "This SOP has no steps yet."
                  : "Add your first step or start from a template."}
              </p>
            </div>
          ) : (
            document.steps.map((step, index) => (
              <SopStepCard
                key={index}
                step={step}
                index={index}
                totalSteps={document.steps.length}
                allSteps={document.steps}
                organizationId={organizationId}
                pageId={pageId}
                readOnly={readOnly}
                onChange={(nextStep) =>
                  updateDocument((current) => ({
                    ...current,
                    steps: current.steps.map((item, stepIndex) =>
                      stepIndex === index ? nextStep : item,
                    ),
                  }))
                }
                onMoveUp={() =>
                  updateDocument((current) => ({
                    ...current,
                    steps: moveStep(current.steps, index, "up"),
                  }))
                }
                onMoveDown={() =>
                  updateDocument((current) => ({
                    ...current,
                    steps: moveStep(current.steps, index, "down"),
                  }))
                }
                onDuplicate={() =>
                  updateDocument((current) => ({
                    ...current,
                    steps: [
                      ...current.steps.slice(0, index + 1),
                      duplicateStep(step),
                      ...current.steps.slice(index + 1),
                    ],
                  }))
                }
                onDelete={() =>
                  updateDocument((current) => ({
                    ...current,
                    steps: deleteStepAt(current.steps, index),
                  }))
                }
              />
            ))
          )}

          {!readOnly ? (
            <Button
              type="button"
              variant="outline"
              className="w-full print:hidden"
              onClick={() =>
                updateDocument((current) => ({
                  ...current,
                  steps: [...current.steps, createEmptyStep()],
                }))
              }
            >
              <Plus className="mr-2 size-4" />
              Add step
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-2xl" data-testid="sop-template-dialog">
          <DialogHeader>
            <DialogTitle>Choose a template</DialogTitle>
            <DialogDescription>
              Start from a pre-built SOP or replace the current steps with a template.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {SOP_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className="rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                onClick={() => handleApplyTemplate(template.id)}
              >
                <div className="text-2xl">{template.icon}</div>
                <div className="mt-2 font-semibold">{template.name}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {template.description}
                </p>
                <p className="mt-2 text-xs font-medium text-primary">
                  {template.steps.length} steps
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <SopVersionPanel
        open={versionPanelOpen}
        onOpenChange={setVersionPanelOpen}
        pageId={pageId}
        organizationId={organizationId}
        orgSlug={orgSlug}
        teamId={teamId}
        teamSlug={teamSlug}
        readOnly={readOnly}
        onRestored={(restored) => {
          setDocument(restored);
          lastSavedSnapshotRef.current = JSON.stringify(restored);
          setIsDirty(false);
          setSaveState("saved");
        }}
      />
    </div>
  );
}
