import type { Metadata } from 'next';
import './globals.css';

// A URL that matches no page at all. Every page lives under src/app/[lang],
// so there is no root layout to draw an ordinary 404 inside; this is a whole
// document of its own. The proxy sends a plain path to the English tree, so
// an unknown one reads in English. The layout's theme script is left out:
// the colours follow the device.
export const metadata: Metadata = {
  title: 'Page not found · Chronopin',
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <main className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="font-display text-6xl font-semibold tracking-tight text-faint" aria-hidden>
            404
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
          <p className="mt-2 text-subtle">That pin or page doesn&apos;t exist, or it was removed.</p>
          <p className="mt-8">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- no router outside the root layout */}
            <a href="/" className="btn btn-primary">
              Back to the timeline
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
