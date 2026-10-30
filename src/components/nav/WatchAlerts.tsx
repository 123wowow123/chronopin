'use client';

import { useEffect } from 'react';
import { showLiveAlert, syncAlerts } from '@/lib/client/browserAlerts';
import { onLive } from '@/lib/client/liveFeed';
// Imported for its side effect: it must be listening before the browser offers to install the app (src/lib/client/install.ts).
import '@/lib/client/install';

// Mounted for a signed-in user on every page: keeps this browser's push
// subscription theirs, and shows the live feed's alerts about their watched
// pins as browser notifications (src/lib/client/browserAlerts.ts).
export function WatchAlerts() {
  useEffect(() => {
    syncAlerts();
    return onLive<Parameters<typeof showLiveAlert>[0]>('alert', (alert) => void showLiveAlert(alert));
  }, []);
  return null;
}
