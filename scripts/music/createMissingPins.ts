// Creates the prod pins for catalog entries that shared another entry's pin id (ca-2018-1, mx-2017-1),
// as @MusicDesk through the admin pin API, with their wikis attached.
import fs from 'fs';
import path from 'path';
import { buildFields } from './repointProdPins';

const REPO = process.cwd();
const token = fs.readFileSync(path.join(REPO, '.scrape', 'admin.token'), 'utf8').trim();
const catalog: any[] = JSON.parse(fs.readFileSync(path.join(REPO, 'src/lib/musicCatalog.json'), 'utf8'));
const wikis: any[] = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts/music/musicWikis.json'), 'utf8'));
const pinIdsPath = path.join(REPO, 'scripts/music/musicPinIds.json');
const pinIds: Record<string, number> = JSON.parse(fs.readFileSync(pinIdsPath, 'utf8'));

async function main() {
  // A sibling pin of the same desk gives categories/address shape.
  for (const id of ['ca-2018-1', 'mx-2017-1']) {
    const song = catalog.find((c) => c.id === id);
    const f = buildFields(song);
    const body: any = {
      ...f,
      sourceUrl: song.sourceUrl,
      address: song.country,
      allDay: true,
      categories: ['Music'],
      sourceWikis: wikis.filter((w) => w.url === song.sourceUrl),
    };
    const res = await fetch('https://www.chronopin.com/api/admin/pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userName: '@MusicDesk', pins: [body] }),
      signal: AbortSignal.timeout(120000),
    });
    const text = await res.text();
    console.log(id, res.status, text.slice(0, 400));
    const r = JSON.parse(text).results?.[0];
    if (r?.id) pinIds[id] = r.id;
  }
  fs.writeFileSync(pinIdsPath, JSON.stringify(pinIds, null, 2) + '\n');
}
main();
