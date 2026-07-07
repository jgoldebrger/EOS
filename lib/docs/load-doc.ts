import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getAllDocSlugs } from "@/lib/docs/manifest";

const DOCS_DIR = join(process.cwd(), "docs");

export function loadDocMarkdown(slug: string): string | null {
  const filePath = join(DOCS_DIR, `${slug}.md`);
  if (!existsSync(filePath)) {
    return null;
  }
  return readFileSync(filePath, "utf-8");
}

export function loadDocIndex(): string | null {
  const filePath = join(DOCS_DIR, "README.md");
  if (!existsSync(filePath)) {
    return null;
  }
  return readFileSync(filePath, "utf-8");
}

export function isValidDocSlug(slug: string): boolean {
  return getAllDocSlugs().includes(slug);
}
