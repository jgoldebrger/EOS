-- Transport / TMS core: last-mile loads, stops, carriers, routes, analyses

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_mutate_transport_resource(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = auth.uid()
      AND om.org_role IN ('owner', 'admin', 'member')
  );
$$;

-- ---------------------------------------------------------------------------
-- transport_depots
-- ---------------------------------------------------------------------------
CREATE TABLE public.transport_depots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX transport_depots_organization_id_idx ON public.transport_depots (organization_id);

CREATE TRIGGER transport_depots_set_updated_at
  BEFORE UPDATE ON public.transport_depots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- transport_carriers
-- ---------------------------------------------------------------------------
CREATE TABLE public.transport_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  mc_number text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX transport_carriers_organization_id_idx ON public.transport_carriers (organization_id);

CREATE TRIGGER transport_carriers_set_updated_at
  BEFORE UPDATE ON public.transport_carriers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- transport_loads
-- ---------------------------------------------------------------------------
CREATE TABLE public.transport_loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  load_number int NOT NULL,
  reference text,
  status text NOT NULL DEFAULT 'quote' CHECK (
    status IN ('quote', 'dispatched', 'in_transit', 'delivered', 'cancelled')
  ),
  customer_name text,
  customer_phone text,
  carrier_id uuid REFERENCES public.transport_carriers(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  depot_id uuid REFERENCES public.transport_depots(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  scheduled_date date,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX transport_loads_org_load_number_idx
  ON public.transport_loads (organization_id, load_number);

CREATE INDEX transport_loads_organization_id_idx ON public.transport_loads (organization_id);
CREATE INDEX transport_loads_status_idx ON public.transport_loads (status);
CREATE INDEX transport_loads_driver_id_idx ON public.transport_loads (driver_id);

CREATE TRIGGER transport_loads_set_updated_at
  BEFORE UPDATE ON public.transport_loads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- transport_stops
-- ---------------------------------------------------------------------------
CREATE TABLE public.transport_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  load_id uuid NOT NULL REFERENCES public.transport_loads(id) ON DELETE CASCADE,
  sequence_number int NOT NULL,
  stop_type text NOT NULL DEFAULT 'delivery' CHECK (stop_type IN ('pickup', 'delivery')),
  address text NOT NULL,
  latitude double precision,
  longitude double precision,
  contact_name text,
  contact_phone text,
  time_window_start timestamptz,
  time_window_end timestamptz,
  service_duration_minutes int NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'arrived', 'completed', 'skipped')
  ),
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX transport_stops_load_sequence_idx
  ON public.transport_stops (load_id, sequence_number);

CREATE INDEX transport_stops_load_id_idx ON public.transport_stops (load_id);

CREATE TRIGGER transport_stops_set_updated_at
  BEFORE UPDATE ON public.transport_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- transport_routes (optimized route results)
-- ---------------------------------------------------------------------------
CREATE TABLE public.transport_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  load_id uuid NOT NULL REFERENCES public.transport_loads(id) ON DELETE CASCADE,
  route_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_distance_meters int,
  total_duration_seconds int,
  optimized_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX transport_routes_load_id_idx ON public.transport_routes (load_id);

-- ---------------------------------------------------------------------------
-- transport_analyses (isochrones, travel-time matrices)
-- ---------------------------------------------------------------------------
CREATE TABLE public.transport_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_type text NOT NULL CHECK (analysis_type IN ('isochrone', 'matrix')),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'completed', 'failed')
  ),
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX transport_analyses_organization_id_idx ON public.transport_analyses (organization_id);

CREATE TRIGGER transport_analyses_set_updated_at
  BEFORE UPDATE ON public.transport_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- EOS entity links
-- ---------------------------------------------------------------------------
CREATE TABLE public.transport_project_links (
  load_id uuid NOT NULL REFERENCES public.transport_loads(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (load_id, project_id)
);

CREATE TABLE public.transport_issue_links (
  load_id uuid NOT NULL REFERENCES public.transport_loads(id) ON DELETE CASCADE,
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (load_id, issue_id)
);

CREATE TABLE public.transport_todo_links (
  load_id uuid NOT NULL REFERENCES public.transport_loads(id) ON DELETE CASCADE,
  todo_id uuid NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (load_id, todo_id)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.transport_depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_project_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_issue_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_todo_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY transport_depots_select ON public.transport_depots
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY transport_depots_mutate ON public.transport_depots
  FOR ALL TO authenticated
  USING (public.can_mutate_transport_resource(organization_id))
  WITH CHECK (public.can_mutate_transport_resource(organization_id));

CREATE POLICY transport_carriers_select ON public.transport_carriers
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY transport_carriers_mutate ON public.transport_carriers
  FOR ALL TO authenticated
  USING (public.can_mutate_transport_resource(organization_id))
  WITH CHECK (public.can_mutate_transport_resource(organization_id));

CREATE POLICY transport_loads_select ON public.transport_loads
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY transport_loads_mutate ON public.transport_loads
  FOR ALL TO authenticated
  USING (public.can_mutate_transport_resource(organization_id))
  WITH CHECK (public.can_mutate_transport_resource(organization_id));

CREATE POLICY transport_stops_select ON public.transport_stops
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY transport_stops_mutate ON public.transport_stops
  FOR ALL TO authenticated
  USING (public.can_mutate_transport_resource(organization_id))
  WITH CHECK (public.can_mutate_transport_resource(organization_id));

CREATE POLICY transport_routes_select ON public.transport_routes
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY transport_routes_mutate ON public.transport_routes
  FOR ALL TO authenticated
  USING (public.can_mutate_transport_resource(organization_id))
  WITH CHECK (public.can_mutate_transport_resource(organization_id));

CREATE POLICY transport_analyses_select ON public.transport_analyses
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY transport_analyses_mutate ON public.transport_analyses
  FOR ALL TO authenticated
  USING (public.can_mutate_transport_resource(organization_id))
  WITH CHECK (public.can_mutate_transport_resource(organization_id));

CREATE POLICY transport_project_links_select ON public.transport_project_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transport_loads l
      WHERE l.id = load_id AND public.is_org_member(l.organization_id)
    )
  );

CREATE POLICY transport_project_links_mutate ON public.transport_project_links
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transport_loads l
      WHERE l.id = load_id
        AND public.can_mutate_transport_resource(l.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transport_loads l
      WHERE l.id = load_id
        AND public.can_mutate_transport_resource(l.organization_id)
    )
  );

CREATE POLICY transport_issue_links_select ON public.transport_issue_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transport_loads l
      WHERE l.id = load_id AND public.is_org_member(l.organization_id)
    )
  );

CREATE POLICY transport_issue_links_mutate ON public.transport_issue_links
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transport_loads l
      WHERE l.id = load_id
        AND public.can_mutate_transport_resource(l.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transport_loads l
      WHERE l.id = load_id
        AND public.can_mutate_transport_resource(l.organization_id)
    )
  );

CREATE POLICY transport_todo_links_select ON public.transport_todo_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transport_loads l
      WHERE l.id = load_id AND public.is_org_member(l.organization_id)
    )
  );

CREATE POLICY transport_todo_links_mutate ON public.transport_todo_links
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transport_loads l
      WHERE l.id = load_id
        AND public.can_mutate_transport_resource(l.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transport_loads l
      WHERE l.id = load_id
        AND public.can_mutate_transport_resource(l.organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Grants (required for Supabase authenticated role)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_depots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_carriers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_loads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_stops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_routes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_analyses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_project_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_issue_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_todo_links TO authenticated;

GRANT EXECUTE ON FUNCTION public.can_mutate_transport_resource(uuid) TO authenticated;
