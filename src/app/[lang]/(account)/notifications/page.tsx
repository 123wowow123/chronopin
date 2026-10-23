import type { Metadata } from 'next';
import { TitleWithBack } from '@/components/nav/BackToMenu';
import { NotificationsFeed } from '@/components/nav/NotificationBell';
import Link from '@/components/ui/Link';
import { requireViewer } from '@/server/guard';
import { getT } from '@/lib/i18n/server';

// Reads the session, so it blocks per request (see ../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('notifications.title') };
}

// Where the mobile drawer's Notifications row leads; wide screens have the
// bell's panel in the navbar.
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const { section } = await searchParams;
  await requireViewer('/notifications');
  const t = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <TitleWithBack wideBack className="mb-4 sm:mb-6">{t('notifications.title')}</TitleWithBack>
      <p className="mb-4 text-sm">
        <Link href="/profile/following">{t('profile.following')} →</Link>
      </p>
      <NotificationsFeed section={section} />
    </div>
  );
}
