'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api } from '@/lib/client/api';
import { useNow } from '@/lib/client/now';
import { useSession } from '@/lib/client/session';
import type { CommentJson } from '@/lib/types';

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

  const tree = buildTree(comments);

  async function post(body: { text: string; parentCommentId?: number }) {
    setError('');
    try {
      const created = await api.post<CommentJson>(`/api/pins/${pinId}/comment`, body);
      setComments((list) => [...list, created]);
      return true;
    } catch {
      setError(body.parentCommentId ? 'There was a problem posting your reply.' : 'There was a problem posting your comment.');
      return false;
    }
  }

  async function edit(comment: CommentJson, newText: string) {
    try {
      const updated = await api.patch<CommentJson>(`/api/pins/${pinId}/comment/${comment.id}`, { text: newText });
      setComments((list) => list.map((c) => (c.id === comment.id ? { ...c, text: updated.text, utcUpdatedDateTime: updated.utcUpdatedDateTime } : c)));
      return true;
    } catch {
      setError('This comment can no longer be edited.');
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
        Comments
      </h2>
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
            placeholder="Add a comment..."
            className="field"
            rows={3}
          />
          {error ? <div className="text-sm text-red-400">{error}</div> : null}
          <button type="submit" className="btn btn-primary mt-2">
            Post
          </button>
        </form>
      ) : status === 'ready' ? (
        <p className="mt-3 text-sm text-subtle">
          <Link href={`/login?redirect=${encodeURIComponent(`/pin/${pinId}`)}`} className="font-medium">
            Log in
          </Link>{' '}
          {comments.length ? 'to add a comment' : 'to post the first comment on this pin'}
        </p>
      ) : null}
    </section>
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

  return (
    <li>
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
              Cancel
            </button>
            <button type="submit" className="btn btn-sm btn-primary">
              Save
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
              <button type="button" onClick={() => { setDraft(''); setMode('reply'); }} className="rounded-md px-1.5 py-0.5 text-xs text-link hover:bg-raised" title="Reply">
                Reply
              </button>
            ) : null}
            {canEdit ? (
              <button type="button" onClick={() => { setDraft(node.text); setMode('edit'); }} title="Edit comment" className="rounded-md p-1 text-subtle hover:bg-raised hover:text-ink">
                <Icon name="pencil" className="size-3.5" />
              </button>
            ) : null}
            {isOwn ? (
              <button type="button" onClick={onRemove} title="Delete comment" className="rounded-md p-1 text-subtle hover:bg-red-500/10 hover:text-red-400">
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
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a reply..." className="field" rows={2} />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setMode('view')} className="btn btn-sm btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-sm btn-primary">
              Reply
            </button>
          </div>
        </form>
      ) : null}
      {node.replies.length ? <ul className="mt-3 ml-3 space-y-3 border-l border-line pl-5">{node.replies.map(renderChild)}</ul> : null}
    </li>
  );
}
