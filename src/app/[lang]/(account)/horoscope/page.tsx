import type { Metadata } from 'next';
import { TitleWithBack } from '@/components/nav/BackToMenu';
import { requireViewer } from '@/server/guard';
import { getT } from '@/lib/i18n/server';
import HoroscopePage from './HoroscopePage';

// Reads the session, so it blocks per request (see ../layout.tsx).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('horoscope.title') };
}

// Where the bell's horoscope row leads: today's reading, lucky details and
// compatible signs for the signed-in viewer's sun sign.
export default async function Page() {
  await requireViewer('/horoscope');
  const t = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <TitleWithBack className="mb-4 sm:mb-6">{t('horoscope.title')}</TitleWithBack>
      <HoroscopePage />
    </div>
  );
}
