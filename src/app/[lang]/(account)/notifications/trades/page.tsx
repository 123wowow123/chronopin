import type { Metadata } from 'next';
import { TitleWithBack } from '@/components/nav/BackToMenu';
import { TradesHistoryFeed } from '@/components/nav/NotificationBell';
import { requireViewer } from '@/server/guard';
import { getT } from '@/lib/i18n/server';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('notifications.tradesToday') };
}

// Daily buys and sells from the people the viewer watches, past two weeks;
// the bell's panel shows only today and yesterday.
export default async function TradesHistoryPage() {
  await requireViewer('/notifications/trades');
  const t = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <TitleWithBack wideBack className="mb-4 sm:mb-6">{t('notifications.tradesToday')}</TitleWithBack>
      <TradesHistoryFeed />
    </div>
  );
}
