#!/bin/sh
# Deploys the committed code to the production VM (docs/deploy-azure.md):
# `git archive HEAD` rather than the working tree, so work in progress - this
# session's or another's - never reaches production. Applies pending schema
# files, then rebuilds and restarts the app; pass service names to rebuild
# others too (`npm run deploy -- app faiss`).
#
#   npm run deploy
set -eu

HOST=azureuser@20.109.175.187
KEY="$HOME/.ssh/chronopin_azure"
cd "$(dirname "$0")/.."

# The commit is fixed here, as the archive is made: HEAD can move while the
# build runs (another commit, another session), and that is not what went out.
rev=$(git rev-parse --short HEAD)
git diff --quiet HEAD || echo "Note: uncommitted changes are not deployed; deploying $rev."

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git archive "$rev" | tar -x -C "$tmp"

# The VM's env files and the gitignored seed of user accounts live only there.
rsync -az --delete -e "ssh -i $KEY" \
  --exclude 'Docker/env.*.list' --exclude scripts/backup/seedUsers.json \
  "$tmp/" "$HOST:chronopin/"

# Migrations first, from the tools image (the same build stage the app's image
# is made from, so it costs little): new code may read a table a new schema
# file creates, such as PinBaseCache.
services=${*:-app}
ssh -i "$KEY" "$HOST" "cd chronopin && C='docker compose -f Docker/docker-compose.prod.yml' && \$C --profile tools build tools && \$C --profile tools run --rm tools npm run create:db && \$C up -d --build $services"
echo "Deployed $rev."
# Always ship the latest HEAD: a commit made during the build needs another run.
[ "$(git rev-parse --short HEAD)" = "$rev" ] || echo "HEAD is now $(git rev-parse --short HEAD), not $rev - run npm run deploy again."
