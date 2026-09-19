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
