'use client';

import { useT } from '@/lib/client/i18n';
import { RefineLink } from './RefineLink';

// A pin's address with each part of it a search for the pins standing there.
//
// The address is one line, written by whoever placed the pin, running from
// the most particular part to the least ("Brooklyn Bridge, New York, NY,
// USA"), so its own commas are what there is to split on: the venue, the
// city, the state, the country. Each part keeps its place in the line, so it
// still reads as it was written.
export function PlaceLinks({ address, className }: { address: string; className?: string }) {
  const t = useT();
  // Keep the estimate qualifier out of place searches. Accept the older
  // wording as well as the compact label saved on newer pins.
  const estimated = /^estimated(?: location)?\s*:\s*/i.test(address);
  const place = address.replace(/^estimated(?: location)?\s*:\s*/i, '');
  const parts = place
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  // An address with no comma is one place, and a link on the whole of it is
  // the same search as a link on its only part.
  return (
    <span className={className}>
      {estimated ? (
        <RefineLink field="place" value="Estimated" className="me-1.5 inline-block rounded-full bg-amber-500/15 px-2 py-px align-middle text-[10px] font-semibold tracking-wide text-warning-soft not-italic ring-1 ring-amber-500/30 ring-inset hover:no-underline hover:ring-current">
          {t('reserved.estimated')}
        </RefineLink>
      ) : null}
      {parts.map((part, at) => (
        <span key={`${part}-${at}`}>
          {at ? ', ' : null}
          <RefineLink field="place" value={part} className="text-inherit hover:text-ink hover:no-underline">
            {part}
          </RefineLink>
        </span>
      ))}
    </span>
  );
}
