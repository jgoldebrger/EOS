# Security assurance

## Penetration testing

Schedule an external pentest focused on:

- Multi-tenant isolation (cross-org data access)
- Authentication (invite-only, MFA, OAuth callback)
- Server actions and edge functions (authorization bypass)
- Break-glass paths (`createAdminClient`, email resolution)

Deliverables: executive summary, ranked findings, retest after remediation.

## SOC 2 Type I readiness (starter checklist)

- **Access control**: MFA for admins, least-privilege RLS, secret rotation runbook
- **Change management**: PR reviews, CI quality + e2e gates, migration review
- **Incident response**: document owner, escalation path, Supabase/Vercel support contacts
- **Vendor management**: Supabase, Vercel, Resend, OpenAI DPAs on file
- **Monitoring**: alerts per `docs/security-monitoring.md`

## Bug bounty

Not required for initial production. Revisit when handling regulated customer data or enterprise contracts.
