import type { ProcessPageContentFormatDb } from "@/types/database";
import type { SopDocument } from "@/features/process/schema";

export interface ProcessPageListItem {
  id: string;
  title: string;
  content: string;
  content_format: ProcessPageContentFormatDb;
  parent_id: string | null;
  team_id: string | null;
  updated_at: string;
  created_at: string;
}

export interface ProcessPageDetail extends ProcessPageListItem {
  sop_document: SopDocument | null;
  organization_id: string;
}
