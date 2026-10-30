// Reviewed volcanic-eruption pins. GDACS only says "orange alert, date" for a
// volcano, so these are written by hand from the agency's own advisories as
// reported by news outlets, with only the facts the pages state; an eruption
// with no report found (Taal, 8 October 2026) is not pinned. Each pin cites its
// sources as references and carries NASA Worldview true-colour pictures when the
// day is clear enough to show anything (Kanlaon's 10 October passes were all
// cloud, so that pin has none).
//
//   npx tsx scripts/events/volcanoes.ts --dry
//   npx tsx scripts/events/volcanoes.ts
//
// Posts as @QuakeDesk through POST /api/admin/db/Pin (admin token); a pin
// already there is refused by the duplicate-sourceUrl check.

import '../env';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false }, base: { type: 'string', default: 'https://www.chronopin.com' } } });
const BASE = flags.base!.replace(/\/$/, '');

const worldview = (day: string, lat: number, lon: number, half: number) =>
  `https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&LAYERS=VIIRS_SNPP_CorrectedReflectance_TrueColor&CRS=EPSG:4326&TIME=${day}&BBOX=${[lat - half, lon - half, lat + half, lon + half].map((n) => n.toFixed(2)).join(',')}&FORMAT=image/jpeg&WIDTH=1024&HEIGHT=1024`;

const ref = (url: string, title: string, publishedDate: string, reasoning: string, confidence = 85) => ({ url, title, confidence, publishedDate, reasoning });

