import type { ProcessPageContentFormatDb } from "@/types/database";
import type { SopDocument } from "@/features/process/schema";

export interface ProcessTag {
  id: string;
  name: string;
  color: string | null;
}

export interface ProcessPageListItem {
  id: string;
  title: string;
  content: string;
  content_format: ProcessPageContentFormatDb;
  category: string;
  parent_id: string | null;
  team_id: string | null;
  archived_at: string | null;
  updated_at: string;
  created_at: string;
  tags: ProcessTag[];
}

export interface ProcessPageDetail extends ProcessPageListItem {
  sop_document: SopDocument | null;
  organization_id: string;
}

export interface ProcessPageVersionListItem {
  id: string;
  process_page_id: string;
  version_number: number;
  note: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ProcessPageVersionDetail extends ProcessPageVersionListItem {
  content: string;
  sop_document: SopDocument | null;
}

export interface ProcessPageTreeNode {
  page: ProcessPageListItem;
  depth: number;
}
