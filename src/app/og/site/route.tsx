import { connection } from 'next/server';
import { siteCardJpeg } from '@/server/services/siteCard';

// The site's share card, for a page with no picture of its own (the home
// page, a search): the logo, the name and what the site is for over a collage
// of the pictures pinned lately. Built at server start and once a day after
// (services/siteCard.tsx), so a request only sends the bytes.
export async function GET() {
  await connection();
  const jpeg = await siteCardJpeg();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(jpeg.length),
      // A day, as the collage is: the URL changes daily too (shareCard.ts).
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
