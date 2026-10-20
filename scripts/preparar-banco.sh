#!/usr/bin/env bash
# Aplica as migrações do Drizzle e as políticas de RLS no banco de DATABASE_URL.
# Uso: pnpm db:preparar   (lê .env.local)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env.local ]]; then set -a; source .env.local; set +a; fi
: "${DATABASE_URL:?DATABASE_URL não configurada}"

pnpm exec drizzle-kit migrate
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/rls.sql
echo "Banco pronto."
