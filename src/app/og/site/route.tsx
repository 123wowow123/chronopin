import { connection } from 'next/server';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { PIN, PINS } from '@/components/ui/LogoMark';
import { siteDescription, siteName } from '@/lib/appConfig';
import { COLLAGE, shareCollage, TILE } from '@/server/services/shareCollage';
import log from '@/server/util/log';

const SIZE = { width: COLLAGE.width, height: COLLAGE.height };

// The logo as an image Satori can draw: the LogoMark's three pins, framed
// square around the cluster as the favicon is (scripts/favicon/build.ts).
const LOGO = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 2.3 31.2 31.2">${PINS.map(
    ({ fill, tip: [x, y], scale }) =>
      `<path d="${PIN}" fill="${fill}" fill-rule="evenodd" transform="translate(${x} ${y}) scale(${scale}) translate(-16 -31)"/>`,
  ).join('')}</svg>`,
).toString('base64')}`;

// The site's share card, for a page with no picture of its own (the home
// page, a search): the logo, the name and what the site is for, in English
// as the pin card is, over a collage of the pictures pinned lately (rebuilt
// daily, services/shareCollage.ts). Without them - the database or the blob
// store down - it is the plain card rather than an error.
export async function GET() {
  // Read at request time, not prerendered at build, which has no database.
  await connection();
  const tiles = await shareCollage().catch((err: Error) => {
    log.warn(`share collage: ${err.message}`);
    return [];
  });
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
  return new Response(new Uint8Array(jpeg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(jpeg.length),
      // A day, as the collage is: the URL changes daily too (layout.tsx), so a
      // cached copy is never shown past its day under the new one's name.
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
