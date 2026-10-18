import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { restaurantSourceKey } from '@/lib/restaurantMenus';

export type ImportPhoto = { url: string; credit: string; note: string; sourcePage: string; sha256?: string; width?: number; height?: number };
type PhotoProfile = { pinSourceUrl: string; tile?: { image: string | null; imageCredit: string; imageSourceUrl?: string; imageNote?: string | null }; photo?: { src: string; credit: string; sourceUrl: string; alt?: string } };
type RecordWithPhoto = { enabled: boolean; profile: PhotoProfile };

// Saved profiles are the authority when the importer preserves existing API edits.
export function resolveImportPhotos(sourceUrl: string, gallery: ImportPhoto[], content?: RecordWithPhoto, special?: RecordWithPhoto): ImportPhoto[] {
  const photos = new Map(gallery.map((photo) => [photo.url, photo]));
  for (const record of [content, special]) {
    if (!record?.enabled) continue;
    if (restaurantSourceKey(record.profile.pinSourceUrl) !== restaurantSourceKey(sourceUrl)) throw new Error('Photo profile belongs to another restaurant branch');
    const { tile, photo } = record.profile;
    if (tile?.image) {
      if (!tile.imageCredit.trim() || !tile.imageSourceUrl) throw new Error('Guide photo is missing provenance');
      if (!photos.has(tile.image)) photos.set(tile.image, { url: tile.image, credit: tile.imageCredit, note: tile.imageNote ?? '', sourcePage: tile.imageSourceUrl });
    }
    if (photo) {
      if (!photo.credit.trim() || !photo.sourceUrl) throw new Error('Special photo is missing provenance');
      if (!photos.has(photo.src)) photos.set(photo.src, { url: photo.src, credit: photo.credit, note: photo.alt ?? '', sourcePage: photo.sourceUrl });
    }
  }
  return [...photos.values()];
}

export async function verifyImportPhoto(photo: ImportPhoto): Promise<Required<ImportPhoto>> {
  const url = new URL(photo.url);
  if (url.protocol !== 'https:' || url.hostname !== 'chronopin.blob.core.windows.net' || url.username || url.password || url.port) throw new Error('Photos must be in Chronopin Azure Blob Storage');
  const source = new URL(photo.sourcePage);
  if (!photo.credit.trim() || !['http:', 'https:'].includes(source.protocol) || source.username || source.password) throw new Error('Photo requires credit and source URL');
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error('Public photo unavailable');
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (photo.sha256 !== undefined && sha256 !== photo.sha256) throw new Error('Public photo hash mismatch');
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height || (photo.width !== undefined && metadata.width !== photo.width) || (photo.height !== undefined && metadata.height !== photo.height)) throw new Error('Public photo dimensions mismatch');
  await sharp(bytes).raw().toBuffer();
  return { ...photo, sha256, width: metadata.width, height: metadata.height };
}
