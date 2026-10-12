import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { PIN, PINS } from '@/components/ui/LogoMark';
import { siteDescription, siteName } from '@/lib/appConfig';
import log from '../util/log';
import { COLLAGE, shareCollage, TILE } from './shareCollage';

const SIZE = { width: COLLAGE.width, height: COLLAGE.height };

// The logo as an image Satori can draw: the LogoMark's three pins, framed
// square around the cluster as the favicon is (scripts/favicon/build.ts).
const LOGO = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 2.3 31.2 31.2">${PINS.map(
    ({ fill, tip: [x, y], scale }) =>
      `<path d="${PIN}" fill="${fill}" fill-rule="evenodd" transform="translate(${x} ${y}) scale(${scale}) translate(-16 -31)"/>`,
  ).join('')}</svg>`,
).toString('base64')}`;

// Renders the card: a JPEG a fraction of the weight of Satori's PNG, which
// Messages' link previews showed as a grey box (a collage makes a 1 MB PNG,
// streamed with no Content-Length).
async function render(tiles: string[]): Promise<Buffer> {
  const card = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#111', color: '#ededed' }}>
        {tiles.length ? (
          <div style={{ position: 'absolute', top: 0, left: 0, width: SIZE.width, height: SIZE.height, display: 'flex', flexWrap: 'wrap' }}>
            {tiles.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} width={TILE.width} height={TILE.height} alt="" />
            ))}
          </div>
        ) : null}
        {/* Darkest behind the words on the left, so they read over any picture. */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: SIZE.width,
            height: SIZE.height,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 40,
            padding: 96,
            background: tiles.length ? 'linear-gradient(90deg, rgba(17,17,17,0.9) 0%, rgba(17,17,17,0.75) 55%, rgba(17,17,17,0.35) 100%)' : '#111',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} width={150} height={150} alt="" />
            <span style={{ fontSize: 112, fontWeight: 700, letterSpacing: -2 }}>{siteName}</span>
          </div>
          <div style={{ fontSize: 44, color: '#ccc', lineHeight: 1.3 }}>{siteDescription}</div>
        </div>
      </div>
    ),
    SIZE,
  );
  // Satori only draws PNGs, and a photo collage makes a 1 MB one, streamed with
  // no Content-Length. Messages' link previews showed a grey box for it, so the
  // card is sent as a sized JPEG a fraction of the weight.
  const jpeg = await sharp(Buffer.from(await card.arrayBuffer()))
    .flatten({ background: '#111' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return jpeg;
}

const RETRY_MS = 5 * 60_000;

type Built = { jpeg: Buffer; day: string; collage: boolean; at: number };
let current: Built | null = null;
let building: Promise<Built> | null = null;

const today = () => new Date().toISOString().slice(0, 10);

async function build(): Promise<Built> {
  const day = today();
  const tiles = await shareCollage().catch((err: Error) => {
    log.warn(`share collage: ${err.message}`);
    return [];
  });
  // Without tiles (database or blob store down) the plain card is served,
  // and rebuilt after RETRY_MS rather than held for the day.
  return { jpeg: await render(tiles), day, collage: tiles.length > 0, at: Date.now() };
}

function stale(b: Built | null) {
  return !b || b.day !== today() || (!b.collage && Date.now() - b.at > RETRY_MS);
}

// The card as a JPEG, built once per UTC day in this process and kept in
// memory. warmSiteCard() builds it at server start, so no visitor or crawler
// waits on the fifteen thumb fetches; a request that finds it stale serves
// the previous one while the new one builds.
export async function siteCardJpeg(): Promise<Buffer> {
  if (stale(current)) {
    building ??= build()
      .then((b) => (current = b))
      .finally(() => {
        building = null;
      });
    if (!current) return (await building).jpeg;
  }
  return current!.jpeg;
}

export async function warmSiteCard() {
  const jpeg = await siteCardJpeg();
  log.info(`share collage: built at start (${jpeg.length} bytes, ${current?.collage ? 'collage' : 'plain card'})`);
}
