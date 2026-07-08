-- Defense in depth: unauthenticated PostgREST (anon role) must not read tenant tables.
-- Browser clients use the authenticated role when a user JWT is present.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO anon;
