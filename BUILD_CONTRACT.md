# EOS Platform — Build Contract

> Wave 0 orchestrator contract. Subagents must not modify files listed under **Orchestrator-only**.

## Route prefix

All organization-scoped routes use:

```
/org/[orgSlug]/
```

Examples: `/org/acme/dashboard`, `/org/acme/scorecard`, `/org/acme/settings/security/sso`

## Role enums

```ts
type OrgRole = "owner" | "admin" | "member" | "viewer";
type TeamRole = "leader" | "member" | "viewer";
```

Source of truth: `types/domain.ts`

## Permission check signatures

```ts
function canManageOrg(role: OrgRole): boolean;
function canManageTeam(orgRole: OrgRole, teamRole: TeamRole): boolean;
function canViewResource(orgRole: OrgRole, resource: string): boolean;
function canEditResource(orgRole: OrgRole, resource: string): boolean;
```

Stubs: `lib/permissions/checks.ts`

## Migration ledger

| Status | ID | Description |
|--------|-----|-------------|
| done | 001 | foundation |
| done | 002 | RLS |
| done | 003 | SSO |
| done | 004 | Scorecard |
| done | 005 | Rocks |
| done | 006 | Issues |
| done | 007 | Todos |
| done | 008 | Meetings |
| done | 009 | Accountability |
| done | 010 | V/TO |
| done | 011 | AI suggestions |
| **Next available** | **012** | — |

Migrations live in `supabase/migrations/`.

## Import paths

Use the `@/` alias (maps to project root):

```ts
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { OrgRole } from "@/types/domain";
```

## Orchestrator-only files (do not edit)

- `BUILD_CONTRACT.md`
- `types/domain.ts`
- `middleware.ts` (root — session wiring only; feature logic goes elsewhere)
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`
- `package.json` (scripts/deps — coordinate with orchestrator)
- `playwright.config.ts`
- `vitest.config.ts`
- `components.json`

## Wave assignment matrix

| Wave | Scope |
|------|--------|
| **0** | Scaffold, tooling, contracts, stubs (this commit) |
| **1a** | Supabase migrations `001+`, RLS, `types/database.ts` codegen |
| **1b** | Auth flows, `require-user`, `require-org-access`, org context hooks |
| **2** | Organizations, teams, onboarding |
| **3** | Scorecard, rocks |
| **4** | Issues, todos |
| **5** | Meetings, accountability |
| **6** | AI features |
| **7** | SSO / enterprise security settings |

## Audit contract

`AuditEntityType` and `AUDIT_ACTIONS` are defined in `types/domain.ts`. All audit writes must use these constants.
