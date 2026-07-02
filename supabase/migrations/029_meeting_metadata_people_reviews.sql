-- Meeting metadata (ratings, facilitator state) + People Analyzer GWC reviews

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.people_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seat_id uuid REFERENCES public.accountability_seats(id) ON DELETE SET NULL,
  get_it smallint CHECK (get_it BETWEEN 1 AND 5),
  want_it smallint CHECK (want_it BETWEEN 1 AND 5),
  capacity smallint CHECK (capacity BETWEEN 1 AND 5),
  notes text DEFAULT '',
  quarter text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (organization_id, subject_user_id, reviewer_user_id, quarter)
);

CREATE INDEX people_reviews_organization_id_idx ON public.people_reviews (organization_id);
CREATE INDEX people_reviews_subject_user_id_idx ON public.people_reviews (subject_user_id);
CREATE INDEX people_reviews_quarter_idx ON public.people_reviews (quarter);

CREATE TRIGGER people_reviews_set_updated_at
  BEFORE UPDATE ON public.people_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.people_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY people_reviews_select ON public.people_reviews
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY people_reviews_mutate ON public.people_reviews
  FOR ALL TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND (
      public.can_manage_org(organization_id)
      OR reviewer_user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND (
      public.can_manage_org(organization_id)
      OR reviewer_user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.people_reviews TO authenticated;
