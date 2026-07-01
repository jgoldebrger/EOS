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
| done | 012 | Scorecard Strety enhancements |
| done | 013 | Headlines + Process |
| done | 014 | Inbox + Projects |
| done | 015 | Measurable options |
| done | 016 | Time kind |
| done | 017 | Reports to + formula metrics |
| done | 018 | Tags |
| done | 019 | SOP documents |
| done | 020 | Process enhancements |
| done | 021 | SOP images storage |
| done | 022 | Projects core (work items, modules, labels) |
| done | 023 | Project views |
| done | 024 | Project cycles |
| done | 025 | Project pages + EOS links |
| done | 026 | Project table grants |
| **Next available** | **027** | — |

Team workspace routes: `/org/[orgSlug]/teams/[teamSlug]/{overview,agendas,rocks,scorecard,todos,headlines,issues,process}`

Global nav routes: `/org/[orgSlug]/{home,inbox,activity,reports,teams,people,company,projects}`

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

| Wave | Scope | Status |
|------|--------|--------|
| **0** | Scaffold, tooling, contracts, stubs | **complete** |
| **1a** | Supabase migrations `001+`, RLS, `types/database.ts` codegen | **complete** |
| **1b** | Auth flows, `require-user`, `require-org-access`, org context hooks | **complete** |
| **2** | Organizations, teams, onboarding | **complete** |
| **3** | Scorecard, rocks | **complete** |
| **4** | Issues, todos | **complete** |
| **5** | Meetings, accountability | **complete** |
| **6** | AI features | **complete** |
| **7** | SSO / enterprise security settings, integration hardening | **complete** |

## Audit contract

`AuditEntityType` and `AUDIT_ACTIONS` are defined in `types/domain.ts`. All audit writes must use these constants.
