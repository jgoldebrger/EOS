-- SOP step images in Supabase Storage (keeps sop_document JSON small)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sop-images',
  'sop-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY sop_images_select ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'sop-images');

CREATE POLICY sop_images_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sop-images'
    AND EXISTS (
      SELECT 1
      FROM public.process_pages pp
      WHERE pp.id = ((storage.foldername(name))[2])::uuid
        AND pp.organization_id = ((storage.foldername(name))[1])::uuid
        AND (
          public.can_manage_org(pp.organization_id)
          OR (pp.team_id IS NOT NULL AND public.can_manage_team(pp.team_id))
        )
    )
  );

CREATE POLICY sop_images_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sop-images'
    AND EXISTS (
      SELECT 1
      FROM public.process_pages pp
      WHERE pp.id = ((storage.foldername(name))[2])::uuid
        AND pp.organization_id = ((storage.foldername(name))[1])::uuid
        AND (
          public.can_manage_org(pp.organization_id)
          OR (pp.team_id IS NOT NULL AND public.can_manage_team(pp.team_id))
        )
    )
  );

CREATE POLICY sop_images_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sop-images'
    AND EXISTS (
      SELECT 1
      FROM public.process_pages pp
      WHERE pp.id = ((storage.foldername(name))[2])::uuid
        AND pp.organization_id = ((storage.foldername(name))[1])::uuid
        AND (
          public.can_manage_org(pp.organization_id)
          OR (pp.team_id IS NOT NULL AND public.can_manage_team(pp.team_id))
        )
    )
  );
