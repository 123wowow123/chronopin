'use client';

import { useEffect, useRef } from 'react';
import { useT } from '@/lib/client/i18n';
import { COMMENT_REACTIONS, type CommentReactionName } from '@/lib/commentReactions';

// The bar of six reactions (comments, and the chat composer's smiley),
// floating over what opened it; `className` places it. Each grows under the
// pointer; the reader's own sits on a grey disc, and picking it again takes it
// back. It opens with the focus on the reader's own (else the first), and
// the arrow keys move along it.
export function ReactionPicker({
  id,
  mine,
  onPick,
  className = 'start-0',
}: {
  id: string;
  mine: CommentReactionName | null;
  onPick: (reaction: CommentReactionName) => void;
  className?: string;
}) {
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
      className={`absolute bottom-full z-30 mb-2 flex gap-0.5 rounded-full border border-ink/10 bg-popover p-1.5 shadow-2xl shadow-shade/40 ${className}`}
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
