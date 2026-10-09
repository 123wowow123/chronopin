import sharp, { type Metadata } from 'sharp';

// Limit parallel downloads when a catalog points to Azure Blob Storage.
export async function imageMetadata(images: (string | null | undefined)[]): Promise<(Metadata | null)[]> {
  const result: (Metadata | null)[] = [];
  for (let offset = 0; offset < images.length; offset += 8) {
    result.push(...await Promise.all(images.slice(offset, offset + 8).map(async (image) => {
      if (!image) return null;
      if (!image.startsWith('https://')) return sharp(`public${image}`).metadata();
      const response = await fetch(image, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`Image download failed (${response.status}): ${image}`);
      return sharp(Buffer.from(await response.arrayBuffer())).metadata();
    })));
  }
  return result;
}
