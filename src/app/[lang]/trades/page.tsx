import type { Metadata } from 'next';
import { TitleWithBack } from '@/components/nav/BackToMenu';
import { TradesHistoryFeed } from '@/components/nav/NotificationBell';
import { OwnTickers } from '@/components/person/OwnTickers';
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
    <div className="mx-auto max-w-2xl px-1.5 py-6 sm:px-4 sm:py-10 lg:max-w-7xl">
      <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2">
        <TitleWithBack wideBack>{t('notifications.tradesToday')}</TitleWithBack>
        <OwnTickers className="ms-auto" />
      </div>
      <TradesHistoryFeed everyone wide />
    </div>
  );
}
