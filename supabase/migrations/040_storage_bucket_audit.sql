-- Storage bucket audit (040): only sop-images exists in this project.
-- Policies from 021_sop_images_storage.sql + hardened SELECT in 037_sop_images_member_select.sql.
-- sop_images_select: member-scoped read via process_pages.organization_id + is_org_member.
-- sop_images_insert/update/delete: org admin or team leader via linked process page.
-- No additional buckets require member-scoped policies at this time.
-- Note: COMMENT ON POLICY requires storage.objects owner (supabase_storage_admin) on hosted Supabase.

SELECT 1;
