'use client';

import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ReactionPicker } from '@/components/ui/ReactionPicker';
import { MessageMenu } from './MessageMenu';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api, ApiError, isEmailUnverified } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { onLive, onLiveReconnect } from '@/lib/client/liveFeed';
import type { ChatMessage, ChatUser, DirectMessageEvent } from '@/lib/client/messages';
import { useSession } from '@/lib/client/session';
import { COMMENT_REACTIONS } from '@/lib/commentReactions';
import { INTL_LOCALES } from '@/lib/i18n/config';

type Thread = {
  with: ChatUser;
  online: boolean;
  blocked: boolean;
  messages: ChatMessage[];
  hasMore: boolean;
  otherLastReadMessageId: number | null;
};

// A message on its way: shown at once, swapped for the saved one when the
// server answers, or marked to try again.
type Pending = { key: string; body: string; failed: boolean; replyToId: number | null };

// Messages this close together from one sender run as one group; a gap this
// long gets the time centred above it, as Messenger does.
const GROUP_MS = 5 * 60_000;
const STAMP_MS = 15 * 60_000;
const MAX_LENGTH = 4000;

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

// The text with its web addresses as links, escaped by React.
function Linked({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline">
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

// Only emoji, and few: shown large with no bubble, like a sent like.
const isEmojiOnly = (text: string) => /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u200d|\ufe0f|\s){1,12}$/u.test(text) && /\p{Extended_Pictographic}/u.test(text);

function stampOf(iso: string, locale: string) {
  const date = new Date(iso);
  const days = (Date.now() - date.getTime()) / 86_400_000;
  const options: Intl.DateTimeFormatOptions =
    days < 1 && new Date().getDate() === date.getDate()
      ? { hour: 'numeric', minute: '2-digit' }
      : days < 7
        ? { weekday: 'short', hour: 'numeric', minute: '2-digit' }
        : { month: 'short', day: 'numeric', year: days > 300 ? 'numeric' : undefined, hour: 'numeric', minute: '2-digit' };
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export type ThreadMeta = { with: ChatUser; online: boolean };

// The comments' smiley and bar of six, in the empty composer: picking one
// sends it. Escape or a press elsewhere shuts the bar.
function EmojiButton({ disabled, onPick }: { disabled: boolean; onPick: (emoji: string) => void }) {
  const t = useT();
  const pickerId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Element)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative flex shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('dm.emoji')}
        title={t('dm.emoji')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? pickerId : undefined}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`flex size-9 items-center justify-center rounded-full text-accent hover:bg-raised ${open ? 'bg-raised' : ''}`}
      >
        <Icon name="smile" className="size-5" />
      </button>
      {open ? (
        <ReactionPicker
          id={pickerId}
          mine={null}
          className="right-0"
          onPick={(name) => {
            setOpen(false);
            onPick(COMMENT_REACTIONS.find((r) => r.name === name)!.emoji);
          }}
        />
      ) : null}
    </span>
  );
}

