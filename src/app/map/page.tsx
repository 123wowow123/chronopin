import type { Metadata } from 'next';
import { siteName } from '@/lib/appConfig';
import { MapLoader } from './MapLoader';

const title = `Map · ${siteName}`;
const description =
  'Upcoming and recent events on a map: product launches, openings, missions and more, pinned where they happen.';

// openGraph and twitter replace the root layout's whole objects, so a share of
// /map would otherwise show the home page's title, description and URL.
export const metadata: Metadata = {
  title: 'Map',
  description,
  alternates: { canonical: '/map' },
  openGraph: { type: 'website', siteName, url: '/map', title, description },
  twitter: { card: 'summary_large_image', title, description },
};

export default function MapPage() {
  return (
    <main>
      <h1 className="sr-only">Pins on a map</h1>
      <MapLoader />
    </main>
  );
}
