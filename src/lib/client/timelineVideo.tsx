'use client';

// Whether a card here may load a video player. A set of cards (the timeline,
// search results, a pin page's "More like this") provides the admin setting;
// anywhere else - the editor's preview - a card plays video as it always has.
//
// The decision has to be made before the markup is written, not hidden with
// CSS afterwards: an iframe in the HTML is already a download. So the server,
// which cannot know the screen, renders the still whenever either screen size
// wants it, and a screen allowed to play swaps the player in once it hydrates.

import { createContext, useContext, useSyncExternalStore } from 'react';
import { MOBILE_WIDTH_QUERY, showsStill, type ScreenSize, type TimelineVideoSetting } from '@/lib/timelineVideo';

const TimelineVideoContext = createContext<TimelineVideoSetting>({ mobile: true, desktop: true });

export function TimelineVideoProvider({ setting, children }: { setting: TimelineVideoSetting; children: React.ReactNode }) {
  return <TimelineVideoContext.Provider value={setting}>{children}</TimelineVideoContext.Provider>;
}

function subscribe(listener: () => void) {
  const query = window.matchMedia(MOBILE_WIDTH_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

function useScreenSize(): ScreenSize {
  return useSyncExternalStore<ScreenSize>(
    subscribe,
    () => (window.matchMedia(MOBILE_WIDTH_QUERY).matches ? 'mobile' : 'desktop'),
    () => 'unknown',
  );
}

// Whether this card shows a video as its still picture instead of its player.
export function useVideoPoster(): boolean {
  return showsStill(useContext(TimelineVideoContext), useScreenSize());
}
