'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { onLive, onLiveReconnect } from '@/lib/client/liveFeed';
import type { ChatMessage, ChatUser, DirectMessageEvent } from '@/lib/client/messages';
import { useSession } from '@/lib/client/session';
import { timeAgo } from '@/lib/format';

export type Conversation = {
  id: number;
  other: ChatUser;
  lastMessage: ChatMessage;
  unread: boolean;
  otherLastReadMessageId: number | null;
  online: boolean;
};

// The viewer's chats, loaded while `active` and kept current off the live
// stream: a new message moves its chat to the top, a read clears or moves
// the marks.
function useConversations(active: boolean) {
  const { user: me } = useSession();
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    api
      .get<{ conversations: Conversation[] }>('/api/messages')
      .then((res) => !cancelled && setItems(res.conversations))
      .catch(() => !cancelled && setItems((current) => current ?? []));
    return () => {
      cancelled = true;
    };
  }, [active, version]);

  useEffect(() => (active ? onLiveReconnect(() => setVersion((v) => v + 1)) : undefined), [active]);

  useEffect(() => {
    if (!active) return;
    return onLive<DirectMessageEvent>('dm', (event) => {
      if (event.kind === 'update') {
        const { message } = event;
        setItems((list) => list?.map((c) => (c.lastMessage.id === message.id ? { ...c, lastMessage: message } : c)) ?? null);
      } else if (event.kind === 'message') {
        const { message } = event;
        setItems((list) => {
          if (!list) return list;
          const found = list.find((c) => c.other.id === event.with.id);
          const updated: Conversation = {
            id: message.conversationId,
            other: found?.other ?? event.with,
            lastMessage: message,
            unread: message.senderId !== me?.id,
            otherLastReadMessageId: found?.otherLastReadMessageId ?? null,
            online: found?.online ?? false,
          };
          return [updated, ...list.filter((c) => c.other.id !== event.with.id)];
        });
      } else {
        setItems((list) =>
          list?.map((c) => {
            if (c.id !== event.conversationId) return c;
            return event.userId === me?.id ? { ...c, unread: false } : { ...c, otherLastReadMessageId: event.messageId };
          }) ?? null,
        );
      }
    });
  }, [active, me?.id]);

  return items;
}

// People to start a chat with, for what is typed in the search box.
function usePeople(query: string) {
  const q = query.trim();
  const [found, setFound] = useState<{ q: string; people: ChatUser[] }>({ q: '', people: [] });
  useEffect(() => {
    if (!q) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .get<{ people: ChatUser[] }>(`/api/messages/people?q=${encodeURIComponent(q)}`)
        .then((res) => !cancelled && setFound({ q, people: res.people }))
        .catch(() => !cancelled && setFound({ q, people: [] }));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);
  return q && found.q === q ? found.people : [];
}

function Face({ user, online, className }: { user: ChatUser; online?: boolean; className: string }) {
  return (
    <span className="relative shrink-0">
      <UserAvatar userName={user.userName} pictureUrl={user.pictureUrl} className={className} />
      {online ? <span aria-hidden className="absolute right-0 bottom-0 size-3.5 rounded-full bg-emerald-500 ring-2 ring-panel" /> : null}
    </span>
  );
}

const handleOf = (user: ChatUser) => user.userName.replace(/^@+/, '').toLowerCase();

// The chats with a search box and All / Unread tabs, as Messenger's panel
// has them. Typing also finds people to start a new chat with.
export function ChatList({
  active,
  onPick,
  selectedId,
  listClassName = '',
}: {
  active: boolean;
  onPick: (user: ChatUser) => void;
  selectedId?: number | null;
  listClassName?: string;
}) {
  const t = useT();
  const { user: me } = useSession();
  const items = useConversations(active);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const people = usePeople(query);

  const q = query.trim().replace(/^@+/, '').toLowerCase();
  const shown = (items ?? []).filter((c) => (tab === 'all' || c.unread) && (!q || handleOf(c.other).includes(q)));
  const talking = new Set((items ?? []).map((c) => c.other.id));
  const newPeople = people.filter((p) => !talking.has(p.id));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 pb-2">
        <label className="flex items-center gap-2 rounded-full bg-field px-3 py-2 text-sm text-ink focus-within:ring-2 focus-within:ring-link">
          <Icon name="search" className="size-4 shrink-0 text-subtle" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('dm.search')}
            aria-label={t('dm.search')}
            className="min-w-0 flex-1 bg-transparent placeholder:text-subtle focus:outline-none"
          />
        </label>
        <div role="tablist" className="mt-2 flex gap-1">
          {(['all', 'unread'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === key ? 'bg-accent/15 text-accent' : 'text-ink hover:bg-raised'}`}
            >
              {key === 'all' ? t('common.all') : t('dm.unread')}
            </button>
          ))}
        </div>
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5 ${listClassName}`}>
        {items === null ? (
          <div className="px-4 py-6 text-center text-sm text-subtle">{t('common.loading')}</div>
        ) : (
          <>
            {shown.length === 0 && !newPeople.length ? (
              <div className="px-4 py-6 text-center text-sm text-subtle">
                {q ? t('dm.noOne') : tab === 'unread' ? t('dm.noUnread') : t('dm.empty')}
              </div>
            ) : null}
            <ul>
              {shown.map((c) => {
                const mine = c.lastMessage.senderId === me?.id;
                const seen = mine && (c.otherLastReadMessageId ?? 0) >= c.lastMessage.id;
                const preview = c.lastMessage.unsent
                  ? mine
                    ? t('dm.youUnsent')
                    : t('dm.theyUnsent', { name: c.other.userName })
                  : mine
                    ? t('dm.you', { text: c.lastMessage.body })
                    : c.lastMessage.body;
                return (
                  <li key={c.other.id}>
                    <button
                      type="button"
                      onClick={() => onPick(c.other)}
                      aria-current={selectedId === c.other.id ? 'true' : undefined}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-raised aria-[current=true]:bg-raised-2"
                    >
                      <Face user={c.other} online={c.online} className="size-14 text-lg" />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[15px] text-ink ${c.unread ? 'font-bold' : 'font-medium'}`}>{c.other.userName}</span>
                        <span className={`flex gap-1 text-[13px] ${c.unread ? 'font-semibold text-ink' : 'text-muted'}`}>
                          <span className="min-w-0 truncate">{preview}</span>
                          <span aria-hidden className="shrink-0">
                            · {timeAgo(c.lastMessage.utcCreatedDateTime, undefined, t.locale)}
                          </span>
                        </span>
                      </span>
                      {c.unread ? (
                        <span aria-label={t('dm.unread')} className="size-3 shrink-0 rounded-full bg-accent" />
                      ) : seen ? (
                        <span title={t('dm.seenBy', { name: c.other.userName })} className="shrink-0">
                          <UserAvatar userName={c.other.userName} pictureUrl={c.other.pictureUrl} className="size-4 text-[7px]" />
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            {newPeople.length ? (
              <>
                <div className="px-2 pt-2 pb-1 text-xs font-semibold tracking-wider text-subtle uppercase">{t('dm.people')}</div>
                <ul>
                  {newPeople.map((person) => (
                    <li key={person.id}>
                      <button type="button" onClick={() => onPick(person)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-raised">
                        <Face user={person} className="size-10 text-sm" />
                        <span className="truncate text-[15px] font-medium text-ink">{person.userName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
