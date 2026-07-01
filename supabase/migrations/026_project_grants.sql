-- Grant authenticated role access to project tables created in 022–025.
-- Without these grants, inserts fail with "permission denied" even when RLS passes.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_work_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_labels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_work_item_labels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_cycles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_pages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_issue_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_rock_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_todo_links TO authenticated;

GRANT EXECUTE ON FUNCTION public.can_mutate_project_resource(uuid) TO authenticated;
