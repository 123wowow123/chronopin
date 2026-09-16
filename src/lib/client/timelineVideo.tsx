'use client';

// Whether a card here may load a video player. A page of cards (the timeline,
// search results) provides the admin setting; anywhere else - a pin's own page,
// the editor's preview - a card plays video as it always has.
//
// The decision has to be made before the markup is written, not hidden with
// CSS afterwards: an iframe in the HTML is already a download. So the server,
// which cannot know the screen, renders the still and a wide screen swaps the
// player in once it hydrates.

import { createContext, useContext, useSyncExternalStore } from 'react';
import { MOBILE_WIDTH_QUERY, type TimelineVideoSetting } from '@/lib/timelineVideo';

const MobileVideoContext = createContext(true);

export function TimelineVideoProvider({ setting, children }: { setting: TimelineVideoSetting; children: React.ReactNode }) {
  return <MobileVideoContext.Provider value={setting.mobile}>{children}</MobileVideoContext.Provider>;
}

function subscribe(listener: () => void) {
  const query = window.matchMedia(MOBILE_WIDTH_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

// Until the browser answers, a phone: rendering the still costs a wide screen
// one swap, while guessing the other way would have sent the player to every
// phone anyway.
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(MOBILE_WIDTH_QUERY).matches, () => true);
}

// Whether this card shows a video as its still picture instead of its player.
export function useVideoPoster(): boolean {
  const mobileVideo = useContext(MobileVideoContext);
  const mobile = useIsMobile();
  return !mobileVideo && mobile;
}
