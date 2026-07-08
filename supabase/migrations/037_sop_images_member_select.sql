-- Restrict SOP process images to org members (remove public bucket access).

UPDATE storage.buckets
SET public = false
WHERE id = 'sop-images';

DROP POLICY IF EXISTS sop_images_select ON storage.objects;

CREATE POLICY sop_images_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'sop-images'
    AND EXISTS (
      SELECT 1
      FROM public.process_pages pp
      WHERE pp.id = ((storage.foldername(name))[2])::uuid
        AND pp.organization_id = ((storage.foldername(name))[1])::uuid
        AND public.is_org_member(pp.organization_id)
    )
  );
