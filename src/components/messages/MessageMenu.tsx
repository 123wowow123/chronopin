'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { MENU_ITEM, PopMenu } from '@/components/ui/PopMenu';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import type { ChatMessage, ChatUser } from '@/lib/client/messages';
import { ChatList } from './ChatList';

const REPORT_REASONS = [
  ['spam', 'comments.reportSpam'],
  ['harassment', 'comments.reportHarassment'],
  ['misleading', 'comments.reportMisleading'],
  ['other', 'comments.reportOther'],
] as const;

type View = 'actions' | 'unsend' | 'reasons' | 'reported' | 'failed';
type Changed = { message: ChatMessage };

// The three dots beside a message, as Messenger has them: Unsend (asked
// first) for the viewer's own, Forward, and Report for the
// other side's. What the server answers replaces the message (`onChange`);
// the live stream tells the other side.
export function MessageMenu({
  message,
  mine,
  withUser,
  align,
  onChange,
}: {
  message: ChatMessage;
  mine: boolean;
  withUser: ChatUser;
  align: 'start' | 'end';
  onChange: (message: ChatMessage) => void;
}) {
  const t = useT();
  const [view, setView] = useState<View>('actions');
  const [forwarding, setForwarding] = useState(false);
  const base = `/api/messages/${withUser.id}/${message.id}`;

  return (
    <>
      <PopMenu align={align} buttonClassName="size-7" iconClassName="size-4" onClose={() => setView('actions')}>
        {(close) => {
          const run = async (request: () => Promise<Changed>) => {
            try {
              onChange((await request()).message);
              close(true);
            } catch {
              setView('failed');
            }
          };
          const report = async (reason: string) => {
            try {
              await api.post(`${base}/report`, { reason });
              setView('reported');
            } catch {
              setView('failed');
            }
          };
          if (view === 'unsend') {
            return (
              <>
                <p className="px-3 pt-1.5 pb-2 text-sm text-subtle">{t('dm.unsendConfirm')}</p>
                <button type="button" role="menuitem" onClick={() => run(() => api.delete<Changed>(base))} className={`${MENU_ITEM} text-danger`}>
                  {t('dm.unsend')}
                </button>
                <button type="button" role="menuitem" onClick={() => close(true)} className={MENU_ITEM}>
                  {t('common.cancel')}
                </button>
              </>
            );
          }
          if (view === 'reasons') {
            return (
              <>
                <p className="px-3 pt-1.5 pb-1 text-sm text-subtle">{t('dm.reportWhy')}</p>
                {REPORT_REASONS.map(([reason, label]) => (
                  <button key={reason} type="button" role="menuitem" onClick={() => report(reason)} className={MENU_ITEM}>
                    {t(label)}
                  </button>
                ))}
              </>
            );
          }
          if (view !== 'actions') {
            return (
              <p role="status" className={`px-3 py-2 text-sm ${view === 'reported' ? 'text-success' : 'text-danger'}`}>
                {view === 'reported' ? t('comments.reported') : t('dm.actionFailed')}
              </p>
            );
          }
          return (
            <>
              {mine ? (
                <button type="button" role="menuitem" onClick={() => setView('unsend')} className={MENU_ITEM}>
                  {t('dm.unsend')}
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close(false);
                  setForwarding(true);
                }}
                className={MENU_ITEM}
              >
                {t('dm.forward')}
              </button>
              {!mine ? (
                <button type="button" role="menuitem" onClick={() => setView('reasons')} className={MENU_ITEM}>
                  {t('comments.report')}
                </button>
              ) : null}
            </>
          );
        }}
      </PopMenu>
      {forwarding ? <ForwardDialog body={message.body} onClose={() => setForwarding(false)} /> : null}
    </>
  );
}

// Forward: the message, then the chats and a search for anyone else; each
// pick sends it on, and the dialog stays for more until closed.
function ForwardDialog({ body, onClose }: { body: string; onClose: () => void }) {
  const t = useT();
  const [status, setStatus] = useState<{ ok: boolean; name: string } | null>(null);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);

  async function forward(user: ChatUser) {
    try {
      await api.post(`/api/messages/${user.id}`, { body });
      setStatus({ ok: true, name: user.userName });
    } catch {
      setStatus({ ok: false, name: user.userName });
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-shade/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={t('dm.forward')} className="floating flex h-[min(560px,85dvh)] w-full max-w-md flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <h2 className="flex-1 text-lg font-bold text-ink">{t('dm.forward')}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink">
            <Icon name="close" className="size-5" />
          </button>
        </div>
        <p className="mx-4 mt-3 mb-2 line-clamp-3 rounded-xl bg-raised px-3 py-2 text-sm whitespace-pre-wrap text-muted">{body}</p>
        {status ? (
          <p role="status" className={`px-4 pb-2 text-sm ${status.ok ? 'text-success' : 'text-danger'}`}>
            {status.ok ? t('dm.forwarded', { name: status.name }) : t('dm.actionFailed')}
          </p>
        ) : null}
        <ChatList active onPick={(user) => void forward(user)} />
      </div>
    </div>,
    document.body,
  );
}
