#!/usr/bin/env bash
set -euo pipefail

echo "Starting local Supabase..."
supabase start

echo "Loading Supabase credentials..."
eval "$(supabase status -o env)"

export NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}"
export SUPABASE_URL="${SUPABASE_URL}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${ANON_KEY}"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${ANON_KEY}"
export SUPABASE_PUBLISHABLE_KEY="${ANON_KEY}"
export SUPABASE_SECRET_KEY="${SERVICE_ROLE_KEY}"
export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}"
export SUPABASE_JWKS_URL="${SUPABASE_URL}/auth/v1/.well-known/jwks.json"
export E2E_SUPABASE_ENABLED=1

echo "Resetting database with seed data..."
supabase db reset --yes

echo "Installing Playwright browser..."
npx playwright install chromium --with-deps

echo "Running E2E tests..."
npm run test:e2e:ci
