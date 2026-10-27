// Gives each netizen the picture they use online: the YouTube channel's profile
// picture (channel id from Wikidata P2397, picture from the channel page's
// og:image) or the Substack author's photo. Each is stored in Azure Blob
// Storage (thumb/people/<slug>.<ext>), checked as a public download, and then
// set as the person's photo with the source page as the credit.
//
//   npx tsx scripts/people/netizenAvatars.ts [--save]

import '../env';
import * as db from '@/server/db';
import { getBlobUrl, uploadThumb } from '@/server/azureBlob';

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; ChronoPin people importer; +https://www.chronopin.com)' };
const SUBSTACKS: Record<string, { host: string; page: string }> = {
  'hfi-research': { host: 'www.hfir.com', page: 'https://www.hfir.com/' },
  'le-shrub': { host: 'www.shrubstack.com', page: 'https://www.shrubstack.com/' },
};

async function source(slug: string, qid: string | null): Promise<{ image: string; credit: string } | null> {
  const sub = SUBSTACKS[slug];
  if (sub) {
    const posts = await (await fetch(`https://${sub.host}/api/v1/archive?limit=1`, { headers: UA })).json();
    const url = posts[0]?.publishedBylines?.[0]?.photo_url;
    return url ? { image: url, credit: `Author photo on Substack, ${sub.page}` } : null;
  }
  if (!qid) return null;
  const ent = (await (await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json`, { headers: UA })).json()).entities[qid];
  const channel: string | undefined = ent?.claims?.P2397?.[0]?.mainsnak?.datavalue?.value;
  if (!channel) return null;
  const page = `https://www.youtube.com/channel/${channel}`;
  const html = await (await fetch(page, { headers: { ...UA, 'Accept-Language': 'en' } })).text();
  const og = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
  return og ? { image: og.replace(/=s\d+-.*$/, '=s400-c-k-c0x00ffffff-no-rj'), credit: `Profile picture on YouTube, ${page}` } : null;
}

(async () => {
  const save = process.argv.includes('--save');
  const people = await db.query<{ id: number; slug: string; name: string; wikidataId: string | null }>(
    `SELECT "id", "slug", "name"::text AS "name", "wikidataId" FROM "Person" WHERE "role" = 'netizen' ORDER BY "id"`,
  );
  for (const p of people) {
    try {
      const found = await source(p.slug, p.wikidataId);
      if (!found) { console.log(`NONE  ${p.name}`); continue; }
      const res = await fetch(found.image, { headers: UA });
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !type.startsWith('image/')) { console.log(`BAD   ${p.name} ${res.status} ${type}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
      const name = `people/${p.slug}.${ext}`;
      if (!save) { console.log(`DRY   ${p.name} ${buf.length}B -> ${name}`); continue; }
      await uploadThumb(name, buf, type, 'public, max-age=86400');
      const url = getBlobUrl(name);
      const check = await fetch(url);
      if (!check.ok || (await check.arrayBuffer()).byteLength !== buf.length) { console.log(`FAIL  ${p.name} blob did not verify`); continue; }
      await db.query(`UPDATE "Person" SET "photoUrl" = $2, "photoCredit" = $3, "utcUpdatedDateTime" = now() WHERE "id" = $1`, [p.id, url, found.credit]);
      console.log(`OK    ${p.name} ${url}`);
    } catch (err) {
      console.log(`ERR   ${p.name} ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  await db.closeConnection();
})();
