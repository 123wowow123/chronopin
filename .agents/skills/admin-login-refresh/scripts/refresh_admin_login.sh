#!/bin/bash
# Refresh the admin tokens used by the job and rubric scripts.
#   prod  -> .scrape/admin.token        (https://www.chronopin.com)
#   local -> .scrape/admin-local.token  (http://localhost:3000)
# Usage: refresh_admin_login.sh [prod|local|both]   (default: both)
# Reads ADMIN_PASSWORD from .env.local. Never prints the token or the password.
set -u
cd "$(dirname "$0")/../../../.." || exit 1
EMAIL="flynni2008@gmail.com"
set -a; [ -f .env.local ] && . ./.env.local; set +a
if [ -z "${ADMIN_PASSWORD:-}" ]; then echo "ADMIN_PASSWORD is not set in .env.local" >&2; exit 2; fi
mkdir -p .scrape; umask 077

refresh() { # name base file
  local name=$1 base=$2 file=$3 tok
  # The token arrives in the Set-Cookie header, not the JSON body.
  tok=$(curl -s -m 20 -D - -o /dev/null -X POST -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" "$base/auth/local" \
    | tr -d '\r' | sed -n 's/^[Ss]et-[Cc]ookie: token=\([^;]*\);.*/\1/p' | head -1)
  if [ -z "$tok" ]; then echo "$name: sign-in failed (server down, wrong password or rate limited)" >&2; return 1; fi
  printf %s "$tok" > "$file"
  # Verify with an authenticated call that needs admin.
  local code
  code=$(curl -s -m 20 -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $tok" "$base/api/admin/db")
  echo "$name: token saved to $file (admin check HTTP $code)"
}

case "${1:-both}" in
  prod)  refresh prod  https://www.chronopin.com .scrape/admin.token ;;
  local) refresh local http://localhost:3000 .scrape/admin-local.token ;;
  both)  refresh prod  https://www.chronopin.com .scrape/admin.token; refresh local http://localhost:3000 .scrape/admin-local.token ;;
  *) echo "usage: $0 [prod|local|both]" >&2; exit 64 ;;
esac
