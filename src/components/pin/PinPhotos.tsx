'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/listings/parts';
import { AuthLink } from '@/components/nav/AuthLink';
import { Icon } from '@/components/ui/Icon';
import { api, ApiError, isEmailUnverified } from '@/lib/client/api';
import { blobUrl } from '@/lib/appConfig';
import { COMMENT_REACTIONS, type CommentReactionName } from '@/lib/commentReactions';
import { useT } from '@/lib/client/i18n';
import { usePendingAction } from '@/lib/client/pendingAction';
import { useSession } from '@/lib/client/session';

type PinPhotoJson = {
  id: number;
  blobName: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  userName: string;
  mine: boolean;
  flagged: boolean;
  hidden: boolean;
  userPhotoCount: number;
  reactions: Partial<Record<CommentReactionName, number>>;
  myReaction: CommentReactionName | null;
};

// Photos in the pane's preview strip; the rest are in the grid.
const PREVIEW_COUNT = 3;
const MAX_BYTES = 15 * 1024 * 1024;

const REASONS = ['wrong', 'inappropriate', 'spam', 'private', 'other'] as const;
type Reason = (typeof REASONS)[number];
const REASON_KEY = {
  wrong: 'photos.reasonWrong',
  inappropriate: 'photos.reasonInappropriate',
  spam: 'photos.reasonSpam',
  private: 'photos.reasonPrivate',
  other: 'photos.reasonOther',
} as const;

