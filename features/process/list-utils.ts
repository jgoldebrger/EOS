import type { ProcessPageListItem, ProcessPageTreeNode } from "@/features/process/types";

export const DEFAULT_PROCESS_CATEGORY = "General";

export interface ProcessPageFilterOptions {
  search?: string;
  category?: string;
  showArchived?: boolean;
}

function pageMatchesFilters(
  page: ProcessPageListItem,
  options: ProcessPageFilterOptions,
): boolean {
  const search = options.search?.trim().toLowerCase() ?? "";
  const category = options.category ?? DEFAULT_PROCESS_CATEGORY;
  const showArchived = options.showArchived ?? false;

  if (!showArchived && page.archived_at) {
    return false;
  }

  if (category !== "all" && page.category !== category) {
    return false;
  }

  if (search && !page.title.toLowerCase().includes(search)) {
    return false;
  }

  return true;
}

function collectAncestorIds(
  pages: ProcessPageListItem[],
  pageId: string,
): Set<string> {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const ancestors = new Set<string>();
  let cursor = byId.get(pageId)?.parent_id ?? null;

  while (cursor) {
    ancestors.add(cursor);
    cursor = byId.get(cursor)?.parent_id ?? null;
  }

  return ancestors;
}

export function filterProcessPages(
  pages: ProcessPageListItem[],
  options: ProcessPageFilterOptions,
): ProcessPageListItem[] {
  const matchingIds = new Set(
    pages.filter((page) => pageMatchesFilters(page, options)).map((page) => page.id),
  );

  if (matchingIds.size === 0) {
    return [];
  }

  const visibleIds = new Set(matchingIds);
  for (const id of matchingIds) {
    for (const ancestorId of collectAncestorIds(pages, id)) {
      visibleIds.add(ancestorId);
    }
  }

  return pages.filter((page) => visibleIds.has(page.id));
}

export function flattenProcessPageTree(
  pages: ProcessPageListItem[],
  parentId: string | null = null,
  depth = 0,
): ProcessPageTreeNode[] {
  const children = pages
    .filter((page) => page.parent_id === parentId)
    .sort((a, b) => a.title.localeCompare(b.title));

  const nodes: ProcessPageTreeNode[] = [];

  for (const page of children) {
    nodes.push({ page, depth });
    nodes.push(...flattenProcessPageTree(pages, page.id, depth + 1));
  }

  return nodes;
}

export function getProcessCategories(pages: ProcessPageListItem[]): string[] {
  const categories = new Set<string>([DEFAULT_PROCESS_CATEGORY]);
  for (const page of pages) {
    if (page.category) {
      categories.add(page.category);
    }
  }
  return [...categories].sort((a, b) => a.localeCompare(b));
}
