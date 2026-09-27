import { ImageResponse } from 'next/og';
import { PIN, PINS } from '@/components/ui/LogoMark';
import { siteDescription, siteName } from '@/lib/appConfig';

const SIZE = { width: 1200, height: 630 };

// The logo as an image Satori can draw: the LogoMark's three pins, framed
// square around the cluster as the favicon is (scripts/favicon/build.ts).
const LOGO = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 2.3 31.2 31.2">${PINS.map(
    ({ fill, tip: [x, y], scale }) =>
      `<path d="${PIN}" fill="${fill}" fill-rule="evenodd" transform="translate(${x} ${y}) scale(${scale}) translate(-16 -31)"/>`,
  ).join('')}</svg>`,
).toString('base64')}`;

// The site's share card, for a page with no picture of its own (the home
// page, a search): the logo, the name and what the site is for, in
// English as the pin card is.
export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 40, background: '#111', color: '#ededed', padding: 96 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} width={150} height={150} alt="" />
          <span style={{ fontSize: 112, fontWeight: 700, letterSpacing: -2 }}>{siteName}</span>
        </div>
        <div style={{ fontSize: 44, color: '#bbb', lineHeight: 1.3 }}>{siteDescription}</div>
      </div>
    ),
    { ...SIZE, headers: { 'Cache-Control': 'public, max-age=86400' } },
  );
}
