#!/bin/sh
# Copies the production database into the local development one
# (docs/deploy-azure.md, "Pulling production to local"):
#
#   npm run db:pull-prod                  a fresh pg_dump from the VM over SSH
#   npm run db:pull-prod -- --nightly     the newest nightly backup blob instead
#                                         (needs `az login`; works when SSH is
#                                         closed to your current IP)
#   npm run db:pull-prod -- --file X      restore a dump already on disk
#   add --yes to skip the confirmation, --no-search to leave the search index,
#   --no-seeds to leave scripts/backup/*.json
#   LOCAL_DB=chronopin_prod npm run db:pull-prod   into a side database instead
#
# Before anything is replaced the local database is dumped next to the prod
# copy, so `--file ~/chronopin-backups/local-<time>.dump` puts it back. Dumps
# hold real accounts (emails, password hashes), so they live outside the
# repository - where neither git nor the deploy's `rsync --delete` sees them.
#
# The restore goes into a scratch database first and is swapped in by rename
# only when it succeeded, so a failed pull leaves the local database as it was.
# Afterwards the local schema files newer than prod are applied, the search
# index is rebuilt from the database's pins, and `npm run backup:data` writes
# the seed files (scripts/backup/*.json) from it, so they are production's too.
set -eu

SUBSCRIPTION=9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5
VM=azureuser@20.109.175.187
SSH_KEY=${SSH_KEY:-$HOME/.ssh/chronopin_azure}
BACKUP_DIR=${BACKUP_DIR:-$HOME/chronopin-backups}
CONTAINER=${PG_CONTAINER:-chronopin-postgres}
DB=${LOCAL_DB:-chronopin}
PG_USER=${LOCAL_PG_USER:-chronopin}
# The npm steps at the end read DATABASE_URL; point them at a side database too.
if [ -n "${LOCAL_DB:-}" ]; then
  export DATABASE_URL="postgres://$PG_USER:${LOCAL_PG_PASSWORD:-chronopin}@localhost:5432/$DB"
fi

source=ssh
file=
yes=
search=1
seeds=1
while [ $# -gt 0 ]; do
  case $1 in
    --nightly) source=nightly ;;
    --file) source=file; file=${2:?--file needs a path}; shift ;;
    --yes) yes=1 ;;
    --no-search) search= ;;
    --no-seeds) seeds= ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

cd "$(dirname "$0")/../.."
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
stamp=$(date -u +%Y-%m-%dT%H%MZ)

# psql against the maintenance database, which stays put while ours is swapped.
psql_local() { docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -q -U "$PG_USER" -d postgres "$@"; }

docker exec "$CONTAINER" pg_isready -q -U "$PG_USER" ||
  { echo "local PostgreSQL ($CONTAINER) is not running: docker compose -f Docker/docker-compose.dev.yml up -d" >&2; exit 1; }

# 1. Get the production dump.
case $source in
  ssh)
    dump="$BACKUP_DIR/prod-$stamp.dump"
    echo "Dumping production over SSH -> $dump"
    ssh -i "$SSH_KEY" -o ConnectTimeout=15 "$VM" \
      'cd chronopin && docker compose -f Docker/docker-compose.prod.yml exec -T postgres sh -c '\''pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner'\''' \
      > "$dump"
    ;;
  nightly)
    blob=$(az storage blob list --subscription "$SUBSCRIPTION" --account-name chronopin -c backups \
      --auth-mode key --query 'sort_by([], &name)[-1].name' -o tsv)
    [ -n "$blob" ] || { echo "no backups in the container" >&2; exit 1; }
    dump="$BACKUP_DIR/prod-${blob#chronopin-}"
    echo "Downloading backups/$blob -> $dump"
    az storage blob download --subscription "$SUBSCRIPTION" --account-name chronopin -c backups \
      --auth-mode key -n "$blob" -f "$dump" --no-progress -o none
    ;;
  file)
    dump=$file
    [ -s "$dump" ] || { echo "$dump is missing or empty" >&2; exit 1; }
    ;;
esac
chmod 600 "$dump" 2>/dev/null || true

# A dump that failed part way is short; reading its whole table of contents catches that.
docker exec -i "$CONTAINER" pg_restore --list < "$dump" > /dev/null ||
  { echo "$dump is not a complete pg_dump archive" >&2; exit 1; }

if [ -z "$yes" ]; then
  printf 'Replace the local "%s" database with %s? [y/N] ' "$DB" "$(basename "$dump")"
  read -r answer
  case $answer in y|Y|yes) ;; *) echo "Left the local database alone."; exit 0 ;; esac
fi

# 2. Keep what is here now.
local_copy="$BACKUP_DIR/local-$stamp.dump"
if [ "$(psql_local -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB'")" = 1 ]; then
  docker exec "$CONTAINER" pg_dump -U "$PG_USER" -d "$DB" --format=custom --no-owner > "$local_copy"
  chmod 600 "$local_copy"
  echo "Local database saved -> $local_copy"
fi

# 3. Restore into a scratch database, then swap it in.
incoming="${DB}_incoming"
psql_local -c "DROP DATABASE IF EXISTS \"$incoming\"" -c "CREATE DATABASE \"$incoming\""
echo "Restoring into $incoming"
docker exec -i "$CONTAINER" pg_restore -U "$PG_USER" -d "$incoming" --no-owner --no-privileges --exit-on-error < "$dump"

# FORCE cuts the dev server's connections; its pool reconnects on its own.
psql_local \
  -c "DROP DATABASE IF EXISTS \"$DB\" WITH (FORCE)" \
  -c "ALTER DATABASE \"$incoming\" RENAME TO \"$DB\"" > /dev/null
echo "Local \"$DB\" is now production as of $(basename "$dump")"

# 4. Schema files this branch has and prod does not yet, then search and the seed files.
npm run --silent create:db
[ -z "$search" ] || npm run --silent search:refresh:db
[ -z "$seeds" ] || npm run --silent backup:data

docker exec "$CONTAINER" psql -U "$PG_USER" -d "$DB" -tAc \
  "SELECT (SELECT count(*) FROM \"Pin\" WHERE \"utcDeletedDateTime\" IS NULL) || ' pins, ' || (SELECT count(*) FROM \"User\" WHERE \"utcDeletedDateTime\" IS NULL) || ' users'"
echo "Done. Sign in with your production password."
