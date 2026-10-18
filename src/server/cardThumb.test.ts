import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { createCardThumb } from './cardThumb';

describe('card thumbnails', () => {
  it.each([80, 640])('keeps a coloured label at y=%i on a plain tall bottle', async (top) => {
    const label = await sharp({ create: { width: 160, height: 200, channels: 3, background: '#dd2020' } }).png().toBuffer();
    const input = await sharp({ create: { width: 240, height: 1000, channels: 3, background: '#151515' } })
      .composite([{ input: label, left: 40, top }]).png().toBuffer();
    const result = await createCardThumb(input);
    const { data, info } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
    let red = 0;
    for (let i = 0; i < data.length; i += info.channels) if (data[i] > 120 && data[i] > data[i + 1] * 2) red++;
    // A centre crop misses either label entirely. Both must occupy enough
    // of the card to identify the product, regardless of where they sit.
    expect(red / (info.width * info.height)).toBeGreaterThan(0.15);
    expect([info.width, info.height]).toEqual([960, 600]);
  });

  it('keeps both ends of a portrait without a concentrated colour region', async () => {
    const input = await sharp({ create: { width: 200, height: 1000, channels: 3, background: '#111111' } })
      .composite([{ input: Buffer.from('<svg width="200" height="1000"><rect width="200" height="50" fill="white"/><rect y="950" width="200" height="50" fill="white"/></svg>') }])
      .png().toBuffer();
    const { data, info } = await sharp(await createCardThumb(input)).raw().toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number) => data[(y * info.width + x) * info.channels];
    expect(pixel(480, 5)).toBeGreaterThan(240);
    expect(pixel(480, 300)).toBeLessThan(40);
    expect(pixel(480, 595)).toBeGreaterThan(240);
  });

  it('handles landscape WebP and EXIF rotation', async () => {
    const landscape = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#336699' } }).webp().toBuffer();
    expect(await sharp(await createCardThumb(landscape)).metadata()).toMatchObject({ width: 960, height: 600, format: 'jpeg' });
    const rotated = await sharp({ create: { width: 1000, height: 200, channels: 3, background: '#111111' } })
      .withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const { data, info } = await sharp(await createCardThumb(rotated)).raw().toBuffer({ resolveWithObject: true });
    expect(data[(300 * info.width + 10) * info.channels]).toBeGreaterThan(240);
  });
});
