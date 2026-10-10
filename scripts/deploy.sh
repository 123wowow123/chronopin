#!/bin/sh
# Deploys the committed code to the production VM (docs/deploy-azure.md):
# `git archive HEAD` rather than the working tree, so work in progress - this
# session's or another's - never reaches production. Applies pending schema
# files, then rebuilds and restarts the app; pass service names to rebuild
# others too (`DEPLOY_ON_VM=1 npm run deploy:vm -- app faiss`).
#
# It never resizes the VM (owner, 2026-10-03): the size it has is the size it
# keeps. `next build` alone holds 1.3GB, so on a 4GB VM (Standard_B2s) it swaps
# beside the live site; resize by hand first if that matters (docs/deploy-azure.md).
#
# This builds on the VM beside the live site, which swaps and 502s for the
# length of the build. `npm run deploy` is scripts/deploy-image.sh (GitHub
# builds, the VM pulls); this is the fallback for when that cannot work, and
# must be asked for: DEPLOY_ON_VM=1 npm run deploy:vm
set -eu

HOST=azureuser@20.109.175.187
KEY="$HOME/.ssh/chronopin_azure"
cd "$(dirname "$0")/.."

if [ "${DEPLOY_ON_VM:-}" != 1 ]; then
  echo "This builds on the live VM and takes the site down for minutes." >&2
  echo "Use 'npm run deploy' (GitHub builds the image). If you really mean it: DEPLOY_ON_VM=1 npm run deploy:vm" >&2
  exit 1
fi
. scripts/deploy-guard.sh

# The commit is fixed here, as the archive is made: HEAD can move while the
# build runs (another commit, another session), and that is not what went out.
rev=$(git rev-parse --short HEAD)
git diff --quiet HEAD || echo "Note: uncommitted changes are not deployed; deploying $rev."

tmp=$(mktemp -d)
trap 'rm -rf "$tmp" "$lock"' EXIT
git archive "$rev" | tar -x -C "$tmp"

# The VM's env files and the gitignored seed of user accounts live only there.
rsync -az --delete -e "ssh -i $KEY" \
  --exclude 'Docker/env.*.list' --exclude Docker/.env --exclude .deployed-sha \
  --exclude scripts/backup/seedUsers.json \
  "$tmp/" "$HOST:chronopin/"

# Disk first: a failed deploy (2026-10-07, "no space left on device" while
# building) left the disk too full for the next build to start, so room is made
# before building as well as after. Images no container uses are dropped (the
# running containers' images stay), and the build cache is cut to 4GB, least
# recently used first, which keeps the npm and Turbopack caches the next build
# reads: they had filled 14GB of the VM's 30GB disk, and every deploy had used
# them. Volumes are never pruned (the database lives in one). A failed prune
# does not stop the deploy.
CLEAN="docker image prune -af >/dev/null; docker builder prune -f --max-used-space 4gb >/dev/null"

# Migrations next, from the tools image (the same build stage the app's image
# is made from, so it costs little): new code may read a table a new schema
# file creates, such as PinBaseCache.
services=${*:-app}
ssh -i "$KEY" "$HOST" "$CLEAN; df -h / | tail -1; cd chronopin && C='docker compose -f Docker/docker-compose.prod.yml' && \$C --profile tools build tools && \$C --profile tools run --rm tools npm run create:db && \$C up -d --build $services && $CLEAN; df -h / | tail -1"
echo "Deployed $rev."
# A restart empties the caches, and a visitor would pay for each cold one.
sh scripts/warm.sh || true
# Always ship the latest HEAD: a commit made during the build needs another run.
[ "$(git rev-parse --short HEAD)" = "$rev" ] || echo "HEAD is now $(git rev-parse --short HEAD), not $rev - run npm run deploy again."
