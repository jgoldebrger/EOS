"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Clock,
  File,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType,
  Loader2,
  Printer,
} from "lucide-react";
import { showErrorToast } from "@/components/feedback/toast";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  downloadSopCsv,
  downloadSopDocx,
  downloadSopJson,
  downloadSopMarkdown,
  downloadSopPdf,
  printSopDocument,
  totalSopMinutes,
} from "@/features/process/export";
import type { ProcessPageDetail } from "@/features/process/types";
import { TagBadges } from "@/components/scorecard/tag-picker";

interface ProcessPageViewerProps {
  page: ProcessPageDetail;
  backHref: string;
  editHref?: string;
}

export function ProcessPageViewer({
  page,
  backHref,
  editHref,
}: ProcessPageViewerProps) {
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const sop = page.sop_document;
  const isSop = page.content_format === "sop" && sop;
  const totalMinutes = sop ? totalSopMinutes(sop) : 0;

  async function runExport(
    kind: "pdf" | "docx",
    exporter: (doc: NonNullable<typeof sop>) => Promise<void>,
  ) {
    if (!sop) return;
    setExporting(kind);
    try {
      await exporter(sop);
    } catch {
      showErrorToast(
        kind === "pdf" ? "Could not export PDF" : "Could not export Word document",
        "Please try again.",
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8 print:p-0">
      <PageHeader
        title={page.title}
        description={
          page.team_id ? "Team standard operating procedure" : "Organization SOP"
        }
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" asChild>
              <Link href={backHref}>Back</Link>
            </Button>
            {editHref ? (
              <Button asChild>
                <Link href={editHref}>Edit</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {isSop ? (
        <>
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Department</dt>
                  <dd className="font-medium">{sop.department || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Priority</dt>
                  <dd>
                    <Badge variant="outline">{sop.priority || "Medium"}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total time</dt>
                  <dd className="flex items-center gap-1.5 font-medium">
                    <Clock className="size-4 text-muted-foreground" aria-hidden />
                    {totalMinutes > 0 ? `${totalMinutes} min` : "—"}
                  </dd>
                </div>
              </dl>
              {page.category ? (
                <div className="text-sm">
                  <span className="text-muted-foreground">Category: </span>
                  <Badge variant="secondary">{page.category}</Badge>
                </div>
              ) : null}
              {page.tags.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Tags:</span>
                  <TagBadges tags={page.tags} />
                </div>
              ) : null}
              {page.archived_at ? (
                <Badge variant="secondary" className="text-muted-foreground">
                  Archived
                </Badge>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              disabled={exporting !== null}
              onClick={() => void runExport("pdf", downloadSopPdf)}
            >
              {exporting === "pdf" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <File className="mr-2 size-4" />
              )}
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting !== null}
              onClick={() => void runExport("docx", downloadSopDocx)}
            >
              {exporting === "docx" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <FileType className="mr-2 size-4" />
              )}
              Word
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadSopMarkdown(sop)}
            >
              <FileText className="mr-2 size-4" />
              Markdown
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadSopCsv(sop)}>
              <FileSpreadsheet className="mr-2 size-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadSopJson(sop)}>
              <FileJson className="mr-2 size-4" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => printSopDocument()}>
              <Printer className="mr-2 size-4" />
              Print
            </Button>
          </div>

          {sop.steps.length > 0 ? (
            <Card className="print:border-0 print:shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">
                  Steps ({sop.steps.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {sop.steps.map((step, index) => (
                    <li
                      key={index}
                      className="flex gap-3 rounded-md border border-border/60 px-3 py-2 text-sm"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{step.title || "Untitled step"}</p>
                        {step.note ? (
                          <p className="mt-0.5 text-muted-foreground">{step.note}</p>
                        ) : null}
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {step.time ? <span>{step.time} min</span> : null}
                          {step.approver ? <span>Approver: {step.approver}</span> : null}
                          {step.approvalStatus &&
                          step.approvalStatus !== "pending" ? (
                            <span className="capitalize">{step.approvalStatus}</span>
                          ) : null}
                        </div>
                        {step.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={step.imageUrl}
                            alt=""
                            className="mt-2 max-h-48 rounded-md border object-contain"
                          />
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {page.tags.length > 0 ? <TagBadges tags={page.tags} /> : null}
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {page.content || "No content yet."}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
