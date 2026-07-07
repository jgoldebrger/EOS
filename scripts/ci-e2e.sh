#!/usr/bin/env bash
set -euo pipefail

wait_for_supabase() {
  echo "Waiting for Supabase services..."
  for i in $(seq 1 30); do
    if STATUS_JSON=$(supabase status -o json 2>/dev/null); then
      API_URL=$(echo "$STATUS_JSON" | jq -r '.API_URL // empty')
      if [[ -n "$API_URL" && "$API_URL" != "null" ]]; then
        echo "Supabase ready (attempt ${i})"
        return 0
      fi
    fi
    sleep 2
  done
  echo "Supabase failed to become ready within 60s"
  exit 1
}

load_supabase_env() {
  local status_json
  status_json=$(supabase status -o json)

  API_URL=$(echo "$status_json" | jq -r '.API_URL // "http://127.0.0.1:54321"')
  PUBLISHABLE_KEY=$(echo "$status_json" | jq -r '.PUBLISHABLE_KEY // .ANON_KEY // empty')
  SECRET_KEY=$(echo "$status_json" | jq -r '.SECRET_KEY // .SERVICE_ROLE_KEY // empty')

  if [[ -z "$PUBLISHABLE_KEY" || -z "$SECRET_KEY" ]]; then
    echo "Failed to resolve Supabase keys from status:"
    echo "$status_json" | jq '.'
    exit 1
  fi

  export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
  export SUPABASE_URL="$API_URL"
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="$PUBLISHABLE_KEY"
  export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
  export SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
  export SUPABASE_SECRET_KEY="$SECRET_KEY"
  export SUPABASE_SERVICE_ROLE_KEY="$SECRET_KEY"
  export SUPABASE_JWKS_URL="${API_URL}/auth/v1/.well-known/jwks.json"
  export E2E_SUPABASE_ENABLED=1
}

echo "Starting local Supabase..."
supabase start
wait_for_supabase

echo "Resetting database with seed data..."
supabase db reset --yes
wait_for_supabase

echo "Loading Supabase credentials..."
load_supabase_env

echo "Installing Playwright browser..."
npx playwright install chromium --with-deps

echo "Running E2E tests..."
npm run test:e2e:ci
