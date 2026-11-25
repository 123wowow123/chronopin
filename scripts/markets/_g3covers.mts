import { savePhotosPartial } from '../../src/server/model/pinOutcomePhoto';
import * as db from '../../src/server/db';
const albums: [string, string, string][] = [
  ['Lux', 'Rosalía', 'LUX Rosalía'], ['you seem pretty sad for a girl so in love', 'Olivia Rodrigo', 'you seem pretty sad for a girl so in love Olivia Rodrigo'],
  ['This Music May Contain Hope', 'RAYE', 'THIS MUSIC MAY CONTAIN HOPE RAYE'], ['The Art of Loving', 'Olivia Dean', 'The Art of Loving Olivia Dean'], ['Dandelion', 'Ella Langley', 'Dandelion Ella Langley'],
  ['The Life of a Showgirl', 'Taylor Swift', 'The Life of a Showgirl Taylor Swift'], ['Lost Weekend', 'Phoebe Bridgers', 'Lost Weekend Phoebe Bridgers'], ['The Romantic', 'Bruno Mars', 'The Romantic Bruno Mars'],
];
const rows: any[] = [];
for (const [label, artist, q] of albums) {
  const j: any = await (await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=5`)).json();
  const hit = j.results.find((r: any) => r.artistName.toLowerCase().startsWith(artist.toLowerCase().slice(0, 6)) && r.collectionName.toLowerCase().replace(/[^a-z]/g, '').startsWith(label.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8)));
  if (!hit) { console.log('NO ALBUM', label); continue; }
  console.log(label, '->', hit.collectionName, '|', hit.artistName);
  rows.push({ label, person: `${label} (${hit.artistName})`, kind: 'cover', imageSource: hit.artworkUrl100.replace('100x100bb', '600x600bb'), authorName: `Apple Music / iTunes, ${hit.artistName}`, authorUrl: hit.collectionViewUrl });
}
console.log(1962, JSON.stringify((await savePhotosPartial(1962, rows)).failed));
const games: [string, number, string][] = [['Resident Evil Requiem', 3764200, 'Resident Evil Requiem'], ['Control Resonant', 3669870, 'CONTROL Resonant'], ['Phantom Blade Zero', 4115450, 'Phantom Blade Zero']];
const g = games.map(([label, id, name]) => ({ label, person: name, kind: 'cover' as const, imageSource: `https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_600x900.jpg`, authorName: 'Steam store art', authorUrl: `https://store.steampowered.com/app/${id}` }));
const r = await savePhotosPartial(1961, g); console.log(1961, r.saved.length, JSON.stringify(r.failed));
await db.closeConnection(); process.exit(0);
