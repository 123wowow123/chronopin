'use client';

import Link from '@/components/ui/Link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api } from '@/lib/client/api';
import { commentMood, type CommentMood } from '@/lib/commentMood';
import { useNow } from '@/lib/client/now';
import { useSession } from '@/lib/client/session';
import type { CommentJson } from '@/lib/types';
import { useT } from '@/lib/client/i18n';

// Must match EDIT_WINDOW_MINUTES in src/server/model/comment.ts; hiding the
// button is only UX, the real cutoff is enforced by the server.
const EDIT_WINDOW_MS = 5 * 60 * 1000;
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
// posting, replying, editing (for 5 minutes) and deleting your own.
export function Comments({ pinId, initialComments }: { pinId: number; initialComments: CommentJson[] }) {
  const { user, isLoggedIn, status } = useSession();
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  // 0 on the server: the edit window is only ever judged in the browser.
  const now = useNow(15_000);
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
        const scores = new Map(fresh.map((c) => [c.id, c.sentiment ?? null]));
        setComments((list) => list.map((c) => (scores.has(c.id) ? { ...c, sentiment: scores.get(c.id) } : c)));
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
    } catch {
      setError(body.parentCommentId ? t('comments.replyFailed') : t('comments.postFailed'));
      return false;
    }
  }

  async function edit(comment: CommentJson, newText: string) {
    try {
      const updated = await api.patch<CommentJson>(`/api/pins/${pinId}/comment/${comment.id}`, { text: newText });
      setComments((list) =>
        list.map((c) => (c.id === comment.id ? { ...c, text: updated.text, sentiment: null, utcUpdatedDateTime: updated.utcUpdatedDateTime } : c)),
      );
      return true;
    } catch {
      setError(t('comments.editClosed'));
      return false;
    }
  }

  async function remove(comment: CommentJson) {
    await api.delete(`/api/pins/${pinId}/comment/${comment.id}`);
    setComments((list) => list.filter((c) => c.id !== comment.id));
  }

  const renderNode = (node: Node) => (
    <CommentItem
      key={node.id}
      node={node}
      isOwn={!!user && node.userId === user.id}
      canEdit={!!user && node.userId === user.id && now - new Date(node.utcCreatedDateTime).getTime() < EDIT_WINDOW_MS}
      canReply={isLoggedIn && node.depth < MAX_REPLY_DEPTH}
      onReply={(replyText) => post({ text: replyText, parentCommentId: node.id })}
      onEdit={(newText) => edit(node, newText)}
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
      <ul className="space-y-3">{tree.map(renderNode)}</ul>

      {isLoggedIn ? (
        <form
          className="mt-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (text.trim() && (await post({ text: text.trim() }))) setText('');
          }}
        >
          <textarea
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
              <Link href={`/login?redirect=${encodeURIComponent(`/pin/${pinId}`)}`} className="font-medium">
                {chunks}
              </Link>
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
  canEdit,
  canReply,
  onReply,
  onEdit,
  onRemove,
  renderChild,
}: {
  node: Node;
  isOwn: boolean;
  canEdit: boolean;
  canReply: boolean;
  onReply: (text: string) => Promise<boolean>;
  onEdit: (text: string) => Promise<boolean>;
  onRemove: () => void;
  renderChild: (node: Node) => React.ReactNode;
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'reply'>('view');
  const [draft, setDraft] = useState('');
  const t = useT();

  return (
    // The anchor comment notifications link to (its scroll-margin, set for
    // every id in globals.css, keeps it clear of the header).
    <li id={`comment-${node.id}`}>
      {mode === 'edit' ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (draft.trim() && (await onEdit(draft.trim()))) setMode('view');
          }}
        >
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="field" rows={2} />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setMode('view')} className="btn btn-sm btn-ghost">
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-sm btn-primary">
              {t('common.save')}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-baseline gap-2">
          <UserAvatar userName={node.userName} pictureUrl={node.userPictureUrl} className="size-6 self-center text-xs" />
          <span className="font-semibold text-ink">{node.userName}</span>
          {/* Plain text: comments are never rendered as HTML. */}
          <span className="whitespace-pre-wrap text-ink">{node.text}</span>
          <span className="ml-auto flex gap-1">
            {canReply ? (
              <button type="button" onClick={() => { setDraft(''); setMode('reply'); }} className="rounded-md px-1.5 py-0.5 text-xs text-link hover:bg-raised" title={t('comments.reply')}>
                {t('comments.reply')}
              </button>
            ) : null}
            {canEdit ? (
              <button type="button" onClick={() => { setDraft(node.text); setMode('edit'); }} title={t('comments.editComment')} className="rounded-md p-1 text-subtle hover:bg-raised hover:text-ink">
                <Icon name="pencil" className="size-3.5" />
              </button>
            ) : null}
            {isOwn ? (
              <button type="button" onClick={onRemove} title={t('comments.deleteComment')} className="rounded-md p-1 text-subtle hover:bg-red-500/10 hover:text-danger">
                <Icon name="close" className="size-3.5" />
              </button>
            ) : null}
          </span>
        </div>
      )}
      {mode === 'reply' ? (
        <form
          className="mt-1 ml-8"
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
      {node.replies.length ? <ul className="mt-3 ml-3 space-y-3 border-l border-line pl-5">{node.replies.map(renderChild)}</ul> : null}
    </li>
  );
}
