'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { BackToMenu } from '@/components/nav/BackToMenu';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useT } from '@/lib/client/i18n';
import { onLive } from '@/lib/client/liveFeed';
import {
  backFromMessages,
  chatMessageArrived,
  closeChat,
  isWide,
  leaveForMessages,
  messagesHref,
  openChat,
  setChatMinimized,
  useDockedChats,
  useUnreadChats,
  type ChatUser,
  type DirectMessageEvent,
} from '@/lib/client/messages';
import { usePathname, useRouter, useSearchParams } from '@/lib/client/navigation';
import { authHrefHere } from '@/lib/client/returnSpot';
import { useSession } from '@/lib/client/session';
import type { Translator } from '@/lib/i18n/translate';
import { ChatList } from './ChatList';
import { ChatThread, type ThreadMeta } from './ChatThread';

const userHref = (user: ChatUser) => `/search?q=user:${encodeURIComponent(user.userName.replace(/^@+/, ''))}`;
const unreadLabel = (t: Translator, count: number) => (count ? t('dm.unreadLabel', { count }) : t('dm.title'));

function Badge({ count, className }: { count: number; className: string }) {
  return count ? (
    <span className={`absolute min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 font-bold text-white ring-2 ring-header ${className}`}>
      {count > 9 ? '9+' : count}
    </span>
  ) : null;
}

// Opens a chat: docked on a wide screen, the /messages page otherwise.
function useStartChat() {
  const router = useRouter();
  return (user: ChatUser) => {
    if (openChat(user)) return;
    leaveForMessages();
    router.push(messagesHref(user.id));
  };
}

