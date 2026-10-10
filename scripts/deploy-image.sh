#!/bin/sh
# Deploys a commit whose images GitHub Actions built (.github/workflows/
# build-image.yml): the VM pulls them instead of running `next build` beside the
# live site. Postgres, FAISS and Caddy are not touched. Schema files are applied
# only when the commit changed some since the last deploy.
#
#   npm run deploy            deploy HEAD (waits for its build)
#   npm run deploy -- <sha>   deploy or roll back to another commit
#
# (`npm run deploy:image` is the same.) Never builds on the VM.
#
# The GHCR packages must be public (the repository is, and .dockerignore keeps
# secrets out of the image): the VM pulls without a login.
set -eu

HOST=azureuser@20.109.175.187
KEY="$HOME/.ssh/chronopin_azure"
OWNER=123wowow123
cd "$(dirname "$0")/.."
. scripts/deploy-guard.sh

full=$(git rev-parse "${1:-HEAD}")
rev=$(echo "$full" | cut -c1-7)
APP_IMAGE="ghcr.io/$OWNER/chronopin:$full"
TOOLS_IMAGE="ghcr.io/$OWNER/chronopin-tools:$full"

git diff --quiet HEAD || echo "Note: uncommitted changes are not deployed; deploying $rev."
git branch -r --contains "$full" 2>/dev/null | grep -q . || { echo "$rev is not pushed - push it so GitHub builds it."; exit 1; }

# Wait for the build of this commit (needs `gh`; without it the pull below fails
# if the build is not done yet).
if command -v gh >/dev/null 2>&1; then
  run=$(gh run list --workflow build-image.yml --commit "$full" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)
  [ -n "$run" ] || { echo "No Build image run for $rev - push it, or run the workflow by hand."; exit 1; }
  gh run watch "$run" --exit-status
fi

# Compose file, Caddyfile and the faiss/postgis build contexts; the env files
# and Docker/.env (which names the images) stay as they are on the VM.
rsync -az --delete -e "ssh -i $KEY" \
  --inplace --exclude 'env.*.list' --exclude .env \
  Docker/ "$HOST:chronopin/Docker/"

# Schema files changed since the last deployed commit? (Last commit unknown:
# apply, which is harmless.)
prev=$(ssh -i "$KEY" "$HOST" 'cat chronopin/.deployed-sha 2>/dev/null || true')
migrate=1
if [ -n "$prev" ] && git cat-file -e "$prev^{commit}" 2>/dev/null &&
   git diff --quiet "$prev" "$full" -- scripts/db src/server/db; then
  migrate=0
fi

# The site keeps serving throughout (Docker/Caddyfile fails over between `app`
# and the `app-next` standby, retrying up to 15s):
#   1. pull, migrate (schema changes keep the running app working), and start
#      the standby on the new image;
#   2. warm the standby, still without traffic;
#   3. recreate `app` on the new image - the standby serves meanwhile;
#   4. warm `app`, stop the standby.
# Docker/.env keeps APP_IMAGE for any later `docker compose up` by hand, which
# would otherwise fall back to the old locally built chronopin:latest.
# The Caddyfile is bind-mounted, so rsync --inplace keeps its inode and the
# reload sees the change.
C='docker compose -f Docker/docker-compose.prod.yml'
WAIT='n=0; until curl -fsS -o /dev/null -m 10 "http://$ip:9000/"; do n=$((n+1)); [ $n -ge 60 ] && { echo "$ip never answered"; exit 1; }; sleep 3; done'
IP='$(docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" $($C ps -q SVC))'

ipof() { printf '%s' "$IP" | sed "s/SVC/$1/"; }

ssh -i "$KEY" "$HOST" "set -eu; cd chronopin
# Make room before extracting new layers. A failed pull never reaches the
# cleanup at the end; retaining a day's unused images can fill this 30GB disk.
# Images referenced by containers are preserved; volumes are never pruned.
docker image prune -af >/dev/null
df -h / | tail -1
printf 'APP_IMAGE=%s\nTOOLS_IMAGE=%s\n' '$APP_IMAGE' '$TOOLS_IMAGE' > Docker/.env
C='$C'
\$C pull app
if [ $migrate = 1 ]; then \$C --profile tools pull tools && \$C --profile tools run --rm tools npm run create:db; fi
docker exec docker-caddy-1 caddy validate --config /etc/caddy/Caddyfile >/dev/null
docker exec docker-caddy-1 caddy reload --config /etc/caddy/Caddyfile
\$C --profile next up -d --no-build app-next
ip=$(ipof app-next); $WAIT
echo \$ip > .standby-ip"
warm() { ssh -i "$KEY" "$HOST" "sh -s http://$(ssh -i "$KEY" "$HOST" "cat chronopin/$1"):9000" < scripts/warm.sh || true; }
warm .standby-ip

ssh -i "$KEY" "$HOST" "set -eu; cd chronopin
C='$C'
\$C up -d --no-build app
ip=$(ipof app); $WAIT
echo \$ip > .app-ip"
warm .app-ip

ssh -i "$KEY" "$HOST" "set -eu; cd chronopin
C='$C'
\$C --profile next stop app-next
\$C --profile next rm -f app-next >/dev/null
echo $full > .deployed-sha
docker image prune -af >/dev/null
df -h / | tail -1"
echo "Deployed $rev."
