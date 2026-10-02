#!/bin/sh
# Deploys the committed code to the production VM (docs/deploy-azure.md):
# `git archive HEAD` rather than the working tree, so work in progress - this
# session's or another's - never reaches production. Applies pending schema
# files, then rebuilds and restarts the app; pass service names to rebuild
# others too (`npm run deploy -- app faiss`).
#
# The VM (Standard_B2s, 4GB) serves traffic and cannot also build: `next build`
# alone holds 1.3GB and the box swaps for an hour. So the deploy resizes it to
# Standard_B2ms (8GB) first if it is smaller, a restart of a minute or two of
# downtime (the containers restart themselves). It is not resized back
# afterwards (owner, 2026-10-02): the VM stays on B2ms, so only the first deploy
# after a manual shrink pays that downtime. Mind the $50 cap on the subscription.
# `DEPLOY_NO_RESIZE=1` skips the resize.
#
#   npm run deploy
set -eu

HOST=azureuser@20.109.175.187
KEY="$HOME/.ssh/chronopin_azure"
SUB=9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5
RG=Chronopin-US-West
VM=chronopin-web
BIG=Standard_B2ms
cd "$(dirname "$0")/.."

resize() {
  az vm resize --subscription "$SUB" -g "$RG" -n "$VM" --size "$1" >/dev/null
  until ssh -i "$KEY" -o ConnectTimeout=5 -o BatchMode=yes "$HOST" true 2>/dev/null; do sleep 5; done
}

# The commit is fixed here, as the archive is made: HEAD can move while the
# build runs (another commit, another session), and that is not what went out.
rev=$(git rev-parse --short HEAD)
git diff --quiet HEAD || echo "Note: uncommitted changes are not deployed; deploying $rev."

# Fail before touching anything when `az` is not logged in (`az login`).
if [ -z "${DEPLOY_NO_RESIZE:-}" ]; then
  size=$(az vm show --subscription "$SUB" -g "$RG" -n "$VM" --query hardwareProfile.vmSize -o tsv)
  if [ "$size" != "$BIG" ]; then
    echo "Resizing $VM from $size to $BIG for the build..."
    resize "$BIG"
  fi
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git archive "$rev" | tar -x -C "$tmp"

# The VM's env files and the gitignored seed of user accounts live only there.
rsync -az --delete -e "ssh -i $KEY" \
  --exclude 'Docker/env.*.list' --exclude scripts/backup/seedUsers.json \
  "$tmp/" "$HOST:chronopin/"

# Migrations first, from the tools image (the same build stage the app's image
# is made from, so it costs little): new code may read a table a new schema
# file creates, such as PinBaseCache. Afterwards, the images each build leaves
# untagged are dropped, and the build cache is cut to 4GB, least recently used
# first, which keeps the npm and Turbopack caches the next build reads: they
# had filled 14GB of the VM's 30GB disk, and every deploy had used them.
services=${*:-app}
ssh -i "$KEY" "$HOST" "cd chronopin && C='docker compose -f Docker/docker-compose.prod.yml' && \$C --profile tools build tools && \$C --profile tools run --rm tools npm run create:db && \$C up -d --build $services && docker image prune -f >/dev/null && docker builder prune -f --max-used-space 4gb >/dev/null"
echo "Deployed $rev."
# Always ship the latest HEAD: a commit made during the build needs another run.
[ "$(git rev-parse --short HEAD)" = "$rev" ] || echo "HEAD is now $(git rev-parse --short HEAD), not $rev - run npm run deploy again."
