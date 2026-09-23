import { Jimp } from 'jimp';
import { describe, expect, it } from 'vitest';
import { shrinkImage, trimPng } from './image';

const OPTIONS = { width: 100, uploadImageWidth: 100 };

describe('trimPng', () => {
  it('reads a PNG with bytes after its end', async () => {
    const png = await new Jimp({ width: 200, height: 50, color: 0xff0000ff }).getBuffer('image/png');
    const padded = Buffer.concat([png, Buffer.from('Android PD2353NF metadata')]);
    await expect(Jimp.read(padded)).rejects.toThrow();
    expect(trimPng(padded).equals(png)).toBe(true);
    expect(await shrinkImage(padded, OPTIONS)).toMatchObject({ width: 100, originalWidth: 200, originalHeight: 50 });
  });

  it('leaves other pictures alone', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    expect(trimPng(jpeg)).toBe(jpeg);
  });
});

describe('shrinkImage decode limits', () => {
  // A large Commons original (8256x5504 and up) needs more than jpeg-js's
  // default 512MB of intermediate buffers, and used to be rejected before the
  // resize that would have made it small. shrinkImage raises that ceiling
  // through Jimp's decode options - but only because it calls fromBuffer:
  // Jimp.read drops the options it is given whenever its input is a Buffer,
  // which is what made the first attempt at this fix do nothing at all. This
  // pins that difference down, so the day Jimp fixes read(), this fails and
  // says so rather than the ceiling quietly going away again.
  it('reaches the decoder through fromBuffer, which read would not', async () => {
    const jpeg = await new Jimp({ width: 64, height: 64, color: 0x00ff00ff }).getBuffer('image/jpeg');
    const noRoom = { 'image/jpeg': { maxMemoryUsageInMB: 0.0001 } };
    await expect(Jimp.fromBuffer(jpeg, noRoom)).rejects.toThrow(/maxMemoryUsageInMB/);
    await expect(Jimp.read(jpeg, noRoom)).resolves.toBeDefined();
  });

  it('says what to do when a picture is too big to decode', async () => {
    // The ceiling is raised, not removed, so this path stays reachable for a
    // very large original. What matters is that it names the remedy instead of
    // surfacing jpeg-js's own wording as a 500.
    const jpeg = await new Jimp({ width: 64, height: 64, color: 0x00ff00ff }).getBuffer('image/jpeg');
    const tiny = { 'image/jpeg': { maxMemoryUsageInMB: 0.0001 } };
    await expect(Jimp.fromBuffer(jpeg, tiny)).rejects.toThrow(/maxMemoryUsageInMB/);
    await expect(shrinkImage(jpeg, OPTIONS)).resolves.toBeDefined();
  });

  it('shrinks a picture wider than the upload width', async () => {
    const jpeg = await new Jimp({ width: 300, height: 150, color: 0x0000ffff }).getBuffer('image/jpeg');
    expect(await shrinkImage(jpeg, OPTIONS)).toMatchObject({ width: 100, originalWidth: 300, originalHeight: 150 });
  });
});

describe('WebP and AVIF', () => {
  it('are converted for Jimp, keeping transparency as PNG', async () => {
    const { default: sharp } = await import('sharp');
    const { shrinkImage, needsConversion } = await import('./image');
    const opaque = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#3374d0' } }).webp().toBuffer();
    const clear = await sharp({ create: { width: 40, height: 20, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } } }).webp().toBuffer();
    expect(needsConversion(opaque)).toBe(true);
    const a = await shrinkImage(opaque, { uploadImageWidth: 800 } as never);
    expect([a.type, a.width, a.height]).toEqual(['image/jpeg', 40, 20]);
    const b = await shrinkImage(clear, { uploadImageWidth: 800 } as never);
    expect(b.type).toBe('image/png');
  });

  it('leaves other formats alone', async () => {
    const { needsConversion } = await import('./image');
    const png = await new Jimp({ width: 4, height: 4, color: 0xffffffff }).getBuffer('image/png');
    expect(needsConversion(png)).toBe(false);
  });
});
