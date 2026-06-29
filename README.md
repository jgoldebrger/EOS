# EOS Platform

Business Operating System scaffold for EOS practitioners — scorecards, rocks, issues, todos, and L10 meetings.

## Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)

## Setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with your Supabase keys after `supabase start`
supabase start
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |

## Architecture

See [BUILD_CONTRACT.md](./BUILD_CONTRACT.md) for route prefixes, role enums, migration ledger, and wave assignments.

## Wave status

**Wave 0** — scaffold only. Auth, migrations, and feature modules arrive in later waves.
