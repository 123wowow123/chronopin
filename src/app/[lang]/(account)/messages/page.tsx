import type { Metadata } from 'next';
import { MessagesView } from '@/components/messages/Messenger';
import { requireViewer } from '@/server/guard';
import { getT } from '@/lib/i18n/server';

// Reads the session, so it blocks per request (see ../layout.tsx).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('dm.page') };
}

// Every chat, with the one in ?with=<user id> open. Where the drawer's
// Messages row and "See all in Messages" lead; wide screens also dock chats.
export default async function MessagesPage() {
  await requireViewer('/messages');
  return (
    <div className="sm:px-4 sm:py-6">
      <MessagesView />
    </div>
  );
}
