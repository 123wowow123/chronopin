# Sourced by scripts/deploy.sh and scripts/deploy-image.sh, before they touch
# the VM. A deploy is outward-facing and a build on the 2-vCPU VM takes the
# site down for minutes (2026-10-10: an editor agent started one nobody had
# asked for, and the live app swapped for 15 minutes), so:
#
#   - a person at a terminal runs it; a non-interactive shell (an agent, CI, a
#     background task) is refused unless DEPLOY_CONFIRMED=1 is set, which an
#     agent may do only when the user has asked for this deploy in words;
#   - two deploys never overlap: a local lock, and a check that the VM is not
#     already building.
#
# Expects HOST and KEY to be set.

if [ ! -t 0 ] && [ "${DEPLOY_CONFIRMED:-}" != 1 ]; then
  echo "Refusing to deploy from a non-interactive shell." >&2
  echo "Run it from a terminal, or set DEPLOY_CONFIRMED=1 if the owner asked for this deploy." >&2
  exit 1
fi

lock="${TMPDIR:-/tmp}/chronopin-deploy.lock"
if ! mkdir "$lock" 2>/dev/null; then
  old=$(cat "$lock/pid" 2>/dev/null || true)
  if [ -n "$old" ] && kill -0 "$old" 2>/dev/null; then
    echo "A deploy is already running (pid $old)." >&2
    exit 1
  fi
  rm -rf "$lock"
  mkdir "$lock"
fi
echo $$ > "$lock/pid"
trap 'rm -rf "$lock"' EXIT INT TERM

# [n]ext-build: the brackets keep pgrep from matching this very command line.
if ssh -n -i "$KEY" -o ConnectTimeout=15 "$HOST" 'pgrep -f "[n]ext-build|compose.* [b]uild|[b]uildx bake" >/dev/null'; then
  echo "The VM is already building something (another deploy?). Wait for it to finish." >&2
  exit 1
fi
