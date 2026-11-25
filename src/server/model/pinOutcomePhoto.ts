// Pictures of the people behind a pin's prediction-market outcomes
// (PinOutcomePhoto, 0268), matched to an outcome by its label. Saved by the
// outcomePhotos task (docs/okf/scraping/daily-jobs.md#outcomephotos): it names a
// source picture, which is downloaded here, cropped square and stored in Azure
// Blob Storage; the row keeps the blob URL and the credit.

import { createHash } from 'node:crypto';
import sharp from 'sharp';
import * as db from '../db';
import { getBlobUrl, uploadThumb } from '../azureBlob';

export type OutcomePhoto = { label: string; person: string; imageUrl: string; imageSource?: string | null; authorName: string | null; authorUrl: string | null };

export const outcomeKey = (label: string) => label.trim().toLowerCase();

export function outcomePhotosForPin(pinId: number): Promise<OutcomePhoto[]> {
  return db.query<OutcomePhoto>(`SELECT "label", "person", "imageUrl", "imageSource", "authorName", "authorUrl" FROM "PinOutcomePhoto" WHERE "pinId" = $1`, [pinId]);
}

// What a saved photo's URL must start with: our own container, never another host.
const OWN_PREFIX = () => getBlobUrl('outcome-photos/');
const MAX_BYTES = 12_000_000;
const MIN_SIDE = 160;
const SIZE = 480;

export type PhotoInput = { label: string; person: string; imageSource?: string; imageUrl?: string; authorName?: string; authorUrl?: string };

function httpsUrl(value: unknown, what: string): string {
  let url: URL;
  try {
    url = new URL(String(value));
  } catch {
    throw new Error(`${what} is not a URL`);
  }
  if (url.protocol !== 'https:' || url.hostname === 'localhost' || /^[\d.]+$|^\[/.test(url.hostname)) throw new Error(`${what} must be an https page on a named host`);
  return url.toString();
}

// The photos, or a sentence saying what is wrong with them.
export function photosProblem(body: unknown): PhotoInput[] | string {
  if (!Array.isArray(body) || !body.length || body.length > 30) return 'photos is a list of 1 to 30 rows.';
  const rows: PhotoInput[] = [];
  for (const item of body as Record<string, unknown>[]) {
    const label = typeof item?.label === 'string' ? item.label.trim() : '';
    const person = typeof item?.person === 'string' ? item.person.trim() : '';
    if (!label || label.length > 200 || !person || person.length > 200) return 'Each photo needs a label (the market outcome as printed) and the person pictured.';
    try {
      const imageSource = item.imageSource ? httpsUrl(item.imageSource, `${label}: imageSource`) : undefined;
      const imageUrl = item.imageUrl ? String(item.imageUrl) : undefined;
      if (!imageSource && !(imageUrl && imageUrl.startsWith(OWN_PREFIX()))) return `${label}: give imageSource (an https picture to download) or an imageUrl already in our storage.`;
      const authorUrl = item.authorUrl ? httpsUrl(item.authorUrl, `${label}: authorUrl`) : undefined;
      const authorName = typeof item.authorName === 'string' ? item.authorName.trim().slice(0, 300) : undefined;
      if (!authorName || !authorUrl) return `${label}: credit the source with authorName and authorUrl.`;
      rows.push({ label, person, imageSource, imageUrl, authorName, authorUrl });
    } catch (err) {
      return (err as Error).message;
    }
  }
  return rows;
}

// Downloads a source picture, crops it square around the likeliest face or
// subject and stores it. Throws a plain sentence when it is not usable.
async function storePicture(pinId: number, person: string, source: string): Promise<string> {
  // Wikimedia answers a burst of requests with 429: wait and try again.
  let res: Response;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(source, { signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': 'chronopin-image-fetch/1.0', Accept: 'image/jpeg,image/png,image/webp,*/*;q=0.5' } });
    if (res.status !== 429 || attempt >= 3) break;
    // Honour Retry-After when it is short; a long ban (Wikimedia asks for 10
    // minutes) is reported, and the task tries that picture on its next run.
    const wait = Number(res.headers.get('retry-after')) || 5 * (attempt + 1);
    if (wait > 30) throw new Error(`${person}: the picture host asked us to wait ${Math.round(wait / 60)} min (429); try again later`);
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
  }
  if (!res.ok) throw new Error(`${person}: the picture answered ${res.status}`);
  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES) throw new Error(`${person}: the picture is too large`);
  const data = Buffer.from(await res.arrayBuffer());
  if (data.length > MAX_BYTES) throw new Error(`${person}: the picture is too large`);
  let meta;
  try {
    meta = await sharp(data).metadata();
  } catch {
    throw new Error(`${person}: that URL is not a picture (an AVIF or video saved as .jpg?)`);
  }
  if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < MIN_SIDE) throw new Error(`${person}: the picture is under ${MIN_SIDE}px`);
  const jpeg = await sharp(data).rotate().flatten({ background: '#e8ecf1' }).resize(SIZE, SIZE, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 86 }).toBuffer();
  const hash = createHash('sha256').update(jpeg).digest('hex').slice(0, 12);
  const slug = person.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'person';
  const name = `outcome-photos/${pinId}/${slug}-${hash}.jpg`;
  await uploadThumb(name, jpeg, 'image/jpeg', 'public, max-age=31536000, immutable');
  const url = getBlobUrl(name);
  const check = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!check.ok) throw new Error(`${person}: the stored picture does not download (${check.status})`);
  return url;
}

// Adds or replaces these pictures (one per outcome label); others stay.
export async function savePhotos(pinId: number, rows: PhotoInput[]): Promise<OutcomePhoto[]> {
  const saved: OutcomePhoto[] = [];
  for (const r of rows) {
    // A gap between downloads keeps a batch under the host's rate limit.
    if (saved.length && r.imageSource) await new Promise((resolve) => setTimeout(resolve, 1500));
    const imageUrl = r.imageSource ? await storePicture(pinId, r.person, r.imageSource) : r.imageUrl!;
    saved.push({ label: r.label, person: r.person, imageUrl, imageSource: r.imageSource ?? null, authorName: r.authorName ?? null, authorUrl: r.authorUrl ?? null });
  }
  await db.transaction(async (query) => {
    for (const p of saved) {
      await query(
        `INSERT INTO "PinOutcomePhoto" ("pinId","label","person","imageUrl","imageSource","authorName","authorUrl") VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT ("pinId","label") DO UPDATE SET "person"=EXCLUDED."person","imageUrl"=EXCLUDED."imageUrl","imageSource"=EXCLUDED."imageSource","authorName"=EXCLUDED."authorName","authorUrl"=EXCLUDED."authorUrl"`,
        [pinId, p.label, p.person, p.imageUrl, p.imageSource, p.authorName, p.authorUrl],
      );
    }
  });
  return saved;
}
