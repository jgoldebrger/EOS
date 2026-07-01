-- SOP document storage for process_pages (SOP-Designer embed)

ALTER TABLE public.process_pages
  ADD COLUMN IF NOT EXISTS sop_document jsonb,
  ADD COLUMN IF NOT EXISTS content_format text NOT NULL DEFAULT 'text'
    CHECK (content_format IN ('text', 'sop'));

CREATE INDEX IF NOT EXISTS process_pages_content_format_idx
  ON public.process_pages (organization_id, content_format);