// Photos readers took themselves, in a pane of their own beside the pin's
// sourced media. One "Add photos" button at the top right: on a phone the
// system picker offers the camera as well as the library. Adding needs a
// signed-up user; any signed-in reader can flag a photo that is wrong, and
// enough flags hide it.
export function PinPhotos({ pinId }: { pinId: number }) {
  const t = useT();
  const { isLoggedIn, status } = useSession();
  const [photos, setPhotos] = useState<PinPhotoJson[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  // The grid of every photo, and the index of the one open large over it (or over the pane).
  const [grid, setGrid] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  // Back from logging in to add photos: said so, and the pane brought into view.
  const [welcome, setWelcome] = useState(false);
  const sectionRef = usePendingAction<HTMLElement>(
    { kind: 'photo', id: pinId },
    isLoggedIn,
    useCallback(() => {
      setWelcome(true);
      setGrid(true);
    }, []),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api
      .get<PinPhotoJson[]>(`/api/pins/${pinId}/photos`)
      .then(setPhotos)
      .catch(() => {});
  }, [pinId]);
  // Read again once the session is known, so a reader's own and flagged photos are marked.
  useEffect(load, [load, isLoggedIn]);

  // The object URLs for the chosen files, made when they are chosen and let go of when cleared.
  const urls = useRef<string[]>([]);
  function choose(next: File[]) {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current = next.map((file) => URL.createObjectURL(file));
    setPreviews(urls.current);
    setFiles(next);
  }
  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!picked.length) return;
    setError('');
    if (picked.some((file) => !file.type.startsWith('image/'))) return setError(t('photos.notImage'));
    if (picked.some((file) => file.size > MAX_BYTES)) return setError(t('photos.tooLarge'));
    choose(picked);
    // What was chosen is captioned and sent in the modal.
    setGrid(true);
  }

  // Uploads the chosen photos one after another; on a failure the ones not
  // yet sent stay chosen.
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!files.length || sending) return;
    setSending(true);
    setError('');
    const remaining = [...files];
    try {
      while (remaining.length) {
        const form = new FormData();
        form.set('file', remaining[0]);
        // One caption belongs to one photo.
        if (files.length === 1 && caption.trim()) form.set('caption', caption.trim());
        const created = await api.post<PinPhotoJson>(`/api/pins/${pinId}/photos`, form);
        setPhotos((list) => [created, ...list]);
        remaining.shift();
      }
      setCaption('');
    } catch (err) {
      setError(
        isEmailUnverified(err)
          ? t('verifyEmail.required')
          : err instanceof ApiError && err.status === 429
            ? t('photos.tooMany')
            : err instanceof ApiError && err.status === 413
              ? t('photos.tooLarge')
              : t('photos.failed'),
      );
    } finally {
      choose(remaining);
      setSending(false);
    }
  }

  async function remove(id: number) {
    setPhotos((list) => list.filter((p) => p.id !== id));
    await api.delete(`/api/pins/${pinId}/photos/${id}`).catch(load);
  }

  async function flag(id: number, reason: Reason) {
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, flagged: true } : p)));
    try {
      const res = await api.post<{ hidden: boolean }>(`/api/pins/${pinId}/photos/${id}/flag`, { reason });
      if (res.hidden) setPhotos((list) => list.filter((p) => p.id !== id || p.mine));
    } catch {
      load();
    }
  }

  // A reaction, a different one in its place, or null to take it back.
  async function react(id: number, reaction: CommentReactionName | null) {
    const photo = photos.find((p) => p.id === id);
    if (!photo) return;
    const before = { reactions: photo.reactions ?? {}, myReaction: photo.myReaction ?? null };
    const counts = { ...before.reactions };
    if (before.myReaction) counts[before.myReaction] = Math.max(0, (counts[before.myReaction] ?? 1) - 1);
    if (reaction) counts[reaction] = (counts[reaction] ?? 0) + 1;
    const set = (patch: Partial<PinPhotoJson>) => setPhotos((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    set({ reactions: counts, myReaction: reaction });
    try {
      set(await api.put<typeof before>(`/api/pins/${pinId}/photos/${id}/reaction`, { reaction }));
    } catch {
      set(before);
    }
  }

  return (
    <section ref={sectionRef} aria-labelledby="photos-heading" className="surface mt-6 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <h2 id="photos-heading" className="flex min-w-0 items-center gap-2 pt-1 text-base font-semibold">
          <Icon name="image" className="size-4 shrink-0 text-link" />
          {t('photos.heading')}
          {photos.length ? <span className="text-sm font-normal text-subtle">{t('photos.total', { count: photos.length })}</span> : null}
        </h2>
        {/* Adding happens in the photos modal, whose own button opens this picker. No `capture`: a phone's sheet offers Take Photo, Photo Library and Files. */}
        {isLoggedIn ? <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={pick} /> : null}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-subtle">{t('photos.explainer')}</p>

      {error && !grid ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {photos.length ? (
        <>
          {/* A strip of the first few, as Yelp shows them: any tile opens the grid of all. */}
          <div className="relative mt-3 grid grid-cols-3 overflow-hidden rounded-xl">
            {photos.slice(0, PREVIEW_COUNT).map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setGrid(true)}
                aria-label={t('photos.seeAll', { count: photos.length })}
                className="relative block h-36 cursor-pointer overflow-hidden bg-raised sm:h-48"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a stored reader photo */}
                <img
                  src={blobUrl(photo.blobName)}
                  alt={photo.caption || t('photos.altBy', { name: photo.userName })}
                  loading="lazy"
                  className={`size-full object-cover transition-transform duration-200 hover:scale-105 motion-reduce:transition-none ${photo.hidden ? 'opacity-50' : ''}`}
                />
              </button>
            ))}
            {/* Over the foot of the whole strip, centred, so it is never cut by one tile. */}
            <button
              type="button"
              onClick={() => setGrid(true)}
              className="absolute inset-x-0 bottom-0 flex cursor-pointer justify-center bg-gradient-to-t from-black/60 to-transparent px-2 pt-10 pb-4"
            >
              <span className="rounded-full bg-white/25 px-5 py-3 text-base font-semibold whitespace-nowrap text-white backdrop-blur-md">{t('photos.seeAll', { count: photos.length })}</span>
            </button>
          </div>
        </>
      ) : (
        <button type="button" onClick={() => setGrid(true)} className="mt-3 cursor-pointer text-start text-sm text-link hover:underline">
          {t('photos.empty')}
        </button>
      )}

      {grid ? (
        <Dialog
          label={t('photos.heading')}
          // The viewer opened over the grid takes the Escape and the outside press itself.
          onClose={() => {
            if (viewing != null || sending) return;
            choose([]);
            setError('');
            setGrid(false);
          }}
          meta={photos.length ? t('photos.total', { count: photos.length }) : null}
          action={
            isLoggedIn ? (
              <button type="button" className="btn btn-primary" disabled={sending} onClick={() => inputRef.current?.click()}>
                <Icon name="plus" className="size-4" />
                {t('photos.add')}
              </button>
            ) : (
              <AuthLink to="/login" pending={{ kind: 'photo', id: pinId }} className="btn btn-primary hover:no-underline">
                <Icon name="plus" className="size-4" />
                {t('photos.add')}
              </AuthLink>
            )
          }
          className="w-full max-w-[min(96vw,100rem)]"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {welcome && isLoggedIn && !files.length ? <p className="mb-3 text-sm font-medium text-success">{t('photos.welcomeBack')}</p> : null}
            {!isLoggedIn && status === 'ready' ? (
              <p className="mb-3 text-sm text-subtle">
                {t.rich('photos.logIn', {
                  login: (chunks) => (
                    <AuthLink to="/login" className="font-medium" pending={{ kind: 'photo', id: pinId }}>
                      {chunks}
                    </AuthLink>
                  ),
                })}
              </p>
            ) : null}
            {files.length ? (
              <form onSubmit={send} className="mb-4 space-y-2 rounded-lg bg-raised p-3">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {previews.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element -- a local object URL
                    <img key={src} src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  ))}
                </div>
                {files.length === 1 ? (
                  <label className="block text-xs text-subtle">
                    {t('photos.caption')}
                    <input
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      maxLength={200}
                      placeholder={t('photos.captionPlaceholder')}
                      className="mt-1 block w-full rounded-md border border-line bg-popover px-2 py-1.5 text-sm text-ink"
                    />
                  </label>
                ) : null}
                <div className="flex gap-2">
                  <button type="submit" disabled={sending} className="btn btn-primary">
                    {sending ? t('photos.uploading') : t('photos.upload')}
                  </button>
                  <button type="button" disabled={sending} onClick={() => choose([])} className="btn btn-ghost">
                    {t('photos.cancel')}
                  </button>
                </div>
              </form>
            ) : null}
            {error ? (
              <p role="alert" className="mb-3 text-sm text-danger">
                {error}
              </p>
            ) : null}
            {photos.length ? null : <p className="text-sm text-subtle">{t('photos.empty')}</p>}
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {photos.map((photo, index) => (
                <li key={photo.id}>
                  <button type="button" onClick={() => setViewing(index)} aria-label={t('photos.open')} className="group relative block aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-lg bg-raised">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a stored reader photo */}
                    <img
                      src={blobUrl(photo.blobName)}
                      alt={photo.caption || t('photos.altBy', { name: photo.userName })}
                      width={photo.width ?? undefined}
                      height={photo.height ?? undefined}
                      loading="lazy"
                      className={`size-full object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none ${photo.hidden ? 'opacity-50' : ''}`}
                    />
                    {photo.hidden ? (
                      <span className="absolute inset-x-0 top-0 bg-black/60 px-2 py-1 text-xs text-white">{t('photos.hiddenNote')}</span>
                    ) : (
                      <ReactionSummary photo={photo} overlay />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Dialog>
      ) : null}
      {viewing != null && photos[viewing] ? (
        <Viewer
          photos={photos}
          index={viewing}
          canFlag={isLoggedIn}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
          onRemove={async (id) => {
            setViewing(null);
            await remove(id);
          }}
          onFlag={flag}
          onReact={react}
        />
      ) : null}
    </section>
  );
}

