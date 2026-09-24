'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api, isEmailUnverified } from '@/lib/client/api';
import { commentMood, type CommentMood } from '@/lib/commentMood';
import { COMMENT_REACTIONS, type CommentReactionName } from '@/lib/commentReactions';
import { AuthLink } from '@/components/nav/AuthLink';
import { blockUser, useBlocks, type BlockedUser } from '@/lib/client/blocks';
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
  const blocks = useBlocks();
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
        // The fresh read also carries the reactions, and this viewer's own,
        // hides a comment reported too often since the page was cached, and
        // leaves out those of anyone the viewer blocked or who blocked them.
        const byId = new Map(fresh.map((c) => [c.id, c]));
        setComments((list) =>
          list.flatMap((c) => {
            const f = byId.get(c.id);
            return f
              ? [{ ...c, text: f.text, hidden: f.hidden, sentiment: f.sentiment ?? null, reactions: f.reactions, myReaction: f.myReaction }]
              : [];
          }),
        );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pinId]);

  // Someone blocked on this page goes at once, before the next read.
  const visible = blocks.ids.size ? comments.filter((c) => !blocks.ids.has(c.userId)) : comments;
  const tree = buildTree(visible);
  // One hidden after reports says nothing, so it has no say in the mood.
  const shown = visible.filter((c) => !c.hidden);
  const mood = commentMood(shown);

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
      canDelete={!!user && (node.userId === user.id || isAdmin)}
      canBlock={!!user && node.userId !== user.id}
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
      {mood ? <MoodSummary mood={mood} total={shown.length} /> : null}
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

// A comment's controls, beside its bubble: round icon buttons that only take
// a colour when the pointer is on them.
const CONTROL =
  'inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink focus-visible:bg-raised';

function CommentItem({
  node,
  canDelete,
  canBlock,
  canReply,
  signedIn,
  pinId,
  onReact,
  onReply,
  onRemove,
  renderChild,
}: {
  node: Node;
  canDelete: boolean;
  canBlock: boolean;
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
  const reacted = Object.values(node.reactions ?? {}).some((n) => (n ?? 0) > 0);

  return (
    // The anchor comment notifications link to (its scroll-margin, set for
    // every id in globals.css, keeps it clear of the header).
    <li id={`comment-${node.id}`}>
      {/* As in Messenger: the handle over a bubble with the words in it, the
          avatar beside the bubble, and the reactions pinned to the bubble's
          corner. The controls sit just past the bubble and show while the
          pointer is on the comment (always on a touch screen, which has no
          hover, and while one of their popups is open or they have the
          keyboard's focus). A comment is never edited: its author can only
          delete it. */}
      <div className="flex gap-2">
        <UserAvatar userName={node.userName} pictureUrl={node.userPictureUrl} className="mt-5 size-9 shrink-0 text-xs" />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 truncate pl-4 text-xs text-subtle">{node.userName}</div>
          <div className={`group/comment relative flex items-center gap-1 ${reacted ? 'mb-3' : ''}`}>
            {node.hidden ? (
              // Reported too often: it keeps its place in the thread, empty,
              // until an admin dismisses the reports or removes it.
              <div className="min-w-0 rounded-[1.375rem] border border-dashed border-line px-4 py-2.5 text-sm text-subtle italic">
                {t('comments.hiddenByReports')}
              </div>
            ) : (
              // Plain text: comments are never rendered as HTML.
              <div className="relative min-w-0 rounded-[1.375rem] bg-raised px-4 py-2.5 text-base leading-snug break-words whitespace-pre-wrap text-ink">
                {node.text}
                <ReactionSummary node={node} />
              </div>
            )}
            <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/comment:opacity-100 has-[[aria-expanded=true]]:opacity-100 has-[:focus-visible]:opacity-100 [@media(hover:none)]:opacity-100">
              {node.hidden ? null : <ReactionButton node={node} signedIn={signedIn} pinId={pinId} onReact={onReact} />}
              {canReply && !node.hidden ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft('');
                    setMode('reply');
                  }}
                  aria-label={t('comments.reply')}
                  title={t('comments.reply')}
                  className={CONTROL}
                >
                  <Icon name="reply" className="size-5" />
                </button>
              ) : null}
              {/* Only for a signed-in reader: everything in it needs an account. */}
              {!signedIn || (node.hidden && !canDelete) ? null : (
                <CommentMenu
                  commentId={node.id}
                  pinId={pinId}
                  author={canBlock ? { id: node.userId, userName: node.userName ?? '', pictureUrl: node.userPictureUrl ?? null } : null}
                  canDelete={canDelete}
                  canReport={!node.hidden}
                  onRemove={onRemove}
                />
              )}
            </div>
          </div>
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
          {node.replies.length ? <ul className="mt-3 space-y-3 border-l border-line pl-3">{node.replies.map(renderChild)}</ul> : null}
        </div>
      </div>
    </li>
  );
}

