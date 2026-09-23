'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api, isEmailUnverified } from '@/lib/client/api';
import { commentMood, type CommentMood } from '@/lib/commentMood';
import { COMMENT_REACTIONS, type CommentReactionName } from '@/lib/commentReactions';
import { AuthLink } from '@/components/nav/AuthLink';
import { usePendingAction } from '@/lib/client/pendingAction';
import { useSession } from '@/lib/client/session';
import type { CommentJson } from '@/lib/types';
import { useT } from '@/lib/client/i18n';

// Must match MAX_REPLY_DEPTH in the comment route: roots are depth 0.
const MAX_REPLY_DEPTH = 2;

type Node = CommentJson & { replies: Node[]; depth: number };

function buildTree(comments: CommentJson[]): Node[] {
  const byId = new Map<number, Node>();
  comments.forEach((c) => byId.set(c.id, { ...c, replies: [], depth: 0 }));
  const roots: Node[] = [];
  byId.forEach((node) => {
    const parent = node.parentCommentId ? byId.get(node.parentCommentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  });
  const setDepth = (nodes: Node[], depth: number) =>
    nodes.forEach((n) => {
      n.depth = depth;
      setDepth(n.replies, depth + 1);
    });
  setDepth(roots, 0);
  return roots;
}

// A pin's comments: server-rendered for readers and crawlers, then live for
// posting, replying and deleting your own - a comment is never edited.
export function Comments({ pinId, initialComments }: { pinId: number; initialComments: CommentJson[] }) {
  const { user, isLoggedIn, isAdmin, status } = useSession();
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const t = useT();

  // The page's comments are cached for hours, but a comment's tone is scored
  // after it is posted (or later, by `npm run comments:sentiment`), so the
  // scores are read fresh once the page is up.
  useEffect(() => {
    let live = true;
    api
      .get<CommentJson[]>(`/api/pins/${pinId}/comment`)
      .then((fresh) => {
        if (!live) return;
        // The fresh read also carries the reactions, and this viewer's own.
        const byId = new Map(fresh.map((c) => [c.id, c]));
        setComments((list) =>
          list.map((c) => {
            const f = byId.get(c.id);
            return f ? { ...c, sentiment: f.sentiment ?? null, reactions: f.reactions, myReaction: f.myReaction } : c;
          }),
        );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pinId]);

  const tree = buildTree(comments);
  const mood = commentMood(comments);

  async function post(body: { text: string; parentCommentId?: number }) {
    setError('');
    try {
      const created = await api.post<CommentJson>(`/api/pins/${pinId}/comment`, body);
      setComments((list) => [...list, created]);
      return true;
    } catch (err) {
      setError(isEmailUnverified(err) ? t('verifyEmail.required') : body.parentCommentId ? t('comments.replyFailed') : t('comments.postFailed'));
      return false;
    }
  }

  // A reaction, a different one in its place, or null to take it back.
  // Shown at once, then set to what the server counted (or put back if it
  // refused).
  async function react(comment: CommentJson, reaction: CommentReactionName | null) {
    const before = { reactions: comment.reactions ?? {}, myReaction: comment.myReaction ?? null };
    const counts = { ...before.reactions };
    if (before.myReaction) counts[before.myReaction] = Math.max(0, (counts[before.myReaction] ?? 1) - 1);
    if (reaction) counts[reaction] = (counts[reaction] ?? 0) + 1;
    const set = (next: typeof before) => setComments((list) => list.map((c) => (c.id === comment.id ? { ...c, ...next } : c)));
    set({ reactions: counts, myReaction: reaction });
    try {
      set(await api.put<typeof before>(`/api/pins/${pinId}/comment/${comment.id}/reaction`, { reaction }));
    } catch {
      set(before);
    }
  }

  async function remove(comment: CommentJson) {
    await api.delete(`/api/pins/${pinId}/comment/${comment.id}`);
    setComments((list) => list.filter((c) => c.id !== comment.id));
  }

  // The comment the reader came back to write: the box they were sent off to
  // log in from, back in front of them with the cursor in it. Nothing is
  // posted for them - what they wanted to say is still theirs to type.
  const boxRef = usePendingAction<HTMLTextAreaElement>(
    { kind: 'comment', id: pinId },
    isLoggedIn,
    // The scrolling is the hook's, which keeps the box in view while the rest
    // of the page loads in above it.
    useCallback((box: HTMLTextAreaElement | null) => box?.focus({ preventScroll: true }), []),
  );

  const renderNode = (node: Node) => (
    <CommentItem
      key={node.id}
      node={node}
      isOwn={!!user && node.userId === user.id}
      canDelete={!!user && (node.userId === user.id || isAdmin)}
      canReply={isLoggedIn && node.depth < MAX_REPLY_DEPTH}
      signedIn={isLoggedIn}
      pinId={pinId}
      onReact={(reaction) => react(node, reaction)}
      onReply={(replyText) => post({ text: replyText, parentCommentId: node.id })}
      onRemove={() => remove(node)}
      renderChild={renderNode}
    />
  );

  return (
    <section aria-labelledby="comments-heading" className="surface mt-6 p-5">
      <h2 id="comments-heading" className="mb-3 text-base font-semibold">
        {t('comments.heading')}
      </h2>
      {mood ? <MoodSummary mood={mood} total={comments.length} /> : null}
      <ul className="space-y-5">{tree.map(renderNode)}</ul>

      {isLoggedIn ? (
        <form
          className="mt-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (text.trim() && (await post({ text: text.trim() }))) setText('');
          }}
        >
          <textarea
            ref={boxRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('comments.addPlaceholder')}
            className="field"
            rows={3}
          />
          {error ? <div className="text-sm text-danger">{error}</div> : null}
          <button type="submit" className="btn btn-primary mt-2">
            {t('comments.post')}
          </button>
        </form>
      ) : status === 'ready' ? (
        <p className="mt-3 text-sm text-subtle">
          {t.rich(comments.length ? 'comments.logInToAdd' : 'comments.logInToPostFirst', {
            login: (chunks) => (
              <AuthLink to="/login" className="font-medium" pending={{ kind: 'comment', id: pinId }}>
                {chunks}
              </AuthLink>
            ),
          })}
        </p>
      ) : null}
    </section>
  );
}

const MOOD_LABELS = { positive: 'comments.moodPositive', mixed: 'comments.moodMixed', negative: 'comments.moodNegative' } as const;
const MOOD_BADGES = {
  positive: 'bg-success/10 text-success ring-success/25',
  mixed: 'bg-raised text-ink ring-line',
  negative: 'bg-danger/10 text-danger ring-danger/25',
};
const MOOD_DOTS = { positive: 'bg-success', mixed: 'bg-subtle', negative: 'bg-danger' };
const TRENDS = {
  warming: { label: 'comments.warming', icon: 'trending-up', className: 'text-success' },
  cooling: { label: 'comments.cooling', icon: 'trending-down', className: 'text-danger' },
  steady: { label: 'comments.steady', icon: null, className: 'text-subtle' },
} as const;

// The comments' overall tone and which way the newest ones lean: a badge, a
// trend chip, and a meter from negative to positive with the average marked.
// Scores arrive a moment after posting, so a brand-new comment joins on the
// next load.
function MoodSummary({ mood, total }: { mood: CommentMood; total: number }) {
  const t = useT();
  const trend = mood.trend ? TRENDS[mood.trend] : null;
  // -1..1 onto the meter, kept off the very ends so the marker stays whole.
  const position = 4 + ((mood.average + 1) / 2) * 92;
  return (
    <div className="mb-4 rounded-lg border border-line bg-raised/40 px-3 py-2.5" aria-label={t('comments.mood')}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ring-1 ring-inset ${MOOD_BADGES[mood.mood]}`}>
          <span className={`size-1.5 rounded-full ${MOOD_DOTS[mood.mood]}`} />
          {t(MOOD_LABELS[mood.mood])}
        </span>
        {trend ? (
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${trend.className}`}>
            {trend.icon ? <Icon name={trend.icon} className="size-3.5" /> : null}
            {t(trend.label)}
          </span>
        ) : null}
        <span className="ml-auto text-xs text-subtle">
          {/* Comments still waiting on a score are counted but sit out. */}
          {mood.scored < total ? t('comments.fromSome', { scored: mood.scored, count: total }) : t('comments.fromAll', { count: mood.scored })}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-subtle">
        <span>{t('comments.negative')}</span>
        <div
          className="relative h-1.5 flex-1 rounded-full bg-linear-to-r from-danger/60 via-raised-2 to-success/60"
          role="meter"
          aria-valuemin={-1}
          aria-valuemax={1}
          aria-valuenow={Number(mood.average.toFixed(2))}
          aria-label={t('comments.averageTone')}
          title={t('comments.averageToneTitle', { value: mood.average.toFixed(2) })}
        >
          <span
            className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel shadow ${MOOD_DOTS[mood.mood]}`}
            style={{ left: `${position}%` }}
          />
        </div>
        <span>{t('comments.positive')}</span>
      </div>
    </div>
  );
}

function CommentItem({
  node,
  isOwn,
  canDelete,
  canReply,
  signedIn,
  pinId,
  onReact,
  onReply,
  onRemove,
  renderChild,
}: {
  node: Node;
  isOwn: boolean;
  canDelete: boolean;
  canReply: boolean;
  signedIn: boolean;
  pinId: number;
  onReact: (reaction: CommentReactionName | null) => void;
  onReply: (text: string) => Promise<boolean>;
  onRemove: () => void;
  renderChild: (node: Node) => React.ReactNode;
}) {
  const [mode, setMode] = useState<'view' | 'reply'>('view');
  const [draft, setDraft] = useState('');
  const t = useT();

  return (
    // The anchor comment notifications link to (its scroll-margin, set for
    // every id in globals.css, keeps it clear of the header).
    <li id={`comment-${node.id}`}>
      {/* The avatar beside a column that stacks the same way for every
          comment, long or short: a header row with the handle and, across
          from it, the controls; the words under it; then the replies, whose
          avatars line up under the words they answer. A comment is never
          edited: its author can only delete it. */}
      <div className="flex gap-3">
        <UserAvatar userName={node.userName} pictureUrl={node.userPictureUrl} className="size-8 shrink-0 text-xs" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {/* Muted, so the comment itself is what reads first; cut short
                rather than pushing the controls off the row. */}
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-subtle">{node.userName}</span>
            <div className="flex shrink-0 items-center gap-2 text-xs sm:gap-4">
              <Reactions node={node} signedIn={signedIn} pinId={pinId} onReact={onReact} />
              {canReply ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft('');
                    setMode('reply');
                  }}
                  aria-label={t('comments.reply')}
                  title={t('comments.reply')}
                  className="rounded-md p-1 text-subtle hover:bg-raised hover:text-link"
                >
                  <Icon name="reply" className="size-4" />
                </button>
              ) : null}
              <CommentMenu commentId={node.id} pinId={pinId} isOwn={isOwn} canDelete={canDelete} signedIn={signedIn} onRemove={onRemove} />
            </div>
          </div>
          {/* Plain text: comments are never rendered as HTML. */}
          <p className="mt-0.5 break-words whitespace-pre-wrap text-ink">{node.text}</p>
          {mode === 'reply' ? (
            <form
              className="mt-2"
              onSubmit={async (event) => {
                event.preventDefault();
                if (draft.trim() && (await onReply(draft.trim()))) setMode('view');
              }}
            >
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('comments.replyPlaceholder')} className="field" rows={2} />
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setMode('view')} className="btn btn-sm btn-ghost">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-sm btn-primary">
                  {t('comments.reply')}
                </button>
              </div>
            </form>
          ) : null}
          {node.replies.length ? <ul className="mt-3 space-y-4 border-l border-line pl-4">{node.replies.map(renderChild)}</ul> : null}
        </div>
      </div>
    </li>
  );
}

// Reactions, as on Facebook. The Like button likes the comment (or, once the
// reader has reacted, shows their reaction and takes it back); resting the
// pointer on it, pressing and holding it on a touch screen, or ArrowUp from
// the keyboard opens the row of six to pick from. Beside it, the three most
// given reactions and how many reacted in all. A signed-out reader's Like
// sends them to log in first.
const HOVER_OPEN_MS = 450;
const HOVER_CLOSE_MS = 300;
const LONG_PRESS_MS = 450;

function Reactions({
  node,
  signedIn,
  pinId,
  onReact,
}: {
  node: CommentJson;
  signedIn: boolean;
  pinId: number;
  onReact: (reaction: CommentReactionName | null) => void;
}) {
  const t = useT();
  const pickerId = useId();
  // How the picker was opened: from the keyboard it takes the focus.
  const [open, setOpen] = useState<false | 'pointer' | 'keys'>(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // A long press opens the picker; the click the finger's lift then makes
  // must not also like the comment.
  const pressed = useRef(false);

  const counts = node.reactions ?? {};
  const given = COMMENT_REACTIONS.filter((r) => (counts[r.name] ?? 0) > 0).sort((a, b) => (counts[b.name] ?? 0) - (counts[a.name] ?? 0));
  const total = given.reduce((sum, r) => sum + (counts[r.name] ?? 0), 0);
  const mine = COMMENT_REACTIONS.find((r) => r.name === node.myReaction);

  const later = (fn: () => void, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };
  const close = useCallback((refocus: boolean) => {
    clearTimeout(timer.current);
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Element)) close(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
    };
  }, [open, close]);

  const pick = (reaction: CommentReactionName) => {
    close(true);
    onReact(reaction === node.myReaction ? null : reaction);
  };

  const summary = total ? (
    <span
      className="inline-flex items-center gap-1 text-subtle tabular-nums"
      aria-label={t('comments.reactions', { count: total })}
      title={given.map((r) => `${r.emoji} ${counts[r.name]}`).join('  ')}
    >
      <span className="flex" aria-hidden>
        {given.slice(0, 3).map((r) => (
          <span key={r.name} className="-ml-1 flex size-4.5 items-center justify-center rounded-full bg-panel text-[11px] leading-none ring-2 ring-panel first:ml-0">
            {r.emoji}
          </span>
        ))}
      </span>
      <span data-count="total">{total}</span>
    </span>
  ) : null;

  const face = mine ? (
    <span className="text-base leading-none" aria-hidden>
      {mine.emoji}
    </span>
  ) : (
    <Icon name="thumb" className="size-4" />
  );
  const buttonClass = `inline-flex items-center rounded-md p-1 transition-colors ${
    mine ? 'bg-raised' : 'text-subtle hover:bg-raised hover:text-link'
  }`;

  if (!signedIn) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {summary}
        <span title={t('comments.logInToReact')} className="inline-flex">
          <AuthLink to="/login" className={buttonClass} pending={{ kind: 'comment', id: pinId }}>
            {face}
            <span className="sr-only">{t('comments.like')}</span>
          </AuthLink>
        </span>
      </span>
    );
  }

  const label = mine ? t('comments.removeReaction', { reaction: t(mine.label) }) : t('comments.like');
  return (
    <span
      ref={rootRef}
      className="relative inline-flex items-center gap-1.5"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') later(() => setOpen((was) => was || 'pointer'), open ? 0 : HOVER_OPEN_MS);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') later(() => setOpen(false), HOVER_CLOSE_MS);
      }}
    >
      {summary}
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={!!mine}
        aria-haspopup="true"
        aria-expanded={!!open}
        aria-controls={open ? pickerId : undefined}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse') return;
          pressed.current = false;
          later(() => {
            pressed.current = true;
            setOpen('pointer');
          }, LONG_PRESS_MS);
        }}
        onPointerUp={(event) => {
          if (event.pointerType !== 'mouse' && !pressed.current) clearTimeout(timer.current);
        }}
        onPointerCancel={() => clearTimeout(timer.current)}
        // A held finger would otherwise bring up the phone's own menu.
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen('keys');
          }
        }}
        onClick={() => {
          if (pressed.current) {
            pressed.current = false;
            return;
          }
          close(false);
          onReact(mine ? null : 'like');
        }}
        className={buttonClass}
      >
        {face}
      </button>
      {open ? (
        <ReactionPicker id={pickerId} mine={node.myReaction ?? null} takeFocus={open === 'keys'} onPick={pick} />
      ) : null}
    </span>
  );
}

// The row of six, floating above the Like button. Each grows under the
// pointer; the reader's own is ringed, and picking it again takes it back.
// The arrow keys move along the row.
function ReactionPicker({
  id,
  mine,
  takeFocus,
  onPick,
}: {
  id: string;
  mine: CommentReactionName | null;
  takeFocus: boolean;
  onPick: (reaction: CommentReactionName) => void;
}) {
  const t = useT();
  const rowRef = useRef<HTMLDivElement>(null);
  // Opened from the keyboard, the focus lands on the reader's own reaction,
  // else the first.
  useEffect(() => {
    if (!takeFocus) return;
    const buttons = rowRef.current?.querySelectorAll<HTMLButtonElement>('button');
    buttons?.[Math.max(0, COMMENT_REACTIONS.findIndex((r) => r.name === mine))]?.focus({ preventScroll: true });
  }, [takeFocus, mine]);
  return (
    <div
      ref={rowRef}
      id={id}
      role="group"
      aria-label={t('comments.chooseReaction')}
      className="floating absolute right-0 bottom-full z-30 mb-1.5 flex gap-0.5 rounded-full p-1"
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const buttons = [...(rowRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = (at + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }}
    >
      {COMMENT_REACTIONS.map((r) => (
        <button
          key={r.name}
          type="button"
          aria-label={t(r.label)}
          title={t(r.label)}
          aria-pressed={r.name === mine}
          onClick={() => onPick(r.name)}
          className={`flex size-9 origin-bottom items-center justify-center rounded-full text-2xl leading-none transition-transform duration-150 hover:scale-125 focus-visible:scale-125 motion-reduce:transition-none ${
            r.name === mine ? 'bg-raised ring-1 ring-line' : ''
          }`}
        >
          <span aria-hidden>{r.emoji}</span>
        </button>
      ))}
    </div>
  );
}

const REPORT_REASONS = [
  ['spam', 'comments.reportSpam'],
  ['harassment', 'comments.reportHarassment'],
  ['misleading', 'comments.reportMisleading'],
  ['other', 'comments.reportOther'],
] as const;

// The comment's other actions, behind a vertical three-dot button: Delete for
// its author (and an admin, on anyone's), Report for everyone else, which
// asks why and hands it to Admin > Reports. A signed-out reader's Report
// sends them to log in first. Escape or a click elsewhere shuts it, and the
// focus goes back to the button.
function CommentMenu({
  commentId,
  pinId,
  isOwn,
  canDelete,
  signedIn,
  onRemove,
}: {
  commentId: number;
  pinId: number;
  isOwn: boolean;
  canDelete: boolean;
  signedIn: boolean;
  onRemove: () => void;
}) {
  const t = useT();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'actions' | 'reasons' | 'done' | 'failed'>('actions');
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setView('actions');
    if (refocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Element)) close(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', key);
    };
  }, [open, view, close]);

  async function report(reason: string) {
    try {
      await api.post(`/api/pins/${pinId}/comment/${commentId}/report`, { reason });
      setView('done');
    } catch {
      setView('failed');
    }
  }

  const item = 'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-raised focus-visible:bg-raised';
  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('comments.moreActions')}
        title={t('comments.moreActions')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        className="rounded-md p-1 text-subtle hover:bg-raised hover:text-ink"
      >
        <Icon name="dots-vertical" className="size-4" />
      </button>
      {open ? (
        <div ref={menuRef} id={menuId} role="menu" className="floating absolute top-full right-0 z-30 mt-1 w-56 p-1 text-ink">
          {view === 'actions' ? (
            <>
              {canDelete ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close(false);
                    onRemove();
                  }}
                  className={`${item} text-danger`}
                >
                  <Icon name="trash" className="size-4" />
                  {t('comments.deleteComment')}
                </button>
              ) : null}
              {!isOwn ? (
                signedIn ? (
                  <button type="button" role="menuitem" onClick={() => setView('reasons')} className={item}>
                    <Icon name="flag" className="size-4" />
                    {t('comments.report')}
                  </button>
                ) : (
                  <AuthLink to="/login" className={item} pending={{ kind: 'comment', id: pinId }}>
                    <Icon name="flag" className="size-4" />
                    {t('comments.report')}
                  </AuthLink>
                )
              ) : null}
            </>
          ) : view === 'reasons' ? (
            <>
              <p className="px-2.5 pt-1 pb-1.5 text-xs text-subtle">{t('comments.reportWhy')}</p>
              {REPORT_REASONS.map(([reason, label]) => (
                <button key={reason} type="button" role="menuitem" onClick={() => report(reason)} className={item}>
                  {t(label)}
                </button>
              ))}
            </>
          ) : (
            <p role="status" className={`px-2.5 py-2 text-sm ${view === 'done' ? 'text-success' : 'text-danger'}`}>
              {view === 'done' ? t('comments.reported') : t('comments.reportFailed')}
            </p>
          )}
        </div>
      ) : null}
    </span>
  );
}
