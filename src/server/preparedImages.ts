import type { ContainerClient } from '@azure/storage-blob';
import sharp from 'sharp';
import { PREPARED_WIDTHS, isPreparableName, preparedName } from '@/lib/preparedImage';

// Uploads WebP renditions of one stored photo (src/lib/preparedImage.ts) and
// reads each back from its public URL. Without `widths`, makes only the ones
// that are missing; `replace` overwrites the given widths (the original
// changed since they were made). Returns how many were uploaded.
export async function uploadPreparedRenditions(container: ContainerClient, name: string, original: Buffer, options: { widths?: readonly number[]; replace?: boolean } = {}): Promise<number> {
  if (!isPreparableName(name)) return 0;
  let made = 0;
  for (const width of options.widths ?? PREPARED_WIDTHS) {
    const blob = container.getBlockBlobClient(preparedName(name, width));
    if (!options.widths && await blob.exists()) continue;
    const buffer = await sharp(original, { failOn: 'none' }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    await blob.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: 'image/webp', blobCacheControl: 'public, max-age=31536000, immutable' },
      conditions: options.replace ? undefined : { ifNoneMatch: '*' },
    });
    const response = await fetch(blob.url, { method: 'HEAD', signal: AbortSignal.timeout(30_000) });
    if (!response.ok || Number(response.headers.get('content-length')) !== buffer.length) throw new Error(`Rendition readback ${response.status}: ${blob.url}`);
    made++;
  }
  return made;
}
