import type { Metadata } from 'next';
import { NotificationsFeed } from '@/components/nav/NotificationBell';
import { requireViewer } from '@/server/guard';

// Reads the session, so it blocks per request (see ../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export const metadata: Metadata = { title: 'Notifications' };

// Where the mobile drawer's Notifications row leads; wide screens have the
// bell's panel in the navbar.
export default async function NotificationsPage() {
  await requireViewer('/notifications');
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight sm:mb-6">Notifications</h1>
      <NotificationsFeed />
    </div>
  );
}
