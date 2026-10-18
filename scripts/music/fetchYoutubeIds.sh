#!/usr/bin/env bash
set -e

OUT="scripts/music/musicYoutubeMap.json"
echo "{" > "$OUT"

node -e '
import("./src/lib/music.ts").then(({ SEED_MUSIC_RANKINGS }) => {
  for (const s of SEED_MUSIC_RANKINGS) {
    const cleanTitle = s.title.replace(/\([^)]*\)/g, "").trim();
    const cleanArtist = s.artist.replace(/&/g, " ").replace(/ft\..*/i, "").trim();
    console.log(`${s.id}\t${cleanArtist} ${cleanTitle} official video`);
  }
});
' | while IFS=$'\t' read -r id query; do
  encoded=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$query")
  
  vid=$(curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" \
    -H "Accept-Language: en-US,en;q=0.9" \
    "https://www.youtube.com/results?search_query=$encoded" | grep -o 'watch?v=[a-zA-Z0-9_-]\{11\}' | head -n 1 | cut -d= -f2 || true)

  if [ -n "$vid" ]; then
    echo "  \"$id\": { \"youtubeId\": \"$vid\", \"youtubeUrl\": \"https://www.youtube.com/watch?v=$vid\" }," >> "$OUT"
    echo "[$id] Found: $vid for $query"
  else
    echo "[$id] MISSING for $query"
  fi
  sleep 0.8
done

# Fix trailing comma and close JSON
sed -i '' -e '$ s/,$//' "$OUT" 2>/dev/null || sed -i '$ s/,$//' "$OUT"
echo "}" >> "$OUT"

echo "Completed writing $OUT"

