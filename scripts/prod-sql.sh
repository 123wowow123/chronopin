#!/bin/sh
# Runs SQL against the production database on the VM (docs/deploy-azure.md),
# in one transaction that stops at the first error, so a half-applied fix
# never sticks. SQL comes from a file argument or stdin:
#
#   scripts/prod-sql.sh fix.sql
#   scripts/prod-sql.sh <<'SQL'
#   UPDATE "Company" SET ... WHERE id = 130;
#   SQL
set -eu

HOST=azureuser@20.109.175.187
KEY="$HOME/.ssh/chronopin_azure"

if [ $# -gt 0 ]; then exec <"$1"; fi

ssh -i "$KEY" "$HOST" 'cd chronopin && docker compose -f Docker/docker-compose.prod.yml exec -T postgres sh -c "psql -v ON_ERROR_STOP=1 --single-transaction -U \$POSTGRES_USER -d \$POSTGRES_DB"'
