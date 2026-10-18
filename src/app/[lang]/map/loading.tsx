'use client';

// What the map page shows while its pin tiles and Leaflet assets stream in.
export default function MapLoading() {
  return (
    <main data-fullscreen role="status" aria-busy="true">
      <span className="sr-only">Loading map…</span>
      <div className="h-[calc(100dvh-52px)] animate-pulse bg-raised motion-reduce:animate-none" />
    </main>
  );
}
