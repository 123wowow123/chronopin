'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { requestTimelineFocus } from '@/lib/client/timelineFocus';

// "To timeline": the same link, plus a note that this visit is asking for the
// pin. A timeline kept hidden from an earlier visit to the same URL would
// otherwise come back at the position it was left in (see Timeline).
export function ToTimelineLink({ pinId, ...props }: { pinId: number } & Omit<ComponentProps<typeof Link>, 'href'>) {
  return <Link {...props} href={`/?pin=${pinId}`} onClick={() => requestTimelineFocus(pinId)} />;
}
