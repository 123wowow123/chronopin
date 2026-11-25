import { photoGaps } from '../../src/server/jobs/outcomePhotos';
import { writeFileSync } from 'node:fs';
const S = '/private/tmp/claude-501/-Users-ianflynn-chronopin/31fd055b-9952-4af9-a872-c38d0e16a57a/scratchpad';
const people = [1950,1969,1976,1951,21161,21430,20722,5173,19425,1974,1965,1959,21236];
for (const kind of ['logo','cover'] as const) {
  const { gaps } = await photoGaps(80, people, kind);
  writeFileSync(`${S}/gaps_${kind}.json`, JSON.stringify(gaps, null, 1));
  for (const g of gaps) console.log(kind, g.pinId, g.market.slice(0,50), '|', g.missing.map((m) => m.label).join('; '));
}
process.exit(0);
