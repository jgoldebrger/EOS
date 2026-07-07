import { headingIdForText } from "@/lib/docs/headings";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatInline(text: string): string {
  let result = escapeHtml(text);
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-primary underline underline-offset-2">$1</a>',
  );
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return result;
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|");
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s:-]+\|/.test(line.trim()) && line.includes("-");
}

export function DocMarkdown({ content, basePath }: { content: string; basePath: string }) {
  const lines = content.split("\n");
  const blocks: string[] = [];
  const usedIds = new Map<string, number>();
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim() || line.trim() === "---") {
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        `<h1 class="text-3xl font-semibold tracking-tight">${formatInline(line.slice(2))}</h1>`,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      const id = headingIdForText(text, usedIds);
      blocks.push(
        `<h2 id="${id}" class="mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight">${formatInline(text)}</h2>`,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      const text = line.slice(4).trim();
      const id = headingIdForText(text, usedIds);
      blocks.push(
        `<h3 id="${id}" class="mt-8 scroll-mt-24 text-xl font-semibold">${formatInline(text)}</h3>`,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].startsWith("> ")) {
        quoteLines.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push(
        `<blockquote class="border-l-4 border-primary/40 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">${quoteLines.map((q) => `<p>${formatInline(q)}</p>`).join("")}</blockquote>`,
      );
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        `<pre class="overflow-x-auto rounded-lg border bg-muted p-4 text-sm"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
      );
      continue;
    }

    if (isTableRow(line)) {
      const tableLines: string[] = [];
      while (index < lines.length && isTableRow(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }
      const dataRows = tableLines.filter((row) => !isTableSeparator(row));
      if (dataRows.length > 0) {
        const [header, ...body] = dataRows.map(parseTableRow);
        const headHtml = header
          .map(
            (cell) =>
              `<th class="border px-3 py-2 text-left font-medium">${formatInline(cell)}</th>`,
          )
          .join("");
        const bodyHtml = body
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td class="border px-3 py-2 align-top">${formatInline(cell)}</td>`).join("")}</tr>`,
          )
          .join("");
        blocks.push(
          `<div class="overflow-x-auto"><table class="w-full border-collapse text-sm"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`,
        );
      }
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push(
        `<ul class="list-disc space-y-2 pl-6">${items.map((item) => `<li>${formatInline(item)}</li>`).join("")}</ul>`,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      lines[index].trim() !== "---" &&
      !lines[index].startsWith("#") &&
      !lines[index].startsWith("> ") &&
      !lines[index].startsWith("```") &&
      !lines[index].startsWith("- ") &&
      !isTableRow(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push(
      `<p class="leading-7 text-muted-foreground">${formatInline(paragraphLines.join(" "))}</p>`,
    );
  }

  const html = blocks
    .join("\n")
    .replace(/href="\.\/([^"]+)\.md"/g, `href="${basePath}/$1"`);

  return (
    <article
      className="space-y-4 text-foreground [&_a]:font-medium [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_li]:text-muted-foreground [&_strong]:text-foreground"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
