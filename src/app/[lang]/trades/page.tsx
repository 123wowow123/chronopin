import type { Metadata } from 'next';
import { TitleWithBack } from '@/components/nav/BackToMenu';
import { TradesHistoryFeed } from '@/components/nav/NotificationBell';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('notifications.tradesToday') };
}

// Daily buys and sells from every disclosed filing, past twelve weeks; open to
// visitors who are not signed in (the bell's page covers only the people a
// signed-in viewer watches).
export default async function PublicTradesPage() {
  const t = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10 lg:max-w-7xl">
      <TitleWithBack wideBack className="mb-4 sm:mb-6">{t('notifications.tradesToday')}</TitleWithBack>
      <TradesHistoryFeed everyone wide />
    </div>
  );
}
