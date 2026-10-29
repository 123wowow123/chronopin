#!/bin/sh
# Rolls the search service (Docker/faiss) to an image GitHub Actions built
# (.github/workflows/build-faiss-image.yml). Not part of `npm run deploy`: the
# service changes rarely (a model, app.py), so most deploys leave it running.
#
#   npm run deploy:faiss            roll HEAD's image
#   npm run deploy:faiss -- <sha>   roll another commit's image (a rollback)
#
# Never builds on the VM. The container restarts (searches fail for a few
# seconds). The index persists on the faiss-data volume, so it is refilled
# from the live pins (`search:index:db`) only when a space comes up empty, as
# after a model change; searches in other languages then find little until it
# finishes. Run it at a quiet hour.
set -eu

HOST=azureuser@20.109.175.187
KEY="$HOME/.ssh/chronopin_azure"
OWNER=123wowow123
cd "$(dirname "$0")/.."
. scripts/deploy-guard.sh

full=$(git rev-parse "${1:-HEAD}")
rev=$(echo "$full" | cut -c1-7)
IMAGE="ghcr.io/$OWNER/chronopin-faiss:$full"

if command -v gh >/dev/null 2>&1; then
  run=$(gh run list --workflow build-faiss-image.yml --commit "$full" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)
  [ -n "$run" ] || { echo "No Build faiss image run for $rev: it builds only when Docker/faiss changed in that commit; run the workflow by hand for an older one."; exit 1; }
  gh run watch "$run" --exit-status
fi

C='docker compose -f Docker/docker-compose.prod.yml'
rsync -az --inplace -e "ssh -i $KEY" Docker/docker-compose.prod.yml "$HOST:chronopin/Docker/"
ssh -i "$KEY" "$HOST" "set -eu; cd chronopin
grep -v '^FAISS_IMAGE=' Docker/.env > Docker/.env.new 2>/dev/null || true
echo 'FAISS_IMAGE=$IMAGE' >> Docker/.env.new && mv Docker/.env.new Docker/.env
$C pull faiss
$C up -d --no-build faiss
n=0; until $C exec -T faiss python -c \"import urllib.request;urllib.request.urlopen('http://localhost:5050/health')\" 2>/dev/null; do n=\$((n+1)); [ \$n -ge 60 ] && { echo 'faiss never answered'; exit 1; }; sleep 3; done
h=\$($C exec -T faiss python -c \"import urllib.request;print(urllib.request.urlopen('http://localhost:5050/health').read().decode())\")
echo \"\$h\"
# The index lives on the faiss-data volume and survives a restart; reindex only
# when a space is empty (a new model gets a new, empty index file).
case \"\$h\" in *'\"count\": 0'*|*'\"count\":0'*) $C --profile tools run --rm tools npm run search:index:db;; *) echo 'Index intact; not reindexing.';; esac
docker image prune -f >/dev/null"
echo "Rolled faiss to $rev."
