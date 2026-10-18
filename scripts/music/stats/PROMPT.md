You research published chart and sales statistics for songs and their albums. Input: /Users/ianflynn/chronopin/scripts/music/stats/input-N.json (one entry per song: id, artist, title, year, chart, chartCountry, album, albumKind, weeksAtNumberOne, sourceUrl). Output: write /Users/ianflynn/chronopin/scripts/music/stats/output-N.json, an object keyed by entry id:

{ "<id>": {
   "song": { "peak": <int|null>, "weeksOnChart": <int|null>, "weeksAtNumberOne": <int|null>, "chart": "<the weekly/primary chart these numbers are from, e.g. Billboard Hot 100>", "sourceUrl": "<opened https url>", "asOf": "YYYY-MM-DD" },
   "album": { "certifications": [ { "body": "RIAA", "level": "3× Platinum", "region": "US", "date": "YYYY-MM-DD|null" } ],
              "units": "<sourced figure with unit type, e.g. '1.2 million album-equivalent units (US, Luminate, 2025)' or null>",
              "peak": { "chart": "Billboard 200", "position": 1 } | null,
              "sourceUrl": "<opened https url>" } | null,
   "notes": "<what could not be found and sources checked>" } }

Rules:
- Only published figures you opened and read (Wikipedia chart/certification tables, Billboard, Official Charts, Oricon, Circle, Recorded Music NZ, ARIA, IFPI/regional certification databases, label press). Use null (never guess, never estimate) when a number is unpublished. Dollar/unit claims need the source named.
- song.* are for the song on the SAME chart named in `chart` where possible (peak position on that chart, total weeks charted, weeks at #1); if only another chart for that country is published, name it in song.chart. Do not mix charts within one entry. weeksAtNumberOne: keep the input value if given and consistent with your source; flag disagreement in notes.
- album: the album named in `album` (skip with null if album is null, or if albumKind is single and no sales info exists). Certifications for the album itself, not the single. Regional certifications by the chart's country first, then major markets (US RIAA, UK BPI, etc).
- Search beyond the first link; this is a high-search-budget task: dozens of searches/fetches are expected. Entries repeat across years (same song on several charts); research each chart separately.
- Do not modify any other file. Write the output JSON file when finished (also write partial progress every ~10 entries). Final reply: counts of entries with song stats, with album stats, and the main gaps.