const PINS = [
  {
    title: 'Kanlaon erupts explosively on 10 October 2026, sending ash 5 to 6 km above Negros Island',
    description:
      'Kanlaon Volcano on Negros Island in the Philippines had a moderately explosive eruption on Saturday 10 October 2026. PHIVOLCS recorded it from shortly before 12:30 pm to 12:48 pm local time (one news report gave 12:46 pm and a two-minute seismic signal). The Manila-based Daily Tribune reported an ash plume 5 to 6 km above the summit crater drifting north-northeast, and the Kanlaon Volcano Observatory reported ongoing ash emission that afternoon. PHIVOLCS kept Alert Level 2, which signals increasing unrest, and barred entry to the 6 km Permanent Danger Zone; the national disaster agency urged residents of Negros Occidental and Negros Oriental to take ashfall precautions, and local governments told residents to stay alert. Earlier in 2026 the volcano had a moderately explosive eruption on 19 February (a 2,000 m plume, pyroclastic flows and light to moderate ashfall in 41 barangays), and Wikipedia\'s chronology counts the 10 October eruption as the ninth major one since June 2024. The reports read do not state evacuations or how far the ash fell.',
    sourceUrl: 'https://www.thestar.com.my/aseanplus/aseanplus-news/2026/10/10/mt-kanlaon-in-philippines-erupts-sending-ash-plume-above-summit',
    address: 'Kanlaon Volcano, Negros Island, Philippines',
    latitude: 10.4096,
    longitude: 123.13,
    utcStartDateTime: '2026-10-10T04:30:00Z',
    utcEndDateTime: '2026-10-10T04:48:00Z',
    dateConfidenceReasoning: "The day is certain; PHIVOLCS's advisory gives the eruption as starting shortly before 12:30 pm and ending at 12:48 pm Philippine time (04:30 to 04:48 UTC), and one report gives 12:46 pm, so the minute is approximate.",
    media: [] as { type: number; originalUrl: string }[],
    references: [
      ref('https://tribune.net.ph/2026/10/10/kanlaon-erupts-sends-ash-plume-6-kms-high', 'Kanlaon erupts, sends ash plume 6 kms high (Daily Tribune)', '2026-10-10', 'Source of the 5 to 6 km plume height, drift direction and observatory ash-emission report.'),
      ref('https://en.wikipedia.org/wiki/2024%E2%80%932026_Kanlaon_eruptions', '2024-2026 Kanlaon eruptions (Wikipedia)', '2026-10-10', "Chronology of the eruptions since June 2024, including the 19 February 2026 details and the count of major eruptions.", 70),
      ref('https://www.gdacs.org/report.aspx?eventid=1000152&eventtype=VO', 'GDACS: Orange alert, eruption Kanlaon', '2026-10-10', 'The UN/EU disaster alert system rated the eruption orange.', 80),
      ref('https://volcano.si.edu/volcano.cfm?vn=272020', 'Kanlaon, Global Volcanism Program (Smithsonian)', '2026-10-10', 'Reference record for the volcano and its eruption history.', 80),
    ],
  },
  {
    title: 'Anak Krakatau erupts for about 25 hours straight from 4 September 2026',
    description:
      'Anak Krakatau, the volcano in the Sunda Strait between Java and Sumatra, erupted continuously for about 25 hours from 11:07 pm local time on Friday 4 September 2026, subsiding shortly after midnight on Sunday, according to PVMBG, Indonesia\'s volcanology agency, as reported by The Star. It then erupted three times on Tuesday 8 September and again at 12:47 am on Wednesday 9 September, for 28 seconds; BMKG\'s analysis of Himawari-9 satellite imagery showed ash up to 7,000 feet (about 2,134 m) drifting northwest over part of Lampung Bay. The volcano is at Level III of Indonesia\'s four-level scale, and authorities warned that the potential for more eruptions remains high; the report says recent eruptions disrupted air travel across parts of western Indonesia. The NASA satellite pictures from 4, 5 and 6 September show the lead-up, a long brown ash plume streaming west from the volcano on the 5th, and the haze that remained afterwards.',
    sourceUrl: 'https://www.thestar.com.my/aseanplus/aseanplus-news/2026/09/09/indonesia039s-anak-krakatau-erupts-again-ash-spreads-over-part-of-lampung-bay',
    address: 'Anak Krakatau, Sunda Strait, Indonesia',
    latitude: -6.102,
    longitude: 105.423,
    utcStartDateTime: '2026-09-04T16:07:00Z',
    utcEndDateTime: '2026-09-05T17:10:00Z',
    dateConfidenceReasoning: "The start is PVMBG's 11:07 pm Western Indonesia Time on Friday 4 September (16:07 UTC); the continuous phase lasted about 25 hours and subsided shortly after midnight on Sunday, so the end is approximate. Eruptions on 8 and 9 September are described in the text.",
    media: [
      { type: 1, originalUrl: worldview('2026-09-04', -6.102, 105.423, 1.5) },
      { type: 1, originalUrl: worldview('2026-09-05', -6.102, 105.423, 1.5) },
      { type: 1, originalUrl: worldview('2026-09-06', -6.102, 105.423, 1.5) },
    ],
    references: [
      ref('https://www.gdacs.org/report.aspx?eventid=1000148&eventtype=VO', 'GDACS: Orange alert, eruption Krakatau', '2026-09-04', 'The UN/EU disaster alert system rated the eruption orange.', 80),
    ],
  },
];

async function main() {
  for (const p of PINS) console.log(`${p.utcStartDateTime.slice(0, 10)} ${p.title} (${p.media.length} pictures, ${p.references.length} references)`);
  if (flags.dry) return;
  const file = path.resolve('.scrape/admin.token');
  if (!existsSync(file)) throw new Error('No admin token');
  const body = PINS.map((p) => ({ ...p, allDay: false, dateConfidence: 'confirmed', categories: ['Disaster'], userName: 'QuakeDesk' }));
  const res = await fetch(`${BASE}/api/admin/db/Pin`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${readFileSync(file, 'utf8').trim()}` }, body: JSON.stringify(body) });
  const data = (await res.json()) as { results?: { index: number; id?: number; error?: string }[] };
  for (const r of data.results ?? []) console.log(r.id ? `pin ${r.id} <- ${PINS[r.index].title}` : `failed ${PINS[r.index].title}: ${String(r.error).slice(0, 200)}`);
}

main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