// Who the chat is with, and whether they have a page open now.
function ChatHeading({ meta, fallback }: { meta: ThreadMeta | null; fallback?: ChatUser }) {
  const t = useT();
  const user = meta?.with ?? fallback;
  if (!user) return <span className="flex-1" />;
  return (
    <Link href={userHref(user)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-ink hover:bg-raised hover:no-underline">
      <span className="relative shrink-0">
        <UserAvatar userName={user.userName} pictureUrl={user.pictureUrl} className="size-9 text-sm" />
        {meta?.online ? <span aria-hidden className="absolute right-0 bottom-0 size-3 rounded-full bg-emerald-500 ring-2 ring-panel" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold">{user.userName}</span>
        {meta?.online ? <span className="block text-xs text-muted">{t('dm.activeNow')}</span> : null}
      </span>
    </Link>
  );
}

// The navbar's Messenger button (lg and up): the chats panel under it, from
// which a chat opens as a window docked at the bottom of the screen.
export function MessengerButton({ className = '' }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const count = useUnreadChats(true);
  const startChat = useStartChat();

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={unreadLabel(t, count)}
        title={t('dm.title')}
        className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink aria-expanded:text-accent"
      >
        <span className="relative flex">
          <Icon name="message" className="size-5" />
          <Badge count={count} className="-top-1 -right-1.5" />
        </span>
      </button>
      {open ? (
        <div className="floating absolute right-0 z-50 mt-2 flex max-h-[min(640px,calc(100dvh-5rem))] w-[360px] flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-4 pt-3 pb-2">
            <h2 className="flex-1 text-2xl font-bold text-ink">{t('dm.title')}</h2>
            <Link
              href="/messages"
              onClick={() => {
                setOpen(false);
                leaveForMessages();
              }}
              aria-label={t('dm.seeAll')}
              title={t('dm.seeAll')}
              className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink"
            >
              <Icon name="expand" className="size-5" />
            </Link>
          </div>
          <ChatList
            active={open}
            onPick={(user) => {
              setOpen(false);
              startChat(user);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function ChatWindow({ user, onMinimize, onClose }: { user: ChatUser; onMinimize: () => void; onClose: () => void }) {
  const t = useT();
  const [meta, setMeta] = useState<ThreadMeta | null>(null);
  return (
    <section aria-label={user.userName} className="floating pointer-events-auto flex h-[455px] w-[328px] flex-col overflow-hidden rounded-b-none">
      <header className="flex items-center gap-1 border-b border-line px-1.5 py-1.5">
        <ChatHeading meta={meta} fallback={user} />
        <button
          type="button"
          onClick={onMinimize}
          aria-label={t('dm.minimize')}
          title={t('dm.minimize')}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-accent hover:bg-raised"
        >
          <Icon name="minus" className="size-5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          title={t('common.close')}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-accent hover:bg-raised"
        >
          <Icon name="close" className="size-5" />
        </button>
      </header>
      <ChatThread userId={user.id} active onMeta={setMeta} className="flex-1" />
    </section>
  );
}

// The chat windows along the bottom of a wide screen, with folded ones as
// faces at the right edge. A message from someone whose chat is not open
// arrives as a folded face with a count - still unread, as the Messenger
// button's badge says - except on /messages, which shows chats itself.
export function ChatDock() {
  const { user: me } = useSession();
  const pathname = usePathname();
  const chats = useDockedChats();
  const onMessagesPage = pathname === '/messages';

  useEffect(() => {
    if (!me || onMessagesPage) return;
    return onLive<DirectMessageEvent>('dm', (event) => {
      if (event.kind !== 'message' || event.message.senderId === me.id) return;
      chatMessageArrived(event.with);
    });
  }, [me, onMessagesPage]);

  if (!me || onMessagesPage || !chats.length) return null;
  const open = chats.filter((c) => !c.minimized);
  const folded = chats.filter((c) => c.minimized);
  return (
    <div className="pointer-events-none fixed right-4 bottom-0 z-40 hidden items-end gap-3 lg:flex">
      <div className="flex flex-row-reverse items-end gap-3">
        {open.map((c) => (
          <ChatWindow key={c.user.id} user={c.user} onMinimize={() => setChatMinimized(c.user.id, true)} onClose={() => closeChat(c.user.id)} />
        ))}
      </div>
      {folded.length ? (
        // Clear of the timeline's Tags / Filter / Today row in the same corner (FloatingControls, bottom-4).
        <div className="pointer-events-auto mb-16 flex flex-col-reverse gap-2">
          {folded.map((c) => (
            <span key={c.user.id} className="group relative">
              <button
                type="button"
                onClick={() => setChatMinimized(c.user.id, false)}
                title={c.user.userName}
                aria-label={c.user.userName}
                className="block rounded-full shadow-lg"
              >
                <UserAvatar userName={c.user.userName} pictureUrl={c.user.pictureUrl} className="size-12 text-base" />
              </button>
              {c.unread ? (
                <span className="pointer-events-none absolute -top-1 -left-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-[11px] leading-5 font-bold text-white ring-2 ring-page">
                  {c.unread > 9 ? '9+' : c.unread}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => closeChat(c.user.id)}
                aria-label={c.user.userName}
                className="absolute -top-1 -right-1 hidden size-5 items-center justify-center rounded-full bg-panel text-muted shadow ring-1 ring-line group-hover:flex hover:text-ink"
              >
                <Icon name="close" className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// The drawer's Messages row (below lg), leading to /messages.
export function DrawerMessages({ className, current, onClick }: { className: string; current: boolean; onClick?: () => void }) {
  const count = useUnreadChats(true);
  const t = useT();
  return (
    <Link href="/messages" aria-current={current ? 'page' : undefined} aria-label={unreadLabel(t, count)} onClick={onClick} className={className}>
      <span className="relative flex">
        <Icon name="message" className="size-6" />
        <Badge count={count} className="-top-1.5 -right-2" />
      </span>
      {t('dm.page')}
    </Link>
  );
}

// "Message" beside a person's Follow button. A visitor is sent to log in.
export function MessageButton({ user }: { user: ChatUser }) {
  const t = useT();
  const router = useRouter();
  const { user: me, isLoggedIn, status } = useSession();
  const startChat = useStartChat();
  if (me && me.id === user.id) return null;
  return (
    <button
      type="button"
      title={t('dm.messageName', { name: user.userName })}
      onClick={() => {
        if (isLoggedIn) startChat(user);
        else if (status === 'ready') router.push(authHrefHere());
      }}
      className="btn btn-secondary gap-1.5 rounded-full px-4 py-1.5"
    >
      <Icon name="message" className="size-4" />
      {t('dm.message')}
    </button>
  );
}

function MessagesPane() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const withId = Number(params.get('with')) || null;
  const [meta, setMeta] = useState<ThreadMeta | null>(null);
  // A phone opened this chat from the list here, which is one step back.
  const pickedHere = useRef(false);

  function pick(user: ChatUser) {
    if (isWide()) {
      router.replace(messagesHref(user.id));
    } else {
      pickedHere.current = true;
      router.push(messagesHref(user.id));
    }
  }

  // A phone's arrow in a chat: back to the list, or to the page whose
  // Message button opened the chat.
  function backFromChat() {
    if (pickedHere.current || backFromMessages()) {
      pickedHere.current = false;
      router.back();
    } else {
      router.replace('/messages');
    }
  }

  return (
    <div className="surface grid h-[calc(100dvh-52px)] overflow-hidden max-sm:rounded-none max-sm:border-x-0 grid-cols-[minmax(0,1fr)] sm:h-[calc(100dvh-52px-3rem)] lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className={`min-h-0 flex-col border-line pt-3 lg:flex lg:border-r ${withId ? 'hidden' : 'flex'}`}>
        <div className="flex items-center gap-1 px-4 pb-2">
          {/* Below lg the drawer's way back; wider, back to the page the chats panel was opened over. */}
          <BackToMenu />
          <button
            type="button"
            onClick={() => (backFromMessages() ? router.back() : router.push('/'))}
            aria-label={t('common.back')}
            title={t('common.back')}
            className="-ml-1.5 hidden shrink-0 rounded-full p-1.5 text-muted hover:bg-raised hover:text-ink lg:flex"
          >
            <Icon name="back" className="size-5" />
          </button>
          <h1 className="text-2xl font-bold text-ink">{t('dm.title')}</h1>
        </div>
        <ChatList active selectedId={withId} onPick={pick} />
      </div>
      {withId ? (
        <div className="flex min-h-0 flex-col">
          <header className="flex items-center gap-1 border-b border-line px-2 py-1.5">
            <button
              type="button"
              onClick={backFromChat}
              aria-label={t('common.back')}
              title={t('common.back')}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-accent hover:bg-raised lg:hidden"
            >
              <Icon name="back" className="size-5" />
            </button>
            <ChatHeading meta={meta?.with.id === withId ? meta : null} />
          </header>
          <ChatThread key={withId} userId={withId} active onMeta={setMeta} className="flex-1" />
        </div>
      ) : (
        <div className="hidden items-center justify-center p-8 text-center text-sm text-subtle lg:flex">{t('dm.pick')}</div>
      )}
    </div>
  );
}

// The /messages page: the chats beside the open one on a wide screen, one
// or the other on a phone.
export function MessagesView() {
  return (
    <Suspense fallback={null}>
      <MessagesPane />
    </Suspense>
  );
}