// One chat, newest at the bottom: loads a page, fetches older ones when
// scrolled to the top, takes new messages and "Seen" marks off the live
// stream, and marks the chat read while it is on screen (`active`).
export function ChatThread({ userId, active, onMeta, className = '' }: { userId: number; active: boolean; onMeta?: (meta: ThreadMeta) => void; className?: string }) {
  const t = useT();
  const { user: me } = useSession();
  const [thread, setThread] = useState<Thread | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [draft, setDraft] = useState('');
  // The message the composer answers, if any ("Replying to").
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  // An answered message just jumped to, lit for a moment.
  const [flashId, setFlashId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const olderAnchor = useRef<number | null>(null);
  const markedRead = useRef(0);
  const nextKey = useRef(0);
  const metaRef = useRef(onMeta);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useLayoutEffect(() => {
    metaRef.current = onMeta;
  });

  // Mounted per chat (callers key it by user), so a new userId starts fresh.
  useEffect(() => {
    let cancelled = false;
    api
      .get<Thread>(`/api/messages/${userId}`)
      .then((next) => {
        if (cancelled) return;
        setThread(next);
        setFailed(false);
        metaRef.current?.({ with: next.with, online: next.online });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [userId, version]);

  useEffect(() => onLiveReconnect(() => setVersion((v) => v + 1)), []);

  useEffect(
    () =>
      onLive<DirectMessageEvent>('dm', (event) => {
        if (event.kind === 'update') {
          if (event.with.id === userId) replaceMessage(event.message);
        } else if (event.kind === 'message') {
          if (event.with.id !== userId) return;
          const { message } = event;
          setThread((current) =>
            current && !current.messages.some((m) => m.id === message.id) ? { ...current, messages: [...current.messages, message] } : current,
          );
          // Sent from this tab: the saved message stands in for the one on its way.
          if (me && message.senderId === me.id) {
            setPending((list) => {
              const i = list.findIndex((p) => !p.failed && p.body === message.body);
              return i < 0 ? list : [...list.slice(0, i), ...list.slice(i + 1)];
            });
          }
        } else if (event.userId === userId) {
          setThread((current) => (current ? { ...current, otherLastReadMessageId: Math.max(current.otherLastReadMessageId ?? 0, event.messageId) } : current));
        }
      }),
    [userId, me],
  );

  // A message changed (unsent): it, and every quote of it in a reply below.
  function replaceMessage(message: ChatMessage) {
    const quoted = { id: message.id, senderId: message.senderId, body: message.body, unsent: message.unsent };
    setThread((current) =>
      current
        ? {
            ...current,
            messages: current.messages.map((m) => (m.id === message.id ? message : m.replyTo?.id === message.id ? { ...m, replyTo: quoted } : m)),
          }
        : current,
    );
    setReplyTo((current) => (current?.id === message.id ? message : current));
  }

  // Read while it is on screen and the tab is in front.
  const last = thread?.messages[thread.messages.length - 1];
  useEffect(() => {
    if (!active || !last || last.senderId !== userId) return;
    const mark = () => {
      if (document.visibilityState !== 'visible' || markedRead.current >= last.id) return;
      markedRead.current = last.id;
      api.post(`/api/messages/${userId}/read`).catch(() => {
        markedRead.current = 0;
      });
    };
    mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [active, last, userId]);

  // New messages keep the view at the bottom unless the reader has scrolled
  // up; an older page keeps the message they were looking at in place.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (olderAnchor.current != null) {
      el.scrollTop = el.scrollHeight - olderAnchor.current;
      olderAnchor.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [thread?.messages, pending]);

  useEffect(() => {
    if (active) input.current?.focus({ preventScroll: true });
  }, [active, userId]);

  async function loadOlder() {
    const first = thread?.messages[0];
    if (!thread?.hasMore || !first || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const older = await api.get<Thread>(`/api/messages/${userId}?before=${first.id}`);
      olderAnchor.current = scroller.current ? scroller.current.scrollHeight - scroller.current.scrollTop : null;
      setThread((current) => (current ? { ...current, hasMore: older.hasMore, messages: [...older.messages, ...current.messages] } : current));
    } finally {
      setLoadingOlder(false);
    }
  }

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 60) void loadOlder();
  }

  async function send(body: string, replyToId: number | null, retryKey?: string) {
    const text = body.trim();
    if (!text || thread?.blocked) return;
    const key = retryKey ?? String(++nextKey.current);
    setPending((list) => (retryKey ? list.map((p) => (p.key === key ? { ...p, failed: false } : p)) : [...list, { key, body: text, failed: false, replyToId }]));
    stickToBottom.current = true;
    try {
      const { message } = await api.post<{ message: ChatMessage }>(`/api/messages/${userId}`, { body: text, replyToId });
      setThread((current) =>
        current && !current.messages.some((m) => m.id === message.id) ? { ...current, messages: [...current.messages, message] } : current,
      );
      setPending((list) => list.filter((p) => p.key !== key));
      setNotice(null);
    } catch (err) {
      if (isEmailUnverified(err)) setNotice(t('dm.verifyFirst'));
      else if (err instanceof ApiError && err.status === 403) setThread((current) => (current ? { ...current, blocked: true } : current));
      setPending((list) => list.map((p) => (p.key === key ? { ...p, failed: true } : p)));
    }
  }

  function submit() {
    if (!draft.trim()) return;
    void send(draft, replyTo?.id ?? null);
    setDraft('');
    setReplyTo(null);
    requestAnimationFrame(() => input.current?.focus());
  }

  function startReply(message: ChatMessage) {
    setReplyTo(message);
    input.current?.focus();
  }

  // To the answered message, when it is on the page, lit for a moment.
  function jumpTo(id: number) {
    const row = scroller.current?.querySelector(`[data-message="${id}"]`);
    if (!row) return;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setFlashId(id);
    setTimeout(() => setFlashId((current) => (current === id ? null : current)), 1500);
  }

  // Who answered whom, as the line over a reply and the composer's bar say it.
  const replyLine = (m: { senderId: number }, to: { senderId: number }) => {
    const name = thread?.with.userName ?? '';
    if (m.senderId === me?.id) return to.senderId === me?.id ? t('dm.youRepliedSelf') : t('dm.youRepliedTo', { name });
    return to.senderId === m.senderId ? t('dm.theyRepliedSelf', { name }) : t('dm.theyRepliedYou', { name });
  };
  // An unsent original reads as the unsent message itself does.
  const quoteOf = (to: { senderId: number; body: string; unsent: boolean }) =>
    to.unsent ? (to.senderId === me?.id ? t('dm.youUnsent') : t('dm.theyUnsent', { name: thread?.with.userName ?? '' })) : to.body;

  const locale = INTL_LOCALES[t.locale];
  const messages = thread?.messages ?? [];
  const other = thread?.with;
  // The other side's face goes under the newest message they have seen, when
  // that one is the viewer's (their own they have seen by writing it).
  const seenAt = thread?.otherLastReadMessageId ? [...messages].reverse().find((m) => m.id <= thread.otherLastReadMessageId!) : undefined;
  const seenId = seenAt && me && seenAt.senderId === me.id ? seenAt.id : null;

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {failed ? (
          <div className="py-8 text-center text-sm text-subtle">
            {t('common.somethingWrong')}{' '}
            <button type="button" className="text-link" onClick={reload}>
              {t('common.retry')}
            </button>
          </div>
        ) : !thread ? (
          <div className="py-8 text-center text-sm text-subtle">{t('common.loading')}</div>
        ) : (
          <>
            {loadingOlder ? <div className="py-2 text-center text-xs text-subtle">{t('common.loading')}</div> : null}
            {!thread.hasMore && other ? (
              <div className="flex flex-col items-center gap-2 pt-4 pb-6 text-center">
                <UserAvatar userName={other.userName} pictureUrl={other.pictureUrl} className="size-16 text-xl" />
                <span className="font-semibold text-ink">{other.userName}</span>
                {!messages.length && !thread.blocked ? <span className="text-sm text-muted">{t('dm.sayHi', { name: other.userName })}</span> : null}
              </div>
            ) : null}
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const at = Date.parse(m.utcCreatedDateTime);
              const stamp = !prev || at - Date.parse(prev.utcCreatedDateTime) > STAMP_MS;
              const joinsNext = next && next.senderId === m.senderId && Date.parse(next.utcCreatedDateTime) - at < GROUP_MS;
              const joinsPrev = prev && !stamp && prev.senderId === m.senderId && at - Date.parse(prev.utcCreatedDateTime) < GROUP_MS;
              const mine = m.senderId === me?.id;
              const emoji = !m.unsent && isEmojiOnly(m.body);
              const reply = (
                <button
                  type="button"
                  aria-label={t('dm.reply')}
                  title={t('dm.reply')}
                  onClick={() => startReply(m)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink"
                >
                  <Icon name="reply" className="size-4" />
                </button>
              );
              const menu =
                other && !m.unsent ? (
                  // Beside the bubble on hover, always there on a touch screen, as on comments.
                  <span className="flex shrink-0 items-center self-center opacity-0 transition-opacity group-hover/message:opacity-100 has-[[aria-expanded=true]]:opacity-100 has-[:focus-visible]:opacity-100 [@media(hover:none)]:opacity-100">
                    {mine ? null : reply}
                    <MessageMenu message={m} mine={mine} withUser={other} align={mine ? 'end' : 'start'} onChange={replaceMessage} />
                    {mine ? reply : null}
                  </span>
                ) : null;
              return (
                <Fragment key={m.id}>
                  {stamp ? <div className="py-3 text-center text-xs text-subtle">{stampOf(m.utcCreatedDateTime, locale)}</div> : null}
                  {m.replyTo ? (
                    <div className={`mt-2 flex items-center gap-1 text-xs text-subtle ${mine ? 'justify-end' : 'pl-9'}`}>
                      <Icon name="reply" className="size-3" />
                      {replyLine(m, m.replyTo)}
                    </div>
                  ) : null}
                  <div
                    data-message={m.id}
                    className={`group/message flex items-end gap-2 rounded-[18px] transition-colors ${flashId === m.id ? 'bg-accent/10' : ''} ${mine ? 'justify-end' : ''} ${joinsPrev || m.replyTo ? 'mt-0.5' : 'mt-2'}`}
                  >
                    {mine ? menu : null}
                    {!mine ? (
                      <span className="size-7 shrink-0">
                        {!joinsNext && other ? <UserAvatar userName={other.userName} pictureUrl={other.pictureUrl} className="size-7 text-[10px]" /> : null}
                      </span>
                    ) : null}
                    <div className={`flex max-w-[75%] min-w-0 flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      {m.replyTo ? (
                        // The answered message, faded, tucked under the reply's bubble.
                        <button
                          type="button"
                          onClick={() => jumpTo(m.replyTo!.id)}
                          className={`-mb-2.5 line-clamp-2 max-w-full rounded-[18px] px-3 pt-1.5 pb-3.5 text-left text-[13px] leading-snug break-words whitespace-pre-wrap text-muted hover:text-ink ${
                            m.replyTo.unsent ? 'italic ring-1 ring-line ring-inset' : 'bg-raised'
                          }`}
                        >
                          {quoteOf(m.replyTo)}
                        </button>
                      ) : null}
                      <div
                        title={stampOf(m.utcCreatedDateTime, locale)}
                        className={`relative ${
                          m.unsent
                            ? 'rounded-[18px] px-3 py-1.5 text-[15px] leading-snug text-muted italic ring-1 ring-line ring-inset'
                            : emoji
                              ? 'text-4xl leading-tight'
                              : `max-w-full rounded-[18px] px-3 py-1.5 text-[15px] leading-snug break-words whitespace-pre-wrap ${
                                  mine ? 'bg-accent text-white' : 'bg-raised-2 text-ink'
                                }`
                        }`}
                      >
                        {m.unsent ? (mine ? t('dm.youUnsent') : t('dm.theyUnsent', { name: other?.userName ?? '' })) : <Linked text={m.body} />}
                      </div>
                    </div>
                    {!mine ? menu : null}
                  </div>
                  {seenId === m.id && other ? (
                    <div className="mt-1 flex justify-end" title={t('dm.seenBy', { name: other.userName })}>
                      <UserAvatar userName={other.userName} pictureUrl={other.pictureUrl} className="size-3.5 text-[6px]" />
                    </div>
                  ) : null}
                </Fragment>
              );
            })}
            {pending.map((p) => (
              <div key={p.key} className="mt-2 flex flex-col items-end">
                <div className={`max-w-[75%] rounded-[18px] px-3 py-1.5 text-[15px] leading-snug break-words whitespace-pre-wrap ${isEmojiOnly(p.body) ? 'bg-transparent text-4xl' : 'bg-accent text-white'} ${p.failed ? 'opacity-50' : 'opacity-70'}`}>
                  {p.body}
                </div>
                {p.failed ? (
                  <button type="button" className="mt-0.5 text-xs text-danger" onClick={() => void send(p.body, p.replyToId, p.key)}>
                    {t('dm.notSent')}
                  </button>
                ) : null}
              </div>
            ))}
          </>
        )}
      </div>

      {thread?.blocked ? (
        <div className="border-t border-line px-4 py-3 text-center text-sm text-muted">{t('dm.blocked')}</div>
      ) : (
        <div className="border-t border-line px-2 py-2">
          {notice ? <div className="px-2 pb-1.5 text-xs text-warning">{notice}</div> : null}
          {replyTo ? (
            <div className="flex items-start gap-2 px-2 pb-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-ink">
                  {replyTo.senderId === me?.id ? t('dm.replyingToSelf') : t('dm.replyingTo', { name: other?.userName ?? '' })}
                </div>
                <div className="truncate text-xs text-muted">{quoteOf(replyTo)}</div>
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                aria-label={t('dm.cancelReply')}
                title={t('dm.cancelReply')}
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink"
              >
                <Icon name="close" className="size-3.5" />
              </button>
            </div>
          ) : null}
          <form
            className="flex items-end gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <textarea
              ref={input}
              rows={1}
              value={draft}
              maxLength={MAX_LENGTH}
              placeholder={t('dm.compose')}
              aria-label={t('dm.compose')}
              disabled={!thread}
              onChange={(event) => {
                setDraft(event.target.value);
                const el = event.target;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
              onKeyDown={(event) => {
                // Enter sends; Shift+Enter is a new line. Not while an input
                // method is composing (Japanese, Chinese, Korean), where Enter
                // picks the characters.
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  submit();
                } else if (event.key === 'Escape' && replyTo) {
                  event.preventDefault();
                  setReplyTo(null);
                }
              }}
              className="max-h-[120px] min-h-9 flex-1 resize-none rounded-[18px] bg-field px-3.5 py-2 text-[15px] leading-5 text-ink placeholder:text-subtle focus:outline-none"
            />
            {draft.trim() ? (
              <button type="submit" aria-label={t('dm.send')} title={t('dm.send')} className="flex size-9 shrink-0 items-center justify-center rounded-full text-accent hover:bg-raised">
                <Icon name="send" className="size-5" />
              </button>
            ) : (
              <EmojiButton
                disabled={!thread}
                onPick={(emoji) => {
                  void send(emoji, replyTo?.id ?? null);
                  setReplyTo(null);
                }}
              />
            )}
          </form>
        </div>
      )}
    </div>
  );
}
