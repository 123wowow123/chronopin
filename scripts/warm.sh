#!/bin/sh
# Fills the production caches a restart empties, one request at a time so the
# warm-up never competes with visitors: the tag cloud's counts for the
# timeline and for the broadest searches (a cold count was 20s before 0145,
# and each distinct search misses on its own), then the pages most visitors
# land on. Runs at the end of a deploy; `npm run warm` runs it alone.
#
#   npm run warm [-- https://www.chronopin.com]
set -u

BASE=${1:-https://www.chronopin.com}

# Waits for the new app to answer (up to ~2 minutes), as the restart is brief.
i=0
until curl -fsS -o /dev/null -m 10 "$BASE/"; do
  i=$((i + 1))
  [ "$i" -ge 24 ] && { echo "Warm-up skipped: $BASE is not answering."; exit 0; }
  sleep 5
done

hit() {
  code=$(curl -s -o /dev/null -m 120 -w '%{http_code} %{time_total}s' "$BASE$1")
  echo "$code $1"
}

hit /api/pins/tag-counts
for within in 1d 1w 1m; do hit "/api/pins/tag-counts?created_within=$within"; done
for q in anime movie game restaurant music sports tv; do
  hit "/api/pins/tag-counts?q=$q"
done
hit /
hit /search
echo "Warm-up done."
