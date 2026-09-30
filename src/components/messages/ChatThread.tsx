'use client';

import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { ReactionPicker } from '@/components/ui/ReactionPicker';
import { MessageMenu } from './MessageMenu';
import { ChatListingBar } from '@/components/listings/ChatListingBar';
import type { ChatListing } from '@/lib/listings';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { blobUrl } from '@/lib/appConfig';
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
  // The listings the chat is about (0095), for the bar over it.
  listings?: ChatListing[];
};

// A message on its way: shown at once, swapped for the saved one when the
// server answers, or marked to try again.
type Pending = { key: string; body: string; images: string[]; failed: boolean; replyToId: number | null };

// A photo in the composer: shown from the file at once, sendable once the
// upload names it.
type Draft = { key: string; preview: string; name: string | null };

// Messages this close together from one sender run as one group; a gap this
// long gets the time centred above it, as Messenger does.
const GROUP_MS = 5 * 60_000;
const STAMP_MS = 15 * 60_000;
const MAX_LENGTH = 4000;
const MAX_PHOTOS = 10;
const PHOTO_MAX_BYTES = 15 * 1024 * 1024;

const sameImages = (a: string[], b: string[]) => a.length === b.length && a.every((name, i) => name === b[i]);

// A message's photos, above its text: one at a natural size, several as a
// grid of squares. A press shows one full size.
function Photos({ images, onOpen }: { images: string[]; onOpen: (src: string) => void }) {
  const t = useT();
  if (images.length === 1) {
    const src = blobUrl(images[0])!;
    return (
      <button type="button" onClick={() => onOpen(src)} aria-label={t('dm.viewPhoto')} className="block overflow-hidden rounded-[18px] bg-raised">
        <img src={src} alt="" className="max-h-72 max-w-full object-contain" />
      </button>
    );
  }
  return (
    <div className={`grid gap-0.5 overflow-hidden rounded-[18px] ${images.length === 2 || images.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {images.map((name) => {
        const src = blobUrl(name)!;
        return (
          <button key={name} type="button" onClick={() => onOpen(src)} aria-label={t('dm.viewPhoto')} className="block size-24 bg-raised sm:size-28">
            <img src={src} alt="" className="size-full object-cover" />
          </button>
        );
      })}
    </div>
  );
}

// One photo full size over the page; Escape or a press anywhere shuts it.
function PhotoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const t = useT();
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t('dm.viewPhoto')} onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <button type="button" aria-label={t('common.close')} className="absolute top-3 end-3 flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10">
        <Icon name="close" className="size-6" />
      </button>
      <img src={src} alt="" className="max-h-full max-w-full object-contain" />
    </div>,
    document.body,
  );
}

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
          className="end-0"
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
  const [photos, setPhotos] = useState<Draft[]>([]);
  const [viewing, setViewing] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
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
  const listingIds = useRef(new Set<number>());
  useEffect(() => {
    listingIds.current = new Set((thread?.listings ?? []).map((l) => l.id));
  }, [thread?.listings]);

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
          // A question about a listing the bar does not show yet: load it.
          if (message.listingId && !listingIds.current.has(message.listingId)) setVersion((v) => v + 1);
          setThread((current) =>
            current && !current.messages.some((m) => m.id === message.id) ? { ...current, messages: [...current.messages, message] } : current,
          );
          // Sent from this tab: the saved message stands in for the one on its way.
          if (me && message.senderId === me.id) {
            setPending((list) => {
              const i = list.findIndex((p) => !p.failed && p.body === message.body && sameImages(p.images, message.images));
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
    const quoted = { id: message.id, senderId: message.senderId, body: message.body, images: message.images.length, unsent: message.unsent };
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

  async function send(body: string, replyToId: number | null, images: string[] = [], retryKey?: string) {
    const text = body.trim();
    if ((!text && !images.length) || thread?.blocked) return;
    const key = retryKey ?? String(++nextKey.current);
    setPending((list) => (retryKey ? list.map((p) => (p.key === key ? { ...p, failed: false } : p)) : [...list, { key, body: text, images, failed: false, replyToId }]));
    stickToBottom.current = true;
    try {
      const { message } = await api.post<{ message: ChatMessage }>(`/api/messages/${userId}`, { body: text, images, replyToId });
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

  const uploading = photos.some((p) => !p.name);
  const canSend = !uploading && (!!draft.trim() || photos.length > 0);

  function submit() {
    if (!canSend) return;
    void send(draft, replyTo?.id ?? null, photos.map((p) => p.name!));
    for (const p of photos) URL.revokeObjectURL(p.preview);
    setDraft('');
    setPhotos([]);
    setReplyTo(null);
    if (input.current) input.current.style.height = 'auto';
    requestAnimationFrame(() => input.current?.focus());
  }

  // Photos pasted, dropped or picked: each is uploaded at once and shown
  // while it goes; one that fails is taken off with a note.
  function addPhotos(files: File[]) {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length || !thread || thread.blocked) return;
    const room = MAX_PHOTOS - photos.length;
    if (images.length > room) setNotice(t('dm.tooManyPhotos', { count: MAX_PHOTOS }));
    for (const file of images.slice(0, Math.max(room, 0))) {
      if (file.size > PHOTO_MAX_BYTES) {
        setNotice(t('dm.photoTooLarge'));
        continue;
      }
      const key = `photo-${++nextKey.current}`;
      const preview = URL.createObjectURL(file);
      setPhotos((list) => [...list, { key, preview, name: null }]);
      const form = new FormData();
      form.append('file', file);
      api
        .post<{ name: string }>('/api/messages/media', form)
        .then(({ name }) => setPhotos((list) => list.map((p) => (p.key === key ? { ...p, name } : p))))
        .catch((err) => {
          setNotice(isEmailUnverified(err) ? t('dm.verifyFirst') : t('dm.photoFailed'));
          URL.revokeObjectURL(preview);
          setPhotos((list) => list.filter((p) => p.key !== key));
        });
    }
    input.current?.focus();
  }

  function removePhoto(key: string) {
    setPhotos((list) => {
      const gone = list.find((p) => p.key === key);
      if (gone) URL.revokeObjectURL(gone.preview);
      return list.filter((p) => p.key !== key);
    });
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
  const quoteOf = (to: { senderId: number; body: string; images: number | string[]; unsent: boolean }) =>
    to.unsent
      ? to.senderId === me?.id
        ? t('dm.youUnsent')
        : t('dm.theyUnsent', { name: thread?.with.userName ?? '' })
      : to.body || t('dm.photos', { count: typeof to.images === 'number' ? to.images : to.images.length });

  const locale = INTL_LOCALES[t.locale];
  const messages = thread?.messages ?? [];
  const other = thread?.with;
  // The other side's face goes under the newest message they have seen, when
  // that one is the viewer's (their own they have seen by writing it).
  const seenAt = thread?.otherLastReadMessageId ? [...messages].reverse().find((m) => m.id <= thread.otherLastReadMessageId!) : undefined;
  const seenId = seenAt && me && seenAt.senderId === me.id ? seenAt.id : null;

  return (
    <div
      className={`relative flex min-h-0 flex-col ${className}`}
      onDragOver={(event) => {
        if (!thread || thread.blocked || !event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        setDragging(false);
        addPhotos([...event.dataTransfer.files]);
      }}
    >
      {dragging ? (
        <div className="pointer-events-none absolute inset-1 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-surface/80 text-sm font-semibold text-accent">
          {t('dm.dropPhotos')}
        </div>
      ) : null}
      {viewing ? <PhotoViewer src={viewing} onClose={() => setViewing(null)} /> : null}
      {thread?.listings?.length && me && other ? (
        <ChatListingBar
          listings={thread.listings}
          messages={messages}
          me={me.id}
          other={other}
          onRated={(listingId, rating) =>
            setThread((current) => (current ? { ...current, listings: current.listings?.map((l) => (l.id === listingId ? { ...l, myRating: rating } : l)) } : current))
          }
        />
      ) : null}
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
              const emoji = !m.unsent && !m.images.length && isEmojiOnly(m.body);
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
                    <div className={`mt-2 flex items-center gap-1 text-xs text-subtle ${mine ? 'justify-end' : 'ps-9'}`}>
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
                          className={`-mb-2.5 line-clamp-2 max-w-full rounded-[18px] px-3 pt-1.5 pb-3.5 text-start text-[13px] leading-snug break-words whitespace-pre-wrap text-muted hover:text-ink ${
                            m.replyTo.unsent ? 'italic ring-1 ring-line ring-inset' : 'bg-raised'
                          }`}
                        >
                          {quoteOf(m.replyTo)}
                        </button>
                      ) : null}
                      {!m.unsent && m.images.length ? (
                        <div title={stampOf(m.utcCreatedDateTime, locale)} className={`max-w-full ${m.body ? 'mb-0.5' : ''}`}>
                          <Photos images={m.images} onOpen={setViewing} />
                        </div>
                      ) : null}
                      {m.unsent || m.body ? (
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
                      ) : null}
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
                {p.images.length ? (
                  <div className={`mb-0.5 max-w-[75%] ${p.failed ? 'opacity-50' : 'opacity-70'}`}>
                    <Photos images={p.images} onOpen={setViewing} />
                  </div>
                ) : null}
                {p.body ? (
                  <div
                    className={`max-w-[75%] rounded-[18px] px-3 py-1.5 text-[15px] leading-snug break-words whitespace-pre-wrap ${!p.images.length && isEmojiOnly(p.body) ? 'bg-transparent text-4xl' : 'bg-accent text-white'} ${p.failed ? 'opacity-50' : 'opacity-70'}`}
                  >
                    {p.body}
                  </div>
                ) : null}
                {p.failed ? (
                  <button type="button" className="mt-0.5 text-xs text-danger" onClick={() => void send(p.body, p.replyToId, p.images, p.key)}>
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
          {photos.length ? (
            <div className="flex gap-2 overflow-x-auto px-2 pt-1.5 pb-2">
              {photos.map((p) => (
                <div key={p.key} className="relative size-16 shrink-0">
                  <img src={p.preview} alt="" className={`size-full rounded-xl object-cover ${p.name ? '' : 'opacity-50'}`} />
                  {p.name ? null : (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(p.key)}
                    aria-label={t('dm.removePhoto')}
                    title={t('dm.removePhoto')}
                    className="absolute -top-1.5 -end-1.5 flex size-5 items-center justify-center rounded-full bg-raised-2 text-ink shadow ring-1 ring-line"
                  >
                    <Icon name="close" className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <form
            className="flex items-end gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                addPhotos([...(event.target.files ?? [])]);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              aria-label={t('dm.addPhoto')}
              title={t('dm.addPhoto')}
              disabled={!thread || photos.length >= MAX_PHOTOS}
              onClick={() => fileInput.current?.click()}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-accent hover:bg-raised disabled:opacity-40"
            >
              <Icon name="image" className="size-5" />
            </button>
            <textarea
              ref={input}
              rows={1}
              value={draft}
              maxLength={MAX_LENGTH}
              placeholder={t('dm.compose')}
              aria-label={t('dm.compose')}
              disabled={!thread}
              onPaste={(event) => {
                // A copied picture (a screenshot, "Copy image") is attached.
                // Text wins when there is some: Word and others put a picture
                // of the copied text on the clipboard beside it.
                const files = [...event.clipboardData.files].filter((f) => f.type.startsWith('image/'));
                if (!files.length || event.clipboardData.getData('text/plain')) return;
                event.preventDefault();
                addPhotos(files);
              }}
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
            {draft.trim() || photos.length ? (
              <button
                type="submit"
                disabled={!canSend}
                aria-label={t('dm.send')}
                title={t('dm.send')}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-accent hover:bg-raised disabled:opacity-40"
              >
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
