'use client';

import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PopMenu } from '@/components/ui/PopMenu';
import { trackEvent } from '@/lib/client/analytics';
import { useT } from '@/lib/client/i18n';

// What gets shared: a pin (its link, with its title as the words) or its
// address alone (words, no link). A site that only takes a link (Facebook,
// Reddit, LinkedIn) is offered only when there is one.
export type ShareItem = { text: string; url?: string; contentType: 'pin' | 'address'; itemId: number };

type Target = {
  key: string;
  label: string;
  icon: ReactNode;
  href: (item: ShareItem) => string;
  needsUrl?: boolean;
  newTab?: boolean;
};

const q = encodeURIComponent;
// Words and link as one line, for the places that take only words.
const line = ({ text, url }: ShareItem) => (url ? `${text} ${url}` : text);

// Brand marks in their own colours (glyphs drawn to a 24 box, filled white).
function Brand({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <span className="flex size-11 items-center justify-center rounded-full text-white" style={{ background: bg }}>
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
        {children}
      </svg>
    </span>
  );
}

function Plain({ name }: { name: IconName }) {
  return (
    <span className="flex size-11 items-center justify-center rounded-full bg-ink/10 text-ink">
      <Icon name={name} className="size-5" />
    </span>
  );
}

function targets(t: ReturnType<typeof useT>): Target[] {
  return [
    // iOS reads "sms:&body=", Android "sms:?body="; "sms:?&body=" suits both.
    // A link goes alone: Messages turns it into a card with the page's
    // og:image and title, where any words with it become a bubble of their own.
    { key: 'sms', label: t('share.message'), icon: <Plain name="message" />, href: (item) => `sms:?&body=${q(item.url ?? item.text)}` },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      newTab: true,
      icon: (
        <Brand bg="#25D366">
          <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zm0 1.6a7.4 7.4 0 1 1-3.8 13.8l-.3-.2-2.7.7.7-2.6-.2-.3A7.4 7.4 0 0 1 12 4.6z" />
          <path d="M9.2 7.8c-.2 0-.5 0-.7.3-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.8 2.1.8 2.6.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.3-1.6-.8c-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1-.9-.4-1.7-.9-2.3-1.6-.4-.4-.8-1-1-1.4-.1-.2 0-.3.1-.5l.4-.5.2-.4v-.4l-.8-1.8c-.1-.3-.3-.3-.4-.3z" />
        </Brand>
      ),
      href: (item) => `https://wa.me/?text=${q(line(item))}`,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      needsUrl: true,
      newTab: true,
      icon: (
        <Brand bg="#1877F2">
          <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.7c0-.9.3-1.5 1.5-1.5h1.5V4.5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.3H8v3h2.6V21z" />
        </Brand>
      ),
      href: (item) => `https://www.facebook.com/sharer/sharer.php?u=${q(item.url!)}`,
    },
    {
      key: 'x',
      label: 'X',
      newTab: true,
      icon: (
        <Brand bg="#000">
          <path d="M17.3 3.5h2.9l-6.3 7.2 7.4 9.8h-5.8l-4.5-5.9-5.2 5.9H2.9l6.7-7.7-7.1-9.3h5.9l4.1 5.4zm-1 15.3h1.6L7.7 5.1H6z" />
        </Brand>
      ),
      href: (item) => `https://x.com/intent/post?text=${q(item.text)}${item.url ? `&url=${q(item.url)}` : ''}`,
    },
    {
      key: 'reddit',
      label: 'Reddit',
      needsUrl: true,
      newTab: true,
      icon: (
        <Brand bg="#FF4500">
          <ellipse cx="12" cy="14.5" rx="7" ry="4.8" />
          <circle cx="5.2" cy="11.3" r="1.7" />
          <circle cx="18.8" cy="11.3" r="1.7" />
          <circle cx="17" cy="5" r="1.5" />
          <path d="m12 9.7 1.1-5 3.9.8" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9.3" cy="13.8" r="1.2" fill="#FF4500" />
          <circle cx="14.7" cy="13.8" r="1.2" fill="#FF4500" />
          <path d="M9.3 16.6c1.6 1 3.8 1 5.4 0" stroke="#FF4500" strokeWidth="1" fill="none" strokeLinecap="round" />
        </Brand>
      ),
      href: (item) => `https://www.reddit.com/submit?url=${q(item.url!)}&title=${q(item.text)}`,
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      needsUrl: true,
      newTab: true,
      icon: (
        <Brand bg="#0A66C2">
          <circle cx="7" cy="6.8" r="1.7" />
          <path d="M5.6 9.5h2.8V19H5.6zM10.6 9.5h2.7v1.3c.5-.9 1.6-1.5 2.9-1.5 2.5 0 3.4 1.5 3.4 4V19h-2.8v-4.7c0-1.2-.4-2-1.5-2-1.2 0-1.9.8-1.9 2.1V19h-2.8z" />
        </Brand>
      ),
      href: (item) => `https://www.linkedin.com/sharing/share-offsite/?url=${q(item.url!)}`,
    },
    { key: 'email', label: t('share.email'), icon: <Plain name="mail" />, href: (item) => `mailto:?subject=${q(item.text)}&body=${q(line(item))}` },
  ];
}