// The reactions a comment has, as a small badge on its bubble's bottom
// corner: the three most given and how many reacted in all.
function ReactionSummary({ node }: { node: CommentJson }) {
  const t = useT();
  const counts = node.reactions ?? {};
  const given = COMMENT_REACTIONS.filter((r) => (counts[r.name] ?? 0) > 0).sort((a, b) => (counts[b.name] ?? 0) - (counts[a.name] ?? 0));
  const total = given.reduce((sum, r) => sum + (counts[r.name] ?? 0), 0);
  if (!total) return null;
  return (
    <span
      className="absolute right-2 -bottom-3.5 inline-flex items-center gap-0.5 rounded-full bg-panel px-1.5 py-0.5 text-xs whitespace-nowrap text-subtle tabular-nums shadow-sm ring-1 ring-line"
      aria-label={t('comments.reactions', { count: total })}
      title={given.map((r) => `${r.emoji} ${counts[r.name]}`).join('  ')}
    >
      <span className="flex text-sm leading-none" aria-hidden>
        {given.slice(0, 3).map((r) => (
          <span key={r.name}>{r.emoji}</span>
        ))}
      </span>
      {total > 1 ? <span data-count="total">{total}</span> : <span data-count="total" className="sr-only">{total}</span>}
    </span>
  );
}

