import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ProductsView } from '@/components/products/ProductsView';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import { MIN_INDEXED_PRODUCTS } from '@/lib/products';
import { productShelves } from '@/server/services/products';
import { siteCardImages } from '@/server/services/shareCard';

// The page's words are English in every language, as the restaurant guide's
// are; the product names and the store buttons are the pins' own.
// This year's products, so the words are made per request, not once at load.
const words = () => {
  const year = new Date().getUTCFullYear();
  return { title: `Products of ${year}`, description: `Products released or coming in ${year} on ${siteName}, by shelf, each with a short note on why it is worth a look.` };
};

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const t = await getT();
  const shelves = await productShelves(t.locale);
  const { title: TITLE, description: DESCRIPTION } = words();
  const images = await siteCardImages();
  const links = await alternates('/products');
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: links,
    ...(shelves.flatMap((s) => s.pins).length >= MIN_INDEXED_PRODUCTS ? {} : { robots: { index: false, follow: true } }),
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images },
    twitter: { card: 'summary_large_image', title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images: images.map((i) => i.url) },
  };
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <Products />
    </Suspense>
  );
}

async function Products() {
  await connection();
  const t = await getT();
  const shelves = await productShelves(t.locale);
  const { title, description } = words();
  return <ProductsView shelves={shelves} title={title} description={description} />;
}
