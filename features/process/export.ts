import type { SopDocument } from "@/features/process/schema";

export function sopToMarkdown(doc: SopDocument): string {
  let md = `# ${doc.title}\n\n`;
  md += `**Department:** ${doc.department} | **Priority:** ${doc.priority}\n\n---\n\n`;

  doc.steps.forEach((step, index) => {
    const num = index + 1;
    md += `## ${num}. ${step.title || "Untitled"}`;
    if (step.time) md += ` (${step.time} min)`;
    md += "\n\n";
    if (step.dependencies?.length) {
      md += `**Prerequisites:** Step ${step.dependencies.map((d) => d + 1).join(", ")}\n\n`;
    }
    if (step.approver) {
      md += `**Approver:** ${step.approver} (${step.approvalStatus})\n\n`;
    }
    if (step.note) md += `${step.note}\n\n`;
    md += "---\n\n";
  });

  return md;
}

export function sopToCsv(doc: SopDocument): string {
  let csv = "Step,Title,Time (min),Notes,Prerequisites,Approver,Status\n";
  doc.steps.forEach((step, index) => {
    const title = (step.title || "").replace(/"/g, '""');
    const note = (step.note || "").replace(/"/g, '""');
    const deps = (step.dependencies ?? []).map((d) => d + 1).join("; ");
    csv += `${index + 1},"${title}",${step.time || "0"},"${note}","${deps}","${step.approver}","${step.approvalStatus}"\n`;
  });
  return csv;
}

function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFilename(title: string) {
  return title.replace(/[^a-z0-9]/gi, "_");
}

export function downloadJson(doc: SopDocument) {
  downloadTextFile(
    JSON.stringify(doc, null, 2),
    `${safeFilename(doc.title)}.json`,
    "application/json",
  );
}

export function downloadSopMarkdown(doc: SopDocument) {
  downloadTextFile(
    sopToMarkdown(doc),
    `${safeFilename(doc.title)}.md`,
    "text/markdown",
  );
}

export function downloadSopCsv(doc: SopDocument) {
  downloadTextFile(
    sopToCsv(doc),
    `${safeFilename(doc.title)}.csv`,
    "text/csv",
  );
}

/** @deprecated Use downloadJson */
export const downloadSopJson = downloadJson;

export function printSop() {
  window.print();
}

/** @deprecated Use printSop */
export const printSopDocument = printSop;

export function totalSopMinutes(doc: SopDocument): number {
  return doc.steps.reduce(
    (sum, step) => sum + (Number.parseInt(step.time, 10) || 0),
    0,
  );
}
