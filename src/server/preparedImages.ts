import type { ContainerClient } from '@azure/storage-blob';
import sharp from 'sharp';
import { PREPARED_WIDTHS, isPreparableName, preparedName } from '@/lib/preparedImage';

// Uploads the WebP renditions of one stored photo (src/lib/preparedImage.ts)
// that are not there yet, and reads each back from its public URL. Returns
// how many were made; a name outside the covered folders makes none.
export async function uploadPreparedRenditions(container: ContainerClient, name: string, original: Buffer, present?: Set<string>): Promise<number> {
  if (!isPreparableName(name)) return 0;
  let made = 0;
  for (const width of PREPARED_WIDTHS) {
    const target = preparedName(name, width);
    if (present?.has(target)) continue;
    const blob = container.getBlockBlobClient(target);
    if (!present && await blob.exists()) continue;
    const buffer = await sharp(original, { failOn: 'none' }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: 'image/webp', blobCacheControl: 'public, max-age=31536000, immutable' }, conditions: { ifNoneMatch: '*' } });
    const response = await fetch(blob.url, { method: 'HEAD', signal: AbortSignal.timeout(30_000) });
    if (!response.ok || Number(response.headers.get('content-length')) !== buffer.length) throw new Error(`Rendition readback ${response.status}: ${blob.url}`);
    made++;
  }
  return made;
}
