// Gap pass 2026-11-25: Wikipedia infobox images (non-free logos, posters, covers) + iTunes single art. No licence filter.
import { outcomePhotosForPin, outcomeKey, savePhotosPartial, type PhotoInput } from '../../src/server/model/pinOutcomePhoto';
import * as db from '../../src/server/db';
import { readFileSync } from 'node:fs';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const up = (u: string) => u.replace('https://thumb.wikimedia.org/', 'https://upload.wikimedia.org/').split('?')[0];
const big = (u: string) => { const m = u.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/(?:commons|en))\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/i); return m && !/\.svg$/i.test(m[3]) ? `${m[1]}/thumb/${m[2]}/${m[3]}/1280px-${m[3]}` : u; };
const wp = (pinIds: number[], label: string, kind: PhotoInput['kind'], page: string, src: string, person = label) => pinIds.map((pinId) => ({ pinId, row: { label, person, kind, imageSource: up(src), authorName: `Wikipedia, ${page.replace(/_/g, ' ')} (infobox image)`, authorUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}` } as PhotoInput }));
const T = 'https://thumb.wikimedia.org/wikipedia/';
const jobs = [
  ...wp([1989, 1990], 'Grok', 'logo', 'Grok (chatbot)', T + 'commons/f/f7/Grok-feb-2025-logo.svg', 'Grok (xAI)'),
  ...wp([1989, 1990], 'Kimi', 'logo', 'Kimi (AI)', T + 'en/8/87/Kimi-logo-2025.png', 'Kimi (Moonshot AI)'),
  ...wp([1989, 1990], 'Muse', 'logo', 'Muse (language model)', T + 'commons/8/88/Muse_icon.svg', 'Muse (Meta)'),
  ...wp([20769], 'National Party', 'logo', 'New Zealand National Party', T + 'en/0/0a/New_Zealand_National_Party_logo.png'),
  ...wp([20769], 'Green Party', 'logo', 'Green Party of Aotearoa New Zealand', T + 'commons/d/d3/Green_Party_of_Aotearoa_New_Zealand_logo.svg'),
  ...wp([20769], 'ACT New Zealand', 'logo', 'ACT New Zealand', T + 'commons/0/01/Logo_of_the_ACT_New_Zealand.svg'),
  ...wp([20769], 'Te Pāti Māori', 'logo', 'Te Pāti Māori', T + 'en/e/e8/Te_P%C4%81ti_M%C4%81ori_logo.svg'),
  ...wp([2357], 'Morena', 'logo', 'Morena (political party)', T + 'commons/3/38/Morena_Party_%28Mexico%29.svg'),
  ...wp([2357], 'PT', 'logo', 'Labor Party (Mexico)', T + 'commons/e/e7/Worker%27s_Party_logo_%28Mexico%29.svg', 'Labor Party (PT)'),
  ...wp([20116], 'JPMorgan Chase', 'logo', 'JPMorgan Chase', T + 'commons/c/c9/Logo_of_JPMorganChase_2024.svg'),
  ...wp([20116], 'Morgan Stanley', 'logo', 'Morgan Stanley', T + 'commons/e/ec/Morgan_Stanley_Logo_2024.svg'),
  ...wp([1979], 'Liberal Party', 'logo', 'Liberal Party of Canada', T + 'en/8/89/Liberal_Party_of_Canada_Logo_2014.svg', 'Liberal Party of Canada'),
  ...wp([1979], 'Conservative Party', 'logo', 'Conservative Party of Canada', T + 'commons/2/2d/Logo_of_the_Conservative_Party_of_Canada_%282023%E2%80%93present%29.svg', 'Conservative Party of Canada'),
  ...wp([1962], 'Lux', 'cover', 'Lux (Rosalía album)', T + 'en/a/a1/Rosal%C3%ADa_%E2%80%93_Lux_%28album_cover%29.png', 'Lux — Rosalía'),
  ...wp([1965], 'Drake', 'person', 'Drake (musician)', T + 'commons/1/15/Drake_at_The_Carter_Effect_2017_%2836818935200%29_%28cropped%29.jpg'),
  ...wp([1949, 1964], 'The Odyssey', 'cover', 'The Odyssey (2026 film)', T + 'en/9/90/The_Odyssey_%282026_film%29_poster.jpg'),
  ...wp([1949], 'You Can See Everything', 'cover', 'You Can See Everything', T + 'en/9/9d/You_Can_See_Everything_poster.jpeg'),
  ...wp([1949], 'Dune: Part Three', 'cover', 'Dune: Part Three', T + 'en/7/7b/Dune_Part_Three_poster.jpg'),
  ...wp([1949], 'The Black Ball', 'cover', 'La bola negra', T + 'en/1/15/La_Bola_Negra_Teaser.jpg'),
  ...wp([1949], 'Wild Horse Nine', 'cover', 'Wild Horse Nine', T + 'en/4/44/Wild_Horse_Nine_poster.jpeg'),
  ...wp([1949], 'The Invite', 'cover', 'The Invite', T + 'en/f/f9/The_Invite_poster.jpg'),
  ...wp([1949], 'Digger', 'cover', 'Digger (2026 film)', T + 'en/7/7b/Digger_%282026_film%29_poster.jpg'),
  ...wp([1949], 'Project Hail Mary', 'cover', 'Project Hail Mary (film)', T + 'en/3/3b/Project_Hail_Mary_poster.jpg'),
  ...wp([1949], 'Disclosure Day', 'cover', 'Disclosure Day', T + 'en/c/c3/Disclosure_Day_poster.jpg'),
  ...wp([1949], 'Fjord', 'cover', 'Fjord (film)', T + 'en/f/f2/Fjord_%282026%29_Theatrical_Release_Poster.jpg'),
  ...wp([1964], 'Spider-Man: Brand New Day', 'cover', 'Spider-Man: Brand New Day', T + 'en/9/9a/Spider-Man_Brand_New_Day_poster.jpg'),
  ...wp([1964], 'Avengers: Doomsday', 'cover', 'Avengers: Doomsday', T + 'en/e/ee/Avengers_Doomsday_poster.jpg'),
  ...wp([1964], 'Wicked: For Good', 'cover', 'Wicked: For Good', T + 'en/b/bf/Wicked_For_Good_poster.jpg'),
  ...wp([1964], 'Wuthering Heights', 'cover', 'Wuthering Heights (2026 film)', T + 'en/f/f9/Wuthering_Heights_%282026_film%29_poster.png'),
  ...wp([1964], 'Michael', 'cover', 'Michael (2026 film)', T + 'en/3/37/Michael_%282026_film_poster%29.png'),
  ...wp([1964], 'Star Wars: The Mandalorian and Grogu', 'cover', 'The Mandalorian and Grogu', T + 'en/4/4c/The_Mandalorian_and_Grogu_poster.jpg'),
  ...wp([1964], 'The Hunger Games: Sunrise on the Reaping', 'cover', 'The Hunger Games: Sunrise on the Reaping', T + 'en/d/da/The_Hunger_Games_-_Sunrise_on_the_Reaping_poster.jpg'),
  ...wp([1961], 'GTA VI', 'cover', 'Grand Theft Auto VI', T + 'en/4/46/Grand_Theft_Auto_VI.png', 'Grand Theft Auto VI'),
  ...wp([1961], 'The Legend of Zelda: Ocarina of Time', 'cover', 'The Legend of Zelda: Ocarina of Time', T + 'en/5/57/The_Legend_of_Zelda_Ocarina_of_Time.jpg'),
  ...wp([1961], 'Resident Evil Requiem', 'cover', 'Resident Evil Requiem', T + 'en/1/15/Resident_Evil_Requiem_Cover_Art.jpg'),
  ...wp([1961], 'Control Resonant', 'cover', 'Control Resonant', T + 'en/a/a1/Control_Resonant_cover_art.png'),
  ...wp([1961], 'Phantom Blade Zero', 'cover', 'Phantom Blade Zero', T + 'en/4/41/Phantom_Blade_Zero_cover_art.jpg'),
];
const jay = JSON.parse(readFileSync('/private/tmp/claude-501/-Users-ianflynn-chronopin/31fd055b-9952-4af9-a872-c38d0e16a57a/scratchpad/jayz.json', 'utf8'));
for (const [label, h] of Object.entries<any>(jay)) if (h) jobs.unshift({ pinId: 20934, row: { label, person: `${h.track} — ${h.album}`, kind: 'cover', imageSource: h.art, authorName: `Apple Music, ${h.album} (cover art)`, authorUrl: h.url } });
console.log('jobs', jobs.length);
for (const { pinId, row } of jobs) {
  if ((await outcomePhotosForPin(pinId)).some((p) => outcomeKey(p.label) === outcomeKey(row.label))) continue;
  const wiki = row.imageSource!.includes('wikimedia.org');
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await savePhotosPartial(pinId, [row]);
    const err = JSON.stringify(r.failed);
    console.log(pinId, row.label, r.saved.length ? 'ok' : 'FAILED ' + err.slice(0, 160));
    if (r.saved.length) break;
    if (/too large/i.test(err)) { row.imageSource = big(row.imageSource!); continue; }
    if (!/429/.test(err)) break;
    await sleep(660000);
  }
  if (wiki) await sleep(45000);
}
await db.closeConnection(); process.exit(0);