// The smiley that opens the bar of reactions over the comment, as in
// Messenger. Picking one gives it (in place of any given before); picking the
// one already given takes it back. Escape or a click elsewhere shuts the bar.
// A signed-out reader's smiley sends them to log in first.
function ReactionButton({
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

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

  if (!signedIn) {
    return (
      <span title={t('comments.logInToReact')} className="inline-flex">
        <AuthLink to="/login" className={CONTROL} pending={{ kind: 'comment', id: pinId }}>
          <Icon name="smile" className="size-5" />
          <span className="sr-only">{t('comments.chooseReaction')}</span>
        </AuthLink>
      </span>
    );
  }

  return (
    // Not positioned itself, so the bar lines up with the comment's bubble
    // (the row is the positioned box) rather than with this button.
    <span ref={rootRef} className="inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('comments.chooseReaction')}
        title={t('comments.chooseReaction')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? pickerId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        className={`${CONTROL} ${open ? 'bg-raised text-ink' : ''}`}
      >
        <Icon name="smile" className="size-5" />
      </button>
      {open ? (
        <ReactionPicker
          id={pickerId}
          mine={node.myReaction ?? null}
          onPick={(reaction) => {
            close(false);
            onReact(reaction === node.myReaction ? null : reaction);
          }}
        />
      ) : null}
    </span>
  );
}

// The bar of six, floating over the comment's bubble. Each grows under the
// pointer; the reader's own sits on a grey disc, and picking it again takes it
// back. It opens with the focus on the reader's own (else the first), and
// the arrow keys move along it.
function ReactionPicker({ id, mine, onPick }: { id: string; mine: CommentReactionName | null; onPick: (reaction: CommentReactionName) => void }) {
  const t = useT();
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const buttons = rowRef.current?.querySelectorAll<HTMLButtonElement>('button');
    buttons?.[Math.max(0, COMMENT_REACTIONS.findIndex((r) => r.name === mine))]?.focus({ preventScroll: true });
    // Only when it opens: the focus is not moved again while it is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      ref={rowRef}
      id={id}
      role="group"
      aria-label={t('comments.chooseReaction')}
      className="absolute bottom-full left-0 z-30 mb-2 flex gap-0.5 rounded-full border border-ink/10 bg-popover p-1.5 shadow-2xl shadow-shade/40"
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
          className={`flex size-10 origin-bottom items-center justify-center rounded-full text-[26px] leading-none transition-transform duration-150 outline-none hover:scale-125 focus-visible:scale-125 motion-reduce:transition-none sm:size-12 sm:text-4xl ${
            r.name === mine ? 'bg-ink/10' : ''
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

// The comment's other actions, behind a vertical three-dot button: Remove for
// its author (and an admin, on anyone's), Report on every comment, which asks
// why and hands it to Admin > Comments, and Block on someone else's, which
// asks first. A signed-out reader's Report
// sends them to log in first. Escape or a click elsewhere shuts it, and the
// focus goes back to the button.
function CommentMenu({
  commentId,
  pinId,
  author,
  canDelete,
  canReport,
  onRemove,
}: {
  commentId: number;
  pinId: number;
  // Who wrote it, when the reader may block them (not their own).
  author: BlockedUser | null;
  canDelete: boolean;
  canReport: boolean;
  onRemove: () => void;
}) {
  const t = useT();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'actions' | 'reasons' | 'block' | 'done' | 'failed' | 'blockFailed'>('actions');
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

  async function block() {
    if (!author) return;
    try {
      // The comments (and pins) of theirs on this page go at once.
      await blockUser(author);
      close(false);
    } catch {
      setView('blockFailed');
    }
  }

  async function report(reason: string) {
    try {
      await api.post(`/api/pins/${pinId}/comment/${commentId}/report`, { reason });
      setView('done');
    } catch {
      setView('failed');
    }
  }

  const item = 'block w-full rounded-lg px-3 py-2 text-left text-base font-medium hover:bg-ink/[0.07] focus-visible:bg-ink/[0.07] focus-visible:outline-none';
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
        className={CONTROL}
      >
        <Icon name="dots-vertical" className="size-5" />
      </button>
      {open ? (
        // Over the button, as in Messenger, with a tail pointing down at it.
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          className={`absolute right-0 bottom-full z-30 mb-2.5 ${view === 'actions' ? 'w-48' : 'w-64'} rounded-xl border border-ink/10 bg-popover p-1.5 text-ink shadow-2xl shadow-shade/40`}
        >
          <span aria-hidden className="absolute -bottom-1.5 right-3 size-3 rotate-45 border-r border-b border-ink/10 bg-popover" />
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
                  className={item}
                >
                  {t('comments.deleteComment')}
                </button>
              ) : null}
              {canReport ? (
                <button type="button" role="menuitem" onClick={() => setView('reasons')} className={item}>
                  {t('comments.report')}
                </button>
              ) : null}
              {author ? (
                <button type="button" role="menuitem" onClick={() => setView('block')} className={item}>
                  {t('comments.block')}
                </button>
              ) : null}
            </>
          ) : view === 'block' && author ? (
            // Said plainly before it happens: it works both ways for comments.
            <>
              <p className="px-3 pt-1.5 pb-2 text-sm text-subtle">{t('comments.blockConfirm', { name: author.userName })}</p>
              <button type="button" role="menuitem" onClick={block} className={`${item} text-danger`}>
                {t('comments.blockConfirmButton', { name: author.userName })}
              </button>
              <button type="button" role="menuitem" onClick={() => close(true)} className={item}>
                {t('common.cancel')}
              </button>
            </>
          ) : view === 'reasons' ? (
            <>
              <p className="px-3 pt-1.5 pb-1 text-sm text-subtle">{t('comments.reportWhy')}</p>
              {REPORT_REASONS.map(([reason, label]) => (
                <button key={reason} type="button" role="menuitem" onClick={() => report(reason)} className={item}>
                  {t(label)}
                </button>
              ))}
            </>
          ) : (
            <p role="status" className={`px-3 py-2 text-sm ${view === 'done' ? 'text-success' : 'text-danger'}`}>
              {view === 'done' ? t('comments.reported') : view === 'blockFailed' ? t('comments.blockFailed') : t('comments.reportFailed')}
            </p>
          )}
        </div>
      ) : null}
    </span>
  );
}
