import type { Metadata } from 'next';
import { TitleWithBack } from '@/components/nav/BackToMenu';
import { ListingsManager } from '@/components/listings/ListingsManager';
import { requireViewer } from '@/server/guard';
import { getT } from '@/lib/i18n/server';

// Reads the session, so it blocks per request (see ../layout.tsx).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('listing.yourListings') };
}

// The seller's marketplace listings - mark one pending or sold, edit or
// delete it - and the ratings their chats have earned them.
export default async function ListingsPage() {
  await requireViewer('/listings');
  const t = await getT();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <TitleWithBack wideBack className="mb-4 sm:mb-6">{t('listing.yourListings')}</TitleWithBack>
      <ListingsManager />
    </div>
  );
}
