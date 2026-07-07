import type { DocHeading } from "@/lib/docs/headings";
import { cn } from "@/lib/utils";

interface DocTableOfContentsProps {
  headings: DocHeading[];
}

export function DocTableOfContents({ headings }: DocTableOfContentsProps) {
  const visible = headings.filter((heading) => heading.level <= 3);
  if (visible.length < 2) {
    return null;
  }

  return (
    <nav
      className="sticky top-24 hidden w-48 shrink-0 xl:block"
      aria-label="On this page"
      data-testid="docs-toc"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-2 border-l pl-3 text-sm">
        {visible.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={cn(
                "block text-muted-foreground transition-colors hover:text-foreground",
                heading.level === 3 && "pl-3 text-xs",
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
