#!/bin/sh
# Nightly database backup on the production VM (docs/deploy-azure.md): a
# pg_dump in PostgreSQL's custom format (compressed, and what pg_restore
# reads) uploaded to the private `backups` container of the `chronopin`
# storage account. The account deletes copies older than 14 days itself (a
# lifecycle rule), so nothing here prunes.
#
# Docker/env.backup.list on the VM holds BACKUP_CONTAINER_URL: the container's
# URL with a SAS token that may only create and write blobs - it cannot read,
# list or delete them, so a leaked copy can add files but never take the
# backups. It expires; the deploy doc says how to make a new one.
#
# cron runs it daily (crontab -l on the VM); `sh Docker/backup.sh` runs it now.
set -eu

cd "$(dirname "$0")/.."
. ./Docker/env.backup.list

stamp=$(date -u +%Y-%m-%dT%H%MZ)
dump=$(mktemp /tmp/chronopin-backup.XXXXXX)
trap 'rm -f "$dump"' EXIT

docker compose -f Docker/docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' > "$dump"

# A dump that failed part way is short; pg_restore --list reads its whole table of contents.
docker compose -f Docker/docker-compose.prod.yml exec -T postgres pg_restore --list < "$dump" > /dev/null

container=${BACKUP_CONTAINER_URL%%\?*}
sas=${BACKUP_CONTAINER_URL#*\?}
blob="chronopin-$stamp.dump"
curl -fsS -X PUT -H "x-ms-blob-type: BlockBlob" -H "Content-Type: application/octet-stream" \
  --data-binary @"$dump" "$container/$blob?$sas"

echo "$(date -u +%FT%TZ) uploaded backups/$blob ($(wc -c < "$dump") bytes)"
