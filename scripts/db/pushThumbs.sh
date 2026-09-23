#!/bin/sh
# Copies the thumbnails and avatars the local database uses from Azurite to
# production's public `thumb` container (docs/deploy-azure.md). Pins and seeds
# reach production without their blobs, and a card whose thumb is missing
# falls back to the source's original image, which many sites refuse to serve
# to other domains - so the card shows an empty box. Uploads only the names
# production lacks and never overwrites one. Needs `az login`.
#
#   npm run thumbs:push
set -eu

SUB=9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5
CONTAINER=${PG_CONTAINER:-chronopin-postgres}
DB=${LOCAL_DB:-chronopin}
PG_USER=${LOCAL_PG_USER:-chronopin}
AZURITE=http://127.0.0.1:10000/devstoreaccount1/thumb

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

docker exec "$CONTAINER" psql -U "$PG_USER" -d "$DB" -tAc \
  "SELECT \"thumbName\" FROM \"Medium\" WHERE \"thumbName\" IS NOT NULL
   UNION SELECT \"pictureUrl\" FROM \"User\" WHERE \"pictureUrl\" LIKE 'avatar/%'" |
  sort -u > "$tmp/used"

key=$(az storage account keys list --subscription "$SUB" -n chronopin --query '[0].value' -o tsv)
az storage blob list --account-name chronopin --account-key "$key" -c thumb \
  --num-results '*' --query '[].name' -o tsv | sort -u > "$tmp/prod"

comm -23 "$tmp/used" "$tmp/prod" > "$tmp/missing"
echo "$(wc -l < "$tmp/used" | tr -d ' ') in use, $(wc -l < "$tmp/missing" | tr -d ' ') missing from production."
[ -s "$tmp/missing" ] || exit 0

mkdir "$tmp/blobs"
absent=0
while read -r name; do
  mkdir -p "$tmp/blobs/$(dirname "$name")"
  curl -sf -o "$tmp/blobs/$name" "$AZURITE/$name" || { echo "Not in Azurite either: $name"; absent=$((absent + 1)); }
done < "$tmp/missing"

az storage blob upload-batch --account-name chronopin --account-key "$key" -d thumb \
  -s "$tmp/blobs" --overwrite false --max-connections 16 \
  --content-cache-control 'public, max-age=31536000, immutable' -o none --only-show-errors
echo "Uploaded $(($(wc -l < "$tmp/missing") - absent))."
