export interface DocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function headingIdForText(text: string, usedIds: Map<string, number>): string {
  const base = slugifyHeading(text);
  const count = usedIds.get(base) ?? 0;
  const id = count > 0 ? `${base}-${count}` : base;
  usedIds.set(base, count + 1);
  return id;
}

export function extractDocHeadings(markdown: string): DocHeading[] {
  const headings: DocHeading[] = [];
  const usedIds = new Map<string, number>();

  for (const line of markdown.split("\n")) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) {
      continue;
    }
    const level = match[1].length as 2 | 3;
    const text = match[2].trim();
    const id = headingIdForText(text, usedIds);
    headings.push({ id, text, level });
  }

  return headings;
}
