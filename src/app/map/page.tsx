import type { Metadata } from 'next';
import { MapLoader } from './MapLoader';

export const metadata: Metadata = {
  title: 'Map',
  description: 'Upcoming and recent events on a map: product launches, openings, missions and more, pinned where they happen.',
  alternates: { canonical: '/map' },
};

export default function MapPage() {
  return (
    <main>
      <h1 className="sr-only">Pins on a map</h1>
      <MapLoader />
    </main>
  );
}
