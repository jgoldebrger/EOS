import { jsPDF } from "jspdf";
import type { VtoSection } from "@/features/vto/types";
import type { VtoTractionData } from "@/features/vto/queries";

function safeFilename(title: string) {
  return title.replace(/[^a-z0-9]/gi, "_") || "vto";
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function addWrappedText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = pdf.splitTextToSize(text, maxWidth) as string[];
  for (const line of lines) {
    if (y > 280) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

export function downloadVtoPdf(input: {
  orgName: string;
  sections: VtoSection[];
  traction: VtoTractionData;
}): void {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const maxWidth = 210 - margin * 2;
  let y = 20;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Vision / Traction Organizer", margin, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  y = addWrappedText(pdf, input.orgName, margin, y, maxWidth, 6);
  y += 6;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Vision", margin, y);
  y += 8;

  for (const section of input.sections.filter((row) => row.visible)) {
    if (y > 260) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    y = addWrappedText(pdf, section.title, margin, y, maxWidth, 6);
    y += 2;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const body = stripHtml(section.content ?? "");
    y = addWrappedText(
      pdf,
      body || "—",
      margin,
      y,
      maxWidth,
      5,
    );
    y += 6;
  }

  if (y > 250) {
    pdf.addPage();
    y = 20;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Traction", margin, y);
  y += 8;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  y = addWrappedText(pdf, "Quarterly company rocks", margin, y, maxWidth, 6);
  y += 2;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  for (const rock of input.traction.companyRocks) {
    y = addWrappedText(
      pdf,
      `• ${rock.title} (${rock.quarter}, ${rock.status})`,
      margin,
      y,
      maxWidth,
      5,
    );
  }
  if (input.traction.companyRocks.length === 0) {
    y = addWrappedText(pdf, "No company rocks this quarter.", margin, y, maxWidth, 5);
  }
  y += 4;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  y = addWrappedText(pdf, "Open company issues", margin, y, maxWidth, 6);
  y += 2;
  pdf.setFont("helvetica", "normal");
  for (const issue of input.traction.openIssues) {
    y = addWrappedText(pdf, `• ${issue.title} (${issue.status})`, margin, y, maxWidth, 5);
  }
  if (input.traction.openIssues.length === 0) {
    y = addWrappedText(pdf, "No open company-level issues.", margin, y, maxWidth, 5);
  }
  y += 4;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  y = addWrappedText(pdf, "1-year plan measurables", margin, y, maxWidth, 6);
  y += 2;
  pdf.setFont("helvetica", "normal");
  for (const metric of input.traction.metrics) {
    y = addWrappedText(
      pdf,
      `• ${metric.name}${metric.goal ? ` — ${metric.goal}` : ""}`,
      margin,
      y,
      maxWidth,
      5,
    );
  }
  if (input.traction.metrics.length === 0) {
    y = addWrappedText(pdf, "No org-level scorecard metrics.", margin, y, maxWidth, 5);
  }

  pdf.save(`${safeFilename(input.orgName)}_VTO.pdf`);
}
