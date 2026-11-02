'use client';

import { useId } from 'react';
import { useT } from '@/lib/client/i18n';

// Whether a reply is the next step of the thread it answers or a subthread
// (Pin.subthread, 0239): two cards, each with a miniature of how the Thread
// pane draws it, flush with the main line or stepped in under its parent.
export function ReplyKind({ sideNote, onChange, className = '' }: { sideNote: boolean; onChange: (sideNote: boolean) => void; className?: string }) {
  const t = useT();
  const name = useId();
  const options = [
    { sideNote: false, label: t('thread.replyNext'), hint: t('thread.replyNextHint') },
    { sideNote: true, label: t('thread.replySide'), hint: t('thread.sideNoteHint') },
  ];
  return (
    <fieldset className={`min-w-0 ${className}`}>
      <legend className="mb-1.5 text-sm font-medium">{t('thread.replyKind')}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={String(option.sideNote)} className="block cursor-pointer">
            <input type="radio" name={name} className="peer sr-only" checked={sideNote === option.sideNote} onChange={() => onChange(option.sideNote)} />
            <span className="flex h-full gap-3 rounded-lg p-3 ring-1 ring-line ring-inset hover:bg-raised/60 peer-checked:bg-raised peer-checked:ring-2 peer-checked:ring-link peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-link">
              <ThreadGlyph sideNote={option.sideNote} />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{option.label}</span>
                <span className="mt-0.5 block text-xs font-normal text-subtle">{option.hint}</span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Three rows of a thread: the parent, the reply (the one that moves) and a
// faded row below.
function ThreadGlyph({ sideNote }: { sideNote: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 28 28" className="mt-0.5 size-7 shrink-0 text-subtle">
      <rect x="2" y="4" width="16" height="4" rx="2" fill="currentColor" />
      <rect x={sideNote ? 9 : 2} y="12" width="16" height="4" rx="2" className="fill-link" />
      {sideNote ? <path d="M5.5 8v6a1 1 0 0 0 1 1H9" fill="none" stroke="currentColor" strokeWidth="1.2" /> : null}
      <rect x="2" y="20" width="16" height="4" rx="2" fill="currentColor" opacity="0.35" />
    </svg>
  );
}
