-- Domain verification hardening:
-- 1) Domains may be pending (verified_at IS NULL) until DNS TXT proof.
-- 2) A domain can be claimed by only one organization.

ALTER TABLE public.organization_verified_domains
  ALTER COLUMN verified_at DROP NOT NULL;

ALTER TABLE public.organization_verified_domains
  ALTER COLUMN verified_at DROP DEFAULT;

ALTER TABLE public.organization_verified_domains
  ADD COLUMN IF NOT EXISTS verification_token text;

-- Prefer a single global claim per domain (pending or verified).
ALTER TABLE public.organization_verified_domains
  DROP CONSTRAINT IF EXISTS organization_verified_domains_organization_id_domain_key;

CREATE UNIQUE INDEX IF NOT EXISTS organization_verified_domains_domain_unique
  ON public.organization_verified_domains (domain);

COMMENT ON COLUMN public.organization_verified_domains.verified_at IS
  'Set only after DNS TXT (or equivalent) proof succeeds. NULL means pending.';

COMMENT ON COLUMN public.organization_verified_domains.verification_token IS
  'TXT token for pending DNS verification; cleared after verified_at is set.';