// Puts `text` on the clipboard. navigator.clipboard (and the share sheet)
// only exist on https or localhost, so a page opened over plain http - the
// dev server from a phone on the LAN - copies through a hidden textarea.
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const done = document.execCommand('copy');
    area.remove();
    return done;
  }
}

// The places to share `item`, as round tiles four to a row, then Copy.
// `item` is read when a tile is picked (the pin's link needs the window's
// origin); `close` shuts the menu they sit in.
export function ShareTiles({ item, close }: { item: () => ShareItem; close: (refocus?: boolean) => void }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const hasUrl = item().url != null;
  const track = (method: string, it: ShareItem) => trackEvent('share', { method, content_type: it.contentType, item_id: String(it.itemId) });

  const tile = 'flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-xs font-medium text-muted hover:bg-ink/[0.07] hover:text-ink focus-visible:bg-ink/[0.07] focus-visible:outline-none';
  return (
    <div className="grid grid-cols-4 gap-0.5">
      {targets(t)
        .filter((target) => hasUrl || !target.needsUrl)
        .map((target) => (
          <button
            key={target.key}
            type="button"
            role="menuitem"
            className={tile}
            onClick={() => {
              const it = item();
              const href = target.href(it);
              track(target.key, it);
              if (target.newTab) window.open(href, '_blank', 'noopener,noreferrer');
              else window.location.href = href;
              close(true);
            }}
          >
            {target.icon}
            <span className="max-w-full truncate">{target.label}</span>
          </button>
        ))}
      <button
        type="button"
        role="menuitem"
        className={tile}
        onClick={async () => {
          const it = item();
          if (await copyText(it.url ?? it.text)) {
            track('copy', it);
            setCopied(true);
            setTimeout(() => close(true), 900);
          }
        }}
      >
        <Plain name={hasUrl ? 'link' : 'copy'} />
        <span className="max-w-full truncate">{copied ? t('share.copied') : t(hasUrl ? 'share.copyLink' : 'share.copy')}</span>
      </button>
    </div>
  );
}

// The map pin beside a pin's address, as a button sharing the address alone:
// its words, by text or to a site that takes words, with no link to the pin.
// On a phone it opens the phone's own share sheet (Messages, Maps, Tesla and
// the rest) rather than the menu.
export function AddressShare({ pinId, address }: { pinId: number; address: string }) {
  const t = useT();
  const toSheet = () => {
    if (typeof navigator.share !== 'function' || !window.matchMedia('(pointer: coarse)').matches) return false;
    trackEvent('share', { method: 'sheet', content_type: 'address', item_id: String(pinId) });
    // Cancelling the sheet rejects; nothing to do then.
    navigator.share({ text: address }).catch(() => {});
    return true;
  };
  return (
    <PopMenu label={t('share.address')} icon="pin" dots accent align="start" wide instead={toSheet} buttonClassName="-my-1 -ml-1 h-7 pr-0.5 pl-1.5" iconClassName="size-4">
      {(close) => (
        <>
          <p className="px-3 pt-1.5 pb-1 text-sm font-semibold text-ink">{t('share.address')}</p>
          <ShareTiles item={() => ({ text: address, contentType: 'address', itemId: pinId })} close={close} />
        </>
      )}
    </PopMenu>
  );
}
