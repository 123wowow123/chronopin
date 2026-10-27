import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ProductsView } from '@/components/products/ProductsView';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import { MIN_INDEXED_CARS } from '@/lib/products';
import { carShelves } from '@/server/services/cars';
import { siteCardImages } from '@/server/services/shareCard';

// The page's words are in the messages (guides.cars); the car names are the pins' own.

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const t = await getT();
  const shelves = await carShelves(t.locale);
  const images = await siteCardImages();
  const links = await alternates('/cars');
  const TITLE = t('guides.cars.title');
  const DESCRIPTION = t('guides.cars.description', { site: siteName });
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
      title={t('guides.cars.title')}
      description={t('guides.cars.description', { site: siteName })}
      path="/cars"
      wordmark={t('guides.cars.wordmark')}
      eyebrow={t('guides.cars.eyebrow')}
      heading={t.rich('guides.cars.heading', { em: (c) => <em>{c}</em> })}
    />
  );
}
