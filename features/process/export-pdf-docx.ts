import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { jsPDF } from "jspdf";
import type { SopDocument } from "@/features/process/schema";

type ImageFormat = "JPEG" | "PNG";

interface LoadedImage {
  bytes: Uint8Array;
  format: ImageFormat;
  width: number;
  height: number;
}

function totalMinutes(doc: SopDocument): number {
  return doc.steps.reduce(
    (sum, step) => sum + (Number.parseInt(step.time, 10) || 0),
    0,
  );
}

function safeFilename(title: string) {
  return title.replace(/[^a-z0-9]/gi, "_") || "sop";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function detectImageFormat(
  bytes: Uint8Array,
  mimeType: string,
): ImageFormat | null {
  if (mimeType.includes("png") || (bytes[0] === 0x89 && bytes[1] === 0x50)) {
    return "PNG";
  }
  if (
    mimeType.includes("jpeg") ||
    mimeType.includes("jpg") ||
    (bytes[0] === 0xff && bytes[1] === 0xd8)
  ) {
    return "JPEG";
  }
  return null;
}

async function loadImageDimensions(
  bytes: Uint8Array,
  format: ImageFormat,
): Promise<{ width: number; height: number }> {
  const blob = new Blob([new Uint8Array(bytes)], {
    type: format === "PNG" ? "image/png" : "image/jpeg",
  });
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not load image"));
      el.src = url;
    });
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadImageForExport(url: string): Promise<LoadedImage | null> {
  if (!url.trim()) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const format = detectImageFormat(bytes, response.headers.get("content-type") ?? "");
    if (!format) return null;
    const { width, height } = await loadImageDimensions(bytes, format);
    return { bytes, format, width, height };
  } catch {
    return null;
  }
}

function scaleToMaxWidth(
  width: number,
  height: number,
  maxWidth: number,
): { width: number; height: number } {
  if (width <= maxWidth) {
    return { width, height };
  }
  const scale = maxWidth / width;
  return {
    width: maxWidth,
    height: Math.round(height * scale),
  };
}

function stepMetaLine(step: SopDocument["steps"][number]): string {
  const parts: string[] = [];
  if (step.time) parts.push(`${step.time} min`);
  if (step.approver) {
    parts.push(`Approver: ${step.approver} (${step.approvalStatus})`);
  }
  if (step.dependencies?.length) {
    parts.push(
      `Prerequisites: Step ${step.dependencies.map((dep) => dep + 1).join(", ")}`,
    );
  }
  return parts.join(" · ");
}

export async function downloadSopPdf(doc: SopDocument): Promise<void> {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height: number) => {
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (y + height > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const addWrappedText = (
    text: string,
    fontSize: number,
    style: "normal" | "bold" = "normal",
    color: [number, number, number] = [0, 0, 0],
  ) => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, contentWidth) as string[];
    const lineHeight = fontSize * 0.45;
    ensureSpace(lines.length * lineHeight);
    pdf.text(lines, margin, y);
    y += lines.length * lineHeight + 2;
  };

  addWrappedText(doc.title, 18, "bold");
  addWrappedText(
    `Department: ${doc.department} · Priority: ${doc.priority} · Total time: ${totalMinutes(doc) || 0} min`,
    10,
    "normal",
    [80, 80, 80],
  );
  y += 2;

  for (let index = 0; index < doc.steps.length; index += 1) {
    const step = doc.steps[index];
    ensureSpace(12);
    addWrappedText(
      `${index + 1}. ${step.title || "Untitled step"}`,
      13,
      "bold",
    );

    const meta = stepMetaLine(step);
    if (meta) {
      addWrappedText(meta, 9, "normal", [90, 90, 90]);
    }

    if (step.note) {
      addWrappedText(step.note, 10);
    }

    if (step.imageUrl) {
      const image = await loadImageForExport(step.imageUrl);
      if (image) {
        const displayWidthMm = contentWidth;
        const displayHeightMm = (image.height / image.width) * displayWidthMm;
        ensureSpace(displayHeightMm + 4);
        const blob = new Blob([new Uint8Array(image.bytes)], {
          type: image.format === "PNG" ? "image/png" : "image/jpeg",
        });
        const objectUrl = URL.createObjectURL(blob);
        try {
          pdf.addImage(
            objectUrl,
            image.format,
            margin,
            y,
            displayWidthMm,
            displayHeightMm,
          );
          y += displayHeightMm + 4;
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }
    }

    y += 3;
  }

  pdf.save(`${safeFilename(doc.title)}.pdf`);
}

export async function downloadSopDocx(doc: SopDocument): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: doc.title, bold: true })],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Department: ${doc.department} · Priority: ${doc.priority} · Total time: ${totalMinutes(doc) || 0} min`,
          color: "666666",
        }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: "" })] }),
  ];

  for (let index = 0; index < doc.steps.length; index += 1) {
    const step = doc.steps[index];
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: `${index + 1}. ${step.title || "Untitled step"}`,
            bold: true,
          }),
        ],
      }),
    );

    const meta = stepMetaLine(step);
    if (meta) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: meta, color: "666666", size: 20 })],
        }),
      );
    }

    if (step.note) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: step.note })],
        }),
      );
    }

    if (step.imageUrl) {
      const image = await loadImageForExport(step.imageUrl);
      if (image) {
        const scaled = scaleToMaxWidth(image.width, image.height, 480);
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                type: image.format === "PNG" ? "png" : "jpg",
                data: image.bytes,
                transformation: {
                  width: scaled.width,
                  height: scaled.height,
                },
              }),
            ],
          }),
        );
      }
    }

    children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
  }

  const document = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(document);
  downloadBlob(blob, `${safeFilename(doc.title)}.docx`);
}
