import { uploadSopStepImageAction } from "@/features/process/actions";
import type { SopDocument } from "@/features/process/schema";

const MAX_IMAGE_BYTES = 450_000;
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    image.src = url;
  });
}

export async function compressImageFile(file: File): Promise<Blob> {
  const image = await loadImageFromFile(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not process image");
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });

  if (!blob) {
    throw new Error("Could not compress image");
  }

  if (blob.size > MAX_IMAGE_BYTES) {
    const smaller = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.65);
    });
    if (!smaller) {
      throw new Error("Could not compress image");
    }
    if (smaller.size > MAX_IMAGE_BYTES) {
      throw new Error(
        "Image is still too large after compression. Use a smaller photo.",
      );
    }
    return smaller;
  }

  return blob;
}

export async function uploadSopStepImage(
  file: File,
  organizationId: string,
  pageId: string,
): Promise<{ url: string } | { error: string }> {
  let compressed: Blob;
  try {
    compressed = await compressImageFile(file);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not process image",
    };
  }

  const formData = new FormData();
  formData.append("organizationId", organizationId);
  formData.append("pageId", pageId);
  formData.append("file", compressed, "sop-step.jpg");

  const result = await uploadSopStepImageAction(formData);
  if (!result.success) {
    return { error: result.error };
  }

  return { url: result.url };
}

async function uploadDataUrlImage(
  dataUrl: string,
  organizationId: string,
  pageId: string,
): Promise<string> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], "sop-step.jpg", {
    type: blob.type || "image/jpeg",
  });
  const result = await uploadSopStepImage(file, organizationId, pageId);
  if ("error" in result) {
    throw new Error(result.error);
  }
  return result.url;
}

/** Replace embedded data-URL images with Supabase Storage URLs before save. */
export async function resolveSopDocumentImages(
  doc: SopDocument,
  organizationId: string,
  pageId: string,
): Promise<SopDocument> {
  let changed = false;
  const steps = await Promise.all(
    doc.steps.map(async (step) => {
      if (!step.imageUrl.startsWith("data:")) {
        return step;
      }
      const url = await uploadDataUrlImage(
        step.imageUrl,
        organizationId,
        pageId,
      );
      changed = true;
      return { ...step, imageUrl: url };
    }),
  );

  return changed ? { ...doc, steps } : doc;
}

export function estimateSopDocumentBytes(doc: SopDocument): number {
  return new TextEncoder().encode(JSON.stringify(doc)).length;
}
