import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ProductsView } from '@/components/products/ProductsView';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import { MIN_INDEXED_CARS } from '@/lib/products';
import { carShelves } from '@/server/services/cars';
import { siteCardImages } from '@/server/services/shareCard';

// English in every language, as /products is; the car names are the pins' own.
const TITLE = 'The best cars';
const DESCRIPTION = `The best new cars on ${siteName}, ranked on one published rubric of range, charging, acceleration, driver assistance, space and value, each with the figures behind its score.`;

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const t = await getT();
  const shelves = await carShelves(t.locale);
  const images = await siteCardImages();
  const links = await alternates('/cars');
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: links,
    ...(shelves.flatMap((s) => s.pins).length >= MIN_INDEXED_CARS ? {} : { robots: { index: false, follow: true } }),
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images },
    twitter: { card: 'summary_large_image', title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images: images.map((i) => i.url) },
  };
}

export default function CarsPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <Cars />
    </Suspense>
  );
}

async function Cars() {
  await connection();
  const t = await getT();
  const shelves = await carShelves(t.locale);
  return (
    <ProductsView
      shelves={shelves}
      title={TITLE}
      description={DESCRIPTION}
      path="/cars"
      wordmark="The car guide"
      eyebrow="RANKED ON THE SPECS."
      heading={<>The cars worth <em>the drive.</em></>}
    />
  );
}
