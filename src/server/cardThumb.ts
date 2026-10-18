import sharp from 'sharp';

// Tall packshots often put all identifying colour in a neck label, surrounded
// by a large plain bottle. Attention/entropy cropping can prefer its reflections.
// Find a substantial, concentrated colour region; otherwise keep the whole
// portrait. Landscape photographs use sharp's attention crop.
export async function createCardThumb(input: Buffer) {
  const picture = sharp(input, { failOn: 'none' }).rotate();
  const oriented = await picture.png().toBuffer();
  const { width, height } = await sharp(oriented).metadata();
  if (!width || !height) throw new Error('Image has no dimensions');
  let selected = sharp(oriented);
  const portrait = height > width * 1.2;
  if (portrait) {
    const { data, info } = await sharp(oriented).resize({ width: 160, height: 320, fit: 'inside' })
      .flatten({ background: '#ffffff' }).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const rows = new Array<number>(info.height).fill(0);
    let coloured = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = Math.floor(info.width * 0.1); x < info.width * 0.9; x++) {
        const offset = (y * info.width + x) * info.channels;
        const r = data[offset], g = data[offset + 1], b = data[offset + 2];
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        if (chroma >= 45) { rows[y] += chroma; coloured++; }
      }
    }
    const total = rows.reduce((sum, row) => sum + row, 0);
    if (coloured > info.width * info.height * 0.02) {
      // Ignore isolated compression noise and tiny logos at the edges.
      let accumulated = 0, first = 0, last = info.height - 1;
      for (let y = 0; y < info.height; y++) {
        accumulated += rows[y];
        if (accumulated >= total * 0.025) { first = y; break; }
      }
      accumulated = 0;
      for (let y = info.height - 1; y >= 0; y--) {
        accumulated += rows[y];
        if (accumulated >= total * 0.025) { last = y; break; }
      }
      if (last - first < info.height * 0.6) {
        const padding = Math.max(4, (last - first) * 0.12);
        const top = Math.max(0, Math.floor((first - padding) * height / info.height));
        const bottom = Math.min(height, Math.ceil((last + padding + 1) * height / info.height));
        selected = selected.extract({ left: 0, top, width, height: bottom - top });
      }
    }
  }
  return selected.resize({ width: 960, height: 600, fit: portrait ? 'contain' : 'cover',
    position: portrait ? 'centre' : sharp.strategy.attention, background: '#ffffff' })
    .flatten({ background: '#ffffff' }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}
