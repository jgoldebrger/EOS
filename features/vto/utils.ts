import type { VtoSection, VtoSnapshotSection } from "@/features/vto/types";

export const DEFAULT_VTO_SECTIONS = [
  {
    section_key: "core_values",
    title: "Core Values",
    display_order: 0,
  },
  {
    section_key: "core_focus",
    title: "Core Focus",
    display_order: 1,
  },
  {
    section_key: "ten_year_target",
    title: "10-Year Target",
    display_order: 2,
  },
  {
    section_key: "marketing_strategy",
    title: "Marketing Strategy",
    display_order: 3,
  },
  {
    section_key: "three_year_picture",
    title: "3-Year Picture",
    display_order: 4,
  },
  {
    section_key: "one_year_plan",
    title: "1-Year Plan",
    display_order: 5,
  },
] as const;

export type DefaultVtoSectionKey =
  (typeof DEFAULT_VTO_SECTIONS)[number]["section_key"];

export function buildSnapshotPayload(sections: VtoSection[]): VtoSnapshotSection[] {
  return sections.map((section) => ({
    section_key: section.section_key,
    title: section.title,
    content: section.content,
    display_order: section.display_order,
    visible: section.visible,
  }));
}

export function formatSnapshotDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

export function sortVtoSections<T extends Pick<VtoSection, "display_order" | "title">>(
  sections: T[],
): T[] {
  return [...sections].sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return a.title.localeCompare(b.title);
  });
}
