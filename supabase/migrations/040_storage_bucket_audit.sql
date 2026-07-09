-- Storage bucket audit (040): only sop-images exists in this project.
-- Policies from 021_sop_images_storage.sql + hardened SELECT in 037_sop_images_member_select.sql.
-- No additional buckets require member-scoped policies at this time.

COMMENT ON POLICY sop_images_select ON storage.objects IS
  'Audited 040: member-scoped read via process_pages.organization_id + is_org_member';

COMMENT ON POLICY sop_images_insert ON storage.objects IS
  'Audited 040: org admin or team leader via linked process page';

COMMENT ON POLICY sop_images_update ON storage.objects IS
  'Audited 040: org admin or team leader via linked process page';

COMMENT ON POLICY sop_images_delete ON storage.objects IS
  'Audited 040: org admin or team leader via linked process page';