function FlagMenu({ onPick }: { onPick: (reason: Reason) => void }) {
  const t = useT();
  return (
    <div role="menu" className="border-t border-line px-1 py-1">
      <p className="px-2 py-1 text-xs font-medium">{t('photos.flagWhy')}</p>
      {REASONS.map((reason) => (
        <button key={reason} type="button" role="menuitem" className="block w-full cursor-pointer rounded px-2 py-1.5 text-left text-xs hover:bg-ink/10 focus-visible:bg-ink/10" onClick={() => onPick(reason)}>
          {t(REASON_KEY[reason])}
        </button>
      ))}
    </div>
  );
}

// The photo large, over the page: arrows (and the arrow keys) step through
// the pin's photos, with who added it and how many photos they have added.
function Viewer({
  photos,
  index,
  canFlag,
  onIndex,
  onClose,
  onRemove,
  onFlag,
  onReact,
}: {
  photos: PinPhotoJson[];
  index: number;
  canFlag: boolean;
  onIndex: (index: number) => void;
  onClose: () => void;
  onRemove: (id: number) => void;
  onFlag: (id: number, reason: Reason) => void;
  onReact: (id: number, reaction: CommentReactionName | null) => void;
}) {
  const t = useT();
  const [flagging, setFlagging] = useState(false);
  const photo = photos[index];
  const go = useCallback(
    (step: number) => {
      setFlagging(false);
      onIndex((index + step + photos.length) % photos.length);
    },
    [index, photos.length, onIndex],
  );
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') go(-1);
      else if (event.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [go]);

  const meta = (
    <p className="min-w-0 text-xs text-subtle">
      {photo.userName} · {t('photos.byUser', { count: photo.userPhotoCount, name: photo.userName })} · {index + 1}/{photos.length}
    </p>
  );

  return (
    <Dialog label={t('photos.heading')} onClose={onClose} bare className="w-full max-w-[min(96vw,100rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="relative flex min-h-0 shrink-0 items-center justify-center bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element -- a stored reader photo */}
          <img src={blobUrl(photo.blobName)} alt={photo.caption || t('photos.altBy', { name: photo.userName })} className="max-h-[calc(92dvh-11rem)] max-w-full object-contain max-sm:max-h-[60dvh]" />
          {photos.length > 1 ? (
            <>
              <button type="button" aria-label={t('photos.prev')} onClick={() => go(-1)} className="absolute left-2 cursor-pointer rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
                <Icon name="back" className="size-5" />
              </button>
              <button type="button" aria-label={t('photos.next')} onClick={() => go(1)} className="absolute right-2 cursor-pointer rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
                <Icon name="back" className="size-5 rotate-180" />
              </button>
            </>
          ) : null}
        </div>
        <div className="space-y-1 bg-popover px-4 py-3 text-sm text-ink">
          {/* The first row: the caption (or who added it), with flag/remove at its right. */}
          <div className="flex items-start justify-between gap-3">
            {photo.caption ? <p className="min-w-0 text-ink">{photo.caption}</p> : meta}
            <div className="flex shrink-0 gap-3 text-xs">
              {photo.mine ? (
                <button type="button" className="cursor-pointer underline hover:text-link" onClick={() => onRemove(photo.id)}>
                  {t('photos.remove')}
                </button>
              ) : canFlag && !photo.flagged ? (
                <button type="button" className="cursor-pointer underline hover:text-link" onClick={() => setFlagging((v) => !v)}>
                  {t('photos.flag')}
                </button>
              ) : photo.flagged ? (
                <span className="text-subtle">{t('photos.flagged')}</span>
              ) : null}
            </div>
          </div>
          {photo.caption ? meta : null}
          {photo.hidden ? null : (
            <div role="group" aria-label={t('comments.chooseReaction')} className="flex flex-wrap gap-1 pt-1">
              {COMMENT_REACTIONS.map((r) => {
                const count = photo.reactions?.[r.name] ?? 0;
                const mine = photo.myReaction === r.name;
                return (
                  <button
                    key={r.name}
                    type="button"
                    disabled={!canFlag}
                    aria-pressed={mine}
                    aria-label={t(r.label)}
                    title={canFlag ? t(r.label) : t('photos.logInToReact')}
                    onClick={() => onReact(photo.id, mine ? null : r.name)}
                    className={`flex items-center gap-1 rounded-full px-2 py-1 text-base leading-none ring-1 ring-inset ${mine ? 'bg-ink/10 ring-ink/30' : 'ring-line'} cursor-pointer enabled:hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span aria-hidden>{r.emoji}</span>
                    {count ? <span className="text-xs text-subtle">{count}</span> : null}
                  </button>
                );
              })}
            </div>
          )}
          {flagging ? (
            <FlagMenu
              onPick={(reason) => {
                setFlagging(false);
                onFlag(photo.id, reason);
              }}
            />
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}

// The emoji a photo has been given, most used first, with the total.
function ReactionSummary({ photo, overlay }: { photo: PinPhotoJson; overlay?: boolean }) {
  const used = COMMENT_REACTIONS.filter((r) => (photo.reactions?.[r.name] ?? 0) > 0).sort((a, b) => (photo.reactions[b.name] ?? 0) - (photo.reactions[a.name] ?? 0));
  if (!used.length) return null;
  const total = used.reduce((sum, r) => sum + (photo.reactions[r.name] ?? 0), 0);
  return (
    <p className={overlay ? 'absolute start-1.5 bottom-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white' : 'flex items-center gap-1 px-2 pt-1 text-xs text-subtle'}>
      <span aria-hidden>
        {used
          .slice(0, 3)
          .map((r) => r.emoji)
          .join('')}
      </span>
      {total}
    </p>
  );
}
